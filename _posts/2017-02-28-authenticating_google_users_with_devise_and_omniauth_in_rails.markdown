---
layout: post
title:  "Authenticating Google Users with Devise and OmniAuth in Rails"
date:   2017-02-28 04:08:10 +0000
---

While building authentication processes from the ground up can prevent incompatibilities that can be hard to debug, sometimes we prefer the convinience of relying on gems built by others. Devise and OmniAuth are classic gems that authenticate through internal databases and external providers. These libraries, being open sourced, have withstood lots of trials and errors and are very powerful tools if you get it right.

To follow along with this tutorial, you will have to install the following gems:
- [Devise](https://github.com/plataformatec/devise)
- [OmniAuth Google OAuth 2](https://github.com/zquestz/omniauth-google-oauth2)
- [OmniAuth](https://github.com/omniauth/omniauth)

{% highlight ruby %}
# Gemfile

gem 'devise'
gem 'omniauth'
gem 'omniauth-google-oauth2'
{% endhighlight %}

For storing global variables in the environment, I recommend using [dotenv](https://github.com/bkeepers/dotenv), although there are many other options out there as well. This will help keep your Google client ID and client secret neat and easily accessible.

The process of initializing and configuring Devise and OmniAuth is pretty self-explanatory in the docs, so I'll skip over that. The configuration for Devise to be used with Google OAuth 2.0 is as follows:

{% highlight ruby %}
# config/initializers/devise.rb

  config.omniauth :google_oauth2, ENV['GOOGLE_CLIENT_ID'], ENV['GOOGLE_CLIENT_SECRET'],
  { access_type: 'offline', 
    prompt: 'consent',
    select_account: true,
    scope: 'userinfo.email,userinfo.profile',
    client_options: {ssl: {ca_file: Rails.root.join("cacert.pem").to_s}}
  }
{% endhighlight %}

Depending on the level of access you need, defining `scope` tells Google [the scope of user information you are requiring from them](https://developers.google.com/identity/protocols/googlescopes). `userinfo.email` and `userinfo.profile` are scopes under the [Google OAuth2 API](https://developers.google.com/identity/protocols/OAuth2) that include the user's email address and basic profile info.

This is the JSON response from the API call:

{% highlight ruby %}
{"provider"=>"google_oauth2",
 "uid"=>"1234",
 "info"=>
  {"name"=>"xxx",
   "email"=>"xxx@gmail.com",
   "first_name"=>"x",
   "last_name"=>"xx",
   "image"=>
    "https://lh3.googleusercontent.com/-1234/photo.jpg",
   "urls"=>{"Google"=>"https://plus.google.com/1234"}},
 "credentials"=>
  {"token"=>
    "ya39.GlsVBAhzxmGXCTem1jtlv1_k9hEWJZQdVmpEb89b_e-4_W0XqMkW97eUcAEMk5ilC7lJbk1Ak2oHf7k8w13Y_MnmQ0Fd6LJwAqeHk5OPZbdD8llNkbq6GlHXNvBQ",
   "refresh_token"=>"1/9ZB9IyNpue4jICS81crimqVjKfI0F4rBv3mCIpnK86M",
   "expires_at"=>1490139861,
   "expires"=>true},
 "extra"=>
  ...
{% endhighlight %}

Then in the model for the users (here, the User model), add Google as a provider for Omniauth and a `from_omniauth` class method to assign the returned values from the API call to attributes of the User class.

{% highlight ruby %}
# app/models/user.rb

class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable,
         :omniauthable, :omniauth_providers => [:google_oauth2]

  ...

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |user|
      user.provider = auth.provider
      user.uid = auth.uid
      user.email = auth.info.email
      user.name = auth.info.name
      user.first_name = auth.info.first_name
      user.last_name = auth.info.last_name
      user.image = auth.info.image
      user.password = Devise.friendly_token[0,20]
      user.access_token = auth.credentials.token
      user.refresh_token = auth.credentials.refresh_token
      user.oauth_expires_at = Time.at(auth.credentials.expires_at)
      user.save!
    end
  end

  ...
end
{% endhighlight %}

Then we can define the callback actions in the controller, using the corresponding `google_oauth2` method that calls `from_omniauth` on the User class.

{% highlight ruby %}
# app/controllers/user/omniauth_callbacks_controller.rb 

class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def google_oauth2
    @user = User.from_omniauth(request.env["omniauth.auth"])
    if @user
      sign_in @user
      redirect_to root_path
    else
      redirect_to new_user_session_path, notice: 'Access Denied.'
    end
  end
end 
{% endhighlight %}

Google's OAuth access token expires every 3,600 seconds. In order for the user to continue using the app, we will have to refresh the access token that's stored in the database (`user.access_token`) every time the user signs in and when calling on APIs within the app. 

Let's define an instance method that checks if the token is expired and one that refreshes the token if it is expired in the User class. For the code below to work, you will have to install [Rest Client](https://github.com/rest-client/rest-client) or [another gem of your choice that can send HTTP requests](http://stackoverflow.com/a/4581144/6678896).

{% highlight ruby %}
# app/models/user.rb

class User < ApplicationRecord
  ...

  def refresh_token_if_expired
    if token_expired?
      response = RestClient.post "https://accounts.google.com/o/oauth2/token", :grant_type => 'refresh_token', :refresh_token => self.refresh_token, :client_id => ENV['GOOGLE_CLIENT_ID'], :client_secret => ENV['GOOGLE_CLIENT_SECRET']
      refreshhash = JSON.parse(response.body)

      access_token_will_change!
      oauth_expires_at_will_change!

      self.access_token = refreshhash['access_token']
      self.oauth_expires_at = DateTime.now + refreshhash["expires_in"].to_i.seconds

      self.save
      puts 'Saved'
    end
  end

  def token_expired?
    expiry = Time.at(self.oauth_expires_at) 
    return true if expiry < Time.now
    token_expires_at = expiry
    save if changed?
    false
  end

end
{% endhighlight %}

Lastly, double check to make sure you have the paths `user_google_oauth2_omniauth_authorize` and `user_google_oauth2_omniauth_callback`. Now, a link to "Sign in with Google" should automatically be generated on the sign in page that leads to the Google Sign In form.

![Google Sign In Form](/img/google-sign-in.png)

