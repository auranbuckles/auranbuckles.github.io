---
layout: post
title:  "Nested Nested Forms in Rails"
date:   2016-11-15 17:30:26 +0000
---


In Rails, nested forms allow multiple models to be included in one form, so that a single submission can create more than one object in the database. There are different ways to implement nested forms. Scaffolding is a quick and easy way to get your app up and running, and will work with this tutorial. In the case of my recent [Planet Shop Rails App](https://github.com/auranbuckles/oovarts-planet-shop-at-the-end-of-the-universe), which I will be using as an example here, I had to implement a nested form and another nested form within that form.

![Oovart's Planet Shop Nested Form]({{ site.img_path }}oovarts-planet-shop-2.png)

This nested nested form was necessary because of the `has_many, through` relationship between models. In the app, a Planet `has_many` features through orders, and a Feature `has_many` planets through orders. In turn, an Order `belongs_to` a planet and `belongs_to` a feature.

{% highlight ruby %}
class Planet < ActiveRecord::Base
  belongs_to :user
  has_many :orders
  has_many :features, through: :orders
end

class Order < ActiveRecord::Base
  belongs_to :planet
  belongs_to :feature
end

class Feature < ActiveRecord::Base
  has_many :orders
  has_many :planets, through: :orders
end
{% endhighlight %}

## Start with a Simple form_for

The first part of the form simply creates a new Planet object with the [`form_for`](http://api.rubyonrails.org/classes/ActionView/Helpers/FormHelper.html#method-i-form_for) helper. A planet has a `:name`, `:population`, and `:moons`. For the purposes of this tutorial, I removed the Bootstrap classes to clean up the code.

{% highlight ruby %}
<%= form_for @planet do |f| %>

  ...

  <div>
    <%= f.label :name %> (between 3-20 letters)
    <%= f.text_field :name %>
  </div>

  <div>
    <%= f.label :population %> (in thousands, max. 8,000,000,000)
    <%= f.number_field :population %>
  </div>

  <div>
    <%= f.label :moons %> (max. 15)
    <%= f.number_field :moons %>
  </div>

  ...

<% end %>
{% endhighlight %}

## The Nested Form

The second part of the form refers to the Order model, which `belongs_to` a planet. In a regular one-to-one or one-to-many association, a nested form will accept the parameters, in the form of an array or hash, of the associated model. The magic word is `fields_for`, which supplies the form with an attributes hash on submission.

### Views

{% highlight ruby %}
<h2>Choose Features (Optional)</h2>

  <h3>Feature 1</h3>
    <%= f.fields_for :orders do |ff| %>

      <%= ff.collection_select :feature_id, Feature.all, :id, :name, {:prompt => 'Select'} %>

      <%= ff.label :size %> (in fy sq., max. 8,000,000)
      <%= ff.number_field :size %>

    <% end %>

  ...
	
  </div>
{% endhighlight %}

### Models

In order for nested attributes to be sent to the controller and create a new object, the associated model has to contain an attribute writer. While the [`accepts_nested_attributes_for`](http://api.rubyonrails.org/classes/ActiveRecord/NestedAttributes/ClassMethods.html) macro takes care of this, you can also write your own custom attribute writer. The correct syntax is `<associated_model>_attributes=`.

{% highlight ruby %}
class Planet < ActiveRecord::Base
  
  ...
	
  def orders_attributes=(attributes)
    attributes.values.each do |att|
      if !att[:feature_id].blank? || !att[:feature_attributes].blank? && !att[:size].blank?
        order = Order.new(att)
        order.planet = self
        order.price = rand(1000..8000)
        self.orders << order
      end
    end
  end
end
{% endhighlight %}

### Controllers

The above writer will create an `[:orders_attributes]` hash within `params[:planet]` that gets sent to the controller. So naturally, we have to then direct the controller action for the form, **new**, to accept and build upon the orders_attributes hash using the `build` and [`build_association`](http://guides.rubyonrails.org/association_basics.html#belongs-to-association-reference) methods. The object that `has_many` (Planet has_many orders) will use `build`, and the object that `belongs_to` (Order belongs to planet) will use `build_association`.

{% highlight ruby %}
def new
  @planet = Planet.new
  @orders = @planet.orders.build
  @feature = @orders.build_feature
end
{% endhighlight %}

Don't forget to also edit your strong params to accept the orders_attributes hash and the attributes within.

{% highlight ruby %}
def planet_params
  params.require(:planet).permit(:id, :name, :price, :population, :moons, orders_attributes: [:id, :size, :feature_id])
end
{% endhighlight %}

The create action creates the new planet object and saves to the database as usual. After all this is set up, we can now pry into it to take a look at the params hash that is being sent to the controller. I inserted a `binding.pry` in the **create** action.

{% highlight ruby %}
def create
  binding.pry
  @planet = Planet.new(planet_params)
  @planet.price = rand(1000000..8000000)
  @planet.user = current_user
  ...
    @planet.save
  ...
end
{% endhighlight %}

Upon submission, **params[:planet]** returns this:
{% highlight ruby %}
{"name"=>"purple",
  "population"=>"600000",
  "moons"=>"8",
  "orders_attributes"=>
    {"0"=>{"feature_id"=>"7", "size"=>"10000"},
      "1"=>{"feature_id"=>"1", "size"=>"80000"},
      "2"=>{"feature_id"=>"5", "size"=>"3000"},
      ...
    }
{% endhighlight %}

As seen here, for each `fields_for :orders` part of the form, Rails creates a new number key (which is actually a string) within [:orders_attributes] that contains the values for each order. Because I duplicated the `fields_for :orders` nested form three times, they are reflected as "0", "1", and "2" here. Each of them will create a new Order object in the database, starting with `{"feature_id"=>"7", "size"=>"10000"}`. 

## The Nested Nested Form

The third and last part of the form goes one level deeper, creating an Order object as well as a user-customized Feature object, which `has_many` orders. This means that once the user submits these feature attributes, the feature will be inserted into the database and will be available for other users to use.

### Views

In the form, we add another `fields_for :orders` helper to create another hash in **params[:planet]** to be sent to the planet_controller's **create** action, then add a `fields_for :feature` helper to create a hash within **params[:planet][:orders_attributes]**. Note that `:feature` is not pluralized, because an order `belongs_to :feature`.

{% highlight ruby %}
<h3>Custom Feature</h3>

<div class="form-group">
  <%= f.fields_for :orders do |ff| %>

    <%= ff.fields_for :feature do |fff| %>

      <%= fff.label :name %>
      <%= fff.text_field :name, class: "form-control" %>

      <%= fff.label :description %>
      <%= fff.text_area :description, class: "form-control" %>
    <% end %>

    <%= ff.label :size %> (in fy sq., max. 8,000,000)
    <%= ff.number_field :size, class: "form-control" %>

  <% end %>
</div>
{% endhighlight %}

### Models

Just as we did with the previous nested form, a custom attribute writer is necessary to create a `feature_attribute` hash for this form, although you can also use the [`accepts_nested_attributes_for`](http://api.rubyonrails.org/classes/ActiveRecord/NestedAttributes/ClassMethods.html) macro. This custom attribute writer, however, will prevent duplicate records of a feature in the database by using `find_or_create_by`.

{% highlight ruby %}
class Order < ActiveRecord::Base
  ...

  def feature_attributes=(attributes)
    feature = Feature.find_or_create_by(attributes)
    self.feature_id = feature.id
  end

end
{% endhighlight %}

### Controllers

In their respective controllers, both `planet_params` and `order_params` will now have to permit feature_attributes to be passed on in the **create** action.

{% highlight ruby %}
def planet_params
  params.require(:planet).permit(:id, :name, :price, :population, :moons, orders_attributes: [:id, :size, :feature_id, feature_attributes: [:id, :name, :description]])
end
{% endhighlight %}

{% highlight ruby %}
def order_params
  params.require(:order).permit(:id, :price, :size, :feature_id, :planet_id, feature_attributes: [:id, :name, :description])
end
{% endhighlight %}

Let's get into the pry console and look at `params[:planet]` again.

{% highlight ruby %}
{"name"=>"purple",
  "population"=>"600000",
  "moons"=>"8",
  "orders_attributes"=>
    {"0"=>{"feature_id"=>"7", "size"=>"10000"},
      "1"=>{"feature_id"=>"1", "size"=>"80000"},
      "2"=>{"feature_id"=>"5", "size"=>"3000"},
      "3"=>
        {"feature_attributes"=>{"name"=>"rainforest", "description"=>"A rainforest is a..."},
     "size"=>"99999"}}}
{% endhighlight %}
	
The `"feature_attributes"` hash fetches the user inputs from the form, and sends the feature attributes "name" and "description" to the controller to be processed and made into a new Feature object. Now, the forms are ready to accept anything a user may throw at it. Don't forget to add validations and a submit button `<%= f.submit %>`. To see the full version of how this works, please go to the [Github repository](https://github.com/auranbuckles/oovarts-planet-shop-at-the-end-of-the-universe).
