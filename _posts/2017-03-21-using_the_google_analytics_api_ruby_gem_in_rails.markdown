---
layout: post
title:  "Using the Google Analytics API Ruby Gem in Rails"
date:   2017-03-21 04:08:10 +0000
---

Google has some of the most useful APIs out there for apps and developers to gather information from Google or data from its users. [Google Maps](https://developers.google.com/maps/) and [Google Talk](https://developers.google.com/talk/) are two of the most popular ones. The Google Analytics API is also an extremely valuable resource for analysts and website owners. Google Analytics collects and outputs data that can be used to reach the right audience by tracking a website's user interactions with an embedded script.

Although this post uses the Analytics API as an example, you can apply the same code structure to other APIs such as Drive, Sheets, or Translate. [Google-api-ruby-client](https://github.com/google/google-api-ruby-client/tree/e13da8e05e2368421519e49d2c03ee7e69f3faaa) is a gem made for Google's APIs, which includes a giant list of APIs that can be accessed with it. It's a great library created by Google's developers, but it is still in Alpha, and for less experienced coders, the documentation isn't very comprehensive as of now.

The [previous blog post]({% post_url 2017-02-28-authenticating_google_users_with_devise_and_omniauth_in_rails %}) covers authentication using Devise and Omniauth. In addition to authentication, you'll need these gems to get ready to call the APIs:
- [Google API Client](https://github.com/google/google-api-ruby-client/tree/e13da8e05e2368421519e49d2c03ee7e69f3faaa)
- [Signet](https://github.com/google/signet)

{% highlight ruby %}
# Gemfile

gem 'devise'
gem 'omniauth'
gem 'omniauth-google-oauth2'
gem 'google-api-client'
gem 'signet'
gem 'rest-client' # optional
{% endhighlight %}

Once your app is able to sign up and verify users through Google's OAuth, Google will allow you to access the user's information after they've granted you permission. To figure out which APIs and kinds of permissions you will need from the user, dig around [Google's guide for developers](https://developers.google.com) and look through the [different Google API scopes](https://developers.google.com/identity/protocols/googlescopes). I recommend testing the results in the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).

For this app, I used the [Management API](https://developers.google.com/analytics/devguides/config/mgmt/v3/) and the [Analytics Core Reporting API v3](https://developers.google.com/analytics/devguides/reporting/core/v3/reference), which asks the user for permission to access their Analytics account information and data (read only) upon sign up. If you are using Devise, you can define the scope of information you are requiring in `config`:

{% highlight ruby %}
# config/initializers/devise.rb

  config.omniauth :google_oauth2, ENV['GOOGLE_CLIENT_ID'], ENV['GOOGLE_CLIENT_SECRET'],
  { access_type: 'offline', 
    prompt: 'consent',
    select_account: true,
    scope: 'userinfo.email,userinfo.profile,analytics.readonly',
    client_options: {ssl: {ca_file: Rails.root.join("cacert.pem").to_s}}
  }
{% endhighlight %}

`userinfo.email` and `userinfo.profile` are scopes under the [Google OAuth2 API](https://developers.google.com/identity/protocols/OAuth2) that include the user's email address and basic profile info. `analytics.readonly` allows you to view the user's Google Analytics data. If you want management permissions as well, change it to `analytics` instead. Now, once a user signs up, Google will ask for the permissions accordingly: 

![Google Permissions Request](/img/google-permissions-1.png)

If you need offline access, make sure to include `access_type: 'offline', prompt: 'consent'` in your configurations for authentication. This will allow you to, for example, make regular API calls even when the user is not signed in.

![Google Permissions Request](/img/google-permissions-2.png)

Next, let's build the API service. Depending on your app's needs, you can either create the service as a module or as a class. In general, because modules can be included in classes using the `include` command, they provide methods that are easily accessible across multiple classes. Classes, on the other hand, cannot be included in classes, but can inherit behavior or be inherited. Classes can also be instantiated and become a new object for easy manipulation.

To keep things neat and to allow for more services, I've created a "services" folder. The Google Analytics Service in this example uses a module, so that `GoogleAnalyticsService.method` can be called from anywhere that includes it.

If you haven't required the API(s) you need in the Gemfile, `require` them on the first line.

{% highlight ruby %}
# app/services/google_analytics_service.rb

require 'google/apis/analytics_v3'

module GoogleAnalyticsService

	def self.authorize(user)
		# refresh and set user access token
		user.refresh_token_if_expired
		access_token = user.access_token

		# create new signet account and authorize
		client = Signet::OAuth2::Client.new(access_token: access_token)
		client.expires_in = Time.now + 1_000_000

		analytics = Google::Apis::AnalyticsV3::AnalyticsService.new
		analytics.authorization = client

		return analytics
	end

end
{% endhighlight %}

[Signet](https://github.com/google/signet) is currently having some compatibility issues with the newest version of the library, so you have have to downgrade the library version you are using if you encounter authentication errors, but the above code worked for me. You can initialize a client by creating an instance of `Signet::OAuth2::Client` and supplying it with the token and credentials. Refer to the [previous blog post]({% post_url 2017-02-28-authenticating_google_users_with_devise_and_omniauth_in_rails %}) to implement methods that refresh the access token for Signet.

At this point, you should be able to call the Analytics API from anywhere in the app. If you look into the folders on Github, [google-api-ruby-client](https://github.com/google/google-api-ruby-client/tree/e13da8e05e2368421519e49d2c03ee7e69f3faaa) comes with ready methods you can use to access various data, such as `get_realtime_data` and `list_account_summaries`. They are listed under "google-api-ruby-client/generated/google/apis/analytics_v3/service.rb".

For example, `list_account_summaries` can be used in the User class in this way:

{% highlight ruby %}
# app/models/user.rb

class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable,
         :omniauthable, :omniauth_providers => [:google_oauth2]

  def list_account_summaries
    GoogleAnalyticsService.authorize(self).list_account_summaries
  end

  ...

end
{% endhighlight %}

Then, you can also iterate over the JSON response to create new objects. Here, User `has_many ga_accounts`, ga_accounts `has_many ga_properties`, and ga_properties `has_many ga_views`. So, the complete user profile can be built this way once the user signs up:

{% highlight ruby %}
# app/models/user.rb

class User < ApplicationRecord

  ...

  has_many :ga_accounts

  after_create :create_ga_profile

  def create_ga_profile
    self.list_account_summaries.items.each do |item|
      @account = GaAccount.new
      @account.name = item.name
      @account.account_id = item.id
      @account.user_id = self.id
      @account.save

      item.web_properties.each do |property|
        @property = GaProperty.new
        @property.name = property.name
        @property.property_id = property.id
        @property.internal_web_property_id = property.internal_web_property_id
        @property.website_url = property.website_url
        @property.ga_account_id = @account.id
        @property.save

        property.profiles.each do |view|
          @view = GaView.new
          @view.name = view.name
          @view.view_id = view.id
          @view.ga_property_id = @property.id
          @view.save

          @view.create_initial_ga_data
        end
      end
    end
  end

end
{% endhighlight %}

When using the methods provided by the library, make sure to include the mandatory (and optional) arguments. For example, `get_ga_data` requires `(ids, start_date, end_date, metrics)`:

{% highlight ruby %}
# app/models/ga_view.rb

class GaView < ApplicationRecord
	belongs_to :ga_property

  def user
    self.ga_property.ga_account.user
  end

	def get_ga_data_previous_day(dimension)
    user = self.user

    ids = "ga:" + self.view_id
    start_date = "2daysAgo"
    end_date = "yesterday"
    metrics = "ga:sessions,ga:bounceRate,ga:avgSessionDuration,ga:pageviewsPerSession,ga:percentNewSessions,ga:avgPageLoadTime,ga:transactions,ga:transactionRevenue,ga:revenuePerTransaction,ga:transactionsPerSession"
    dimensions = "ga:" + dimension
    sort = "-ga:sessions"
    max_results = 5000

    GoogleAnalyticsService.authorize(user).get_ga_data(ids, start_date, end_date, metrics, dimensions: dimensions, sort: sort, max_results: max_results)
  end
end
{% endhighlight %}

These example can easily be applied to other APIs in the library as well. To find the API you need, look under the folder path "google-api-ruby-client/generated/google/apis/(the_api_you_need)/service.rb". Hopefully, this post has helped clear up some confusion surrounding the relatively young and seldomly updated Google API gem.






