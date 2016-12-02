---
layout: post
title:  "Delivering Array Datatypes in an Angular-Rails App"
date:   2016-12-01 04:08:10 +0000
---


Almost every Rails application contains some interaction with a database. The default Rails database management system is SQLite3, but you may want to upgrade to PostgreSQL. There are two advantages to using PostgreSQL in Rails. First, if you're planning on running your app on [Heroku](https://www.heroku.com/), your app [must be configured to use the Postgres database](https://devcenter.heroku.com/articles/getting-started-with-rails5). Second, PostgreSQL is much more powerful in terms of maintaining data integrity and providing for complex database designs. In particular, PostgreSQL allows for [a much wider variety of datatypes](http://edgeguides.rubyonrails.org/active_record_postgresql.html#datatypes). On the other hand, PostgreSQL can be over-kill if your setup is light and/or your app requires fast *read* operations.

To use PostgreSQL in your Rails app, you can either specify it during initialization, or if you have an existing Rails app, [specify the information needed](http://edgeguides.rubyonrails.org/configuring.html#configuring-a-database) to access your database in the config/database.yml file. To create a new Rails app with PostgreSQL, run `rails new myapp --database=postgresql`. Now, instead of using `gem 'sqlite3'`, your Gemfile will use `gem 'pg'`. If you haven't worked with PostgreSQL before, make sure that you have [PostgresApp](http://postgresapp.com/) installed. During development, you'll need to have the app opened and running on Port 5432. The server will shut down once you close the app.

Rails 4 provides a variety of [postgres-specific datatypes](https://github.com/rails/rails/blob/4-2-stable/activerecord/lib/active_record/connection_adapters/postgresql_adapter.rb#L76), and Rails 5 offers [even more](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/connection_adapters/postgresql_adapter.rb#L69). For example, columns of a table can be defined as [variable-length multidimensional arrays](http://edgeguides.rubyonrails.org/active_record_postgresql.html#array). If you want to create an index for your array column, you can choose between [GiST and GIN](https://www.postgresql.org/docs/9.1/static/textsearch-indexes.html) as strategies. I recently built a [recipes Rails app](https://github.com/auranbuckles/world-recipes), which I will use in this tutorial, that utilizes the array datatype. To specify the array datatype in your database, this is the correct syntax:

{% highlight ruby %}
class CreateRecipes < ActiveRecord::Migration[5.0]
  def change
    create_table :recipes do |t|
      # add other columns here
      t.string :ingredients, array: true
      t.string :directions, array: true
    end
  end
end
{% endhighlight %}

Dealing with the array datatype in Rails 5 is fairly straight forward. In your Rails console, you can simply use this syntax to create a recipe with an **ingredients** array: `Recipe.create(ingredients: ['1 cup all-purpose flour', '1 teaspoon white sugar', '1/4 teaspoon salt', '3 eggs', '2 cups milk', '2 tablespoons butter, melted'])`

However, to send information to the server through Angular, array datatypes become more complicated as it is delivered in JSON. For the Rails backend to receive and parse the information, the data must be in string format. In order to dry up the code and use Angular more efficiently, I used [bower-rails](https://github.com/rharriso/bower-rails), [Responders](https://github.com/plataformatec/responders), [ActiveModelSerializers](https://github.com/rails-api/active_model_serializers), [AngularDevise](https://github.com/cloudspace/angular_devise), and [Angular Rails Templates](https://github.com/pitr/angular-rails-templates). Next, we can build a form in the views for the user to create a recipe that gets saved to the database. This is the desired end behavior:

![New Recipe Form](/img/world-recipes.gif)

First, have your [Rails controllers](http://guides.rubyonrails.org/action_controller_overview.html) and [serializers](http://api.rubyonrails.org/classes/ActiveModel/Serializers/JSON.html) set up to so that Rails has the available routes for Angular to save to the database and that Angular can read the information retrieved from the backend, which is expected to be in JSON format:

{% highlight ruby %}
# recipes_controller.rb

class RecipesController < ApplicationController
  before_action :find_recipe, except: [:index, :create, :favorite]

  def create
    @recipe = Recipe.new(recipe_params)
    @recipe.author = current_user
    @recipe.save
  end
	
  private

  def recipe_params
    params.require(:recipe).permit(:id, :title, :difficulty, :time, :servings, :description, :ingredients, :directions, :category_id, :author_id)
  end

end
{% endhighlight %}

{% highlight ruby %}
# recipe_serializer.rb

class RecipeSerializer < ActiveModel::Serializer
  attributes :id, :title, :difficulty, :time, :servings, :description, :ingredients, :directions

  belongs_to :category
  belongs_to :author, class_name: 'User'
  has_many :favorited_users, through: :favorites, source: :user
end
{% endhighlight %}

To follow the flow of how the data gets delivered from the frontend (where the user provides the inputs in the form) to the backend (the #create action in the Rails controller), let's start with the form:

{% highlight ruby %}
<form name="newRecipe" novalidate ng-submit="vm.addRecipe()">
	
  # set the form fields for :title, :category, :description, :difficulty, :time, and :servings

  <!-- ingredients -->
	
    <label for="ingredients">Ingredients</label>
		
    <fieldset data-ng-repeat="ingredient in vm.ingredients">
    # the inputs for each ingredient is extracted from the array vm.ingredients
		
      <input type="text" ng-model="ingredient.quantity" placeholder="Enter quantity" required>
      <input type="text" ng-model="ingredient.name" placeholder="Enter ingredient" required>
      # quantity and ingredient are each keys of each object in the ingredients array
			
      <button type="button" ng-show="$last" ng-click="vm.removeIngredient()">-</button>
      # clicking this will remove the last ingredient object in the ingredients array
    </fieldset>
		
    <button type="button" ng-click="vm.addNewIngredient()">Add Ingredient</button>
    # clicking this will create a new line of ingredient inputs for the user to add more ingredients!

  <!-- directions -->
	
  <label for="ingredients">Directions</label>

    <ol>
      <li>
        <fieldset data-ng-repeat="direction in vm.directions">
          <input type="text" ng-model="direction.text" placeholder="Enter direction" required>
          <button type="button" ng-show="$last" ng-click="vm.removeDirection()">-</button>
        </fieldset>
      </li>
    </ol>
    <button type="button" ng-click="vm.addNewDirection()">Add Direction</button>
		
    # the same logic and structure is used for directions

  <!-- buttons -->

  <input type="reset">
  <input type="submit" value="Create Recipe">

</form>
{% endhighlight %}

`<fieldset>` is an HTML tag that groups related elements in a form and draws a box around the elements, making it an appropriate tag to use in conjunction with [ng-repeat](https://docs.angularjs.org/api/ng/directive/ngRepeat). Here, the information requested from the controller is `vm.ingredients`, which is initialized as an array with nested objects. The [ng-model]()s therefore represent the keys of the nested objects – `ingredient.quantity` and `ingredient.name`. `vm.removeIngredient()` is a function that removes an ingredient from the form fields (or in other words, the last object in the `vm.ingredients` array in the controller). `vm.addNewIngredient()` is the opposite function, which allows the user to push additional input fields into the form to add more ingredients to the recipe.

Lastly, the `vm.addRecipe` function is responsible for submitting the recipe form. When buttons are inside the `<form>` element, you must specify `type=button` in the attributes. Otherwise, Angular will trigger a form submission when the buttons are clicked. The form fields for directions are structured in the same manner, except that each direction only has one `text` key. Make sure that the controller is connected to the view in which the form resides first. Here's what the controller looks like:

{% highlight ruby %}
# NewRecipeController.rb

(function() {
  'use strict';

  function NewRecipeController ($state, RecipeService, CategoryService) {
    var vm = this;
		
    vm.ingredients = [{quantity: '', name: ''}, {quantity: '', name: ''}];
      # the ingredients array is first initiated here
	  
    vm.addNewIngredient = function() {
	    vm.ingredients.push({quantity: '', name: ''});
	  };
    # this function pushes a new ingredient object with the keys .quantity and .name into the ingredients array
	    
    vm.removeIngredient = function() {
	    var lastItem = vm.ingredients.length-1;
	    vm.ingredients.splice(lastItem);
	  };
    # this function removes the last ingredient object from the array
    # do the same for directions here with the .text key

    vm.addRecipe = function() {
    # submits the recipe form

      var ingredients = this.ingredients;
      var allIngredients = [];

      for (var key in ingredients) {
        if (ingredients.hasOwnProperty(key)) {
          var ingredient = ingredients[key].quantity + " " + ingredients[key].name;
          # for each object in the ingredients array, the quantity and ingredients keys are used to retrieve the values
					
          allIngredients.push(ingredient);
        }
      }

      # do the same for directions here

      var data = {
      # this is the final object that gets sent to the database
			
        title: this.title,
        difficulty: this.difficulty,
        time: this.time,
        servings: this.servings,
        description: this.description,
        ingredients: allIngredients.join("\r\n"),
        directions: allDirections.join("\r\n"),
        # the array is then joined by "\r\n" to form a long string for the backend
        category_id: this.category.id
      };

      RecipeService.createRecipe(data);
      # you have to configure an $http function or a service that posts to the recipe create action in Rails
			
      $state.go('home.profile');
    };

  }

  angular
    .module('app')
    .controller('NewRecipeController', NewRecipeController)

}());
{% endhighlight %}

The ingredients array takes the form of `[{quantity: '', name: ''}, {quantity: '', name: ''}]`, but the returned object from a form submission is structured differently. Each object (each ingredient) will have additional keys like so: `"0": Object, "1": Object`. the Because it is in JSON format, the `if (ingredients.hasOwnProperty(key)` in the `for (var key in ingredients)` loop is necessary to [turn it back](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in) into a more readable array with simple objects. The [hasOwnPropery()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty) method filters out the key-value pairs that have these types of meta information by making sure they key is an actual property of an object. Then, using debugger, we can see that after the first loop,  `allIngredients = ["1 cup all-purpose flour"]`.

Then, this array is turned into a long string, joined by **\r\n**, so that Rails will later be responsible for converting this back to a proper array. It's not necessary to use **\r\n**. Any string of characters will do, but something like a comma (**,**) might not be ideal since ingredient names or units might have commas them. I choose **\r\n** simply because it represents an [ASCII new line character](https://en.wikipedia.org/wiki/Newline) and presents itself well while debugging in the console. In the end, this is what the final `data` variable looks like:

![Recipe Form var data](/img/world-recipes-01.png)

Since **\r\n** was used, instead of seeing "\r\n" after each ingredient item, it will show either an arrow or an actual new line. Then, in order for Rails to receive this data correctly in the backend, a custom writer is needed in the serializer:

{% highlight ruby %}
class Recipe < ApplicationRecord
  belongs_to :category
  belongs_to :author, class_name: 'User'
  has_many :favorites
  has_many :favorited_users, through: :favorites, source: :user

  def ingredients=(str)
    write_attribute( :ingredients, str.split(/\r\n/) )
  end

  def directions=(str)
    write_attribute( :directions, str.split(/\r\n/) )
  end
end
{% endhighlight %}

These methods will split the string into an array on each **\r\n**, so that Rails can simply save it to the database using the simple syntax we saw in the beginning – `Recipe.create(ingredients: ['1 cup all-purpose flour', '1 teaspoon white sugar', '1/4 teaspoon salt', '3 eggs', '2 cups milk', '2 tablespoons butter, melted'])`. You can read more about this on the [Active Record documentation](http://api.rubyonrails.org/classes/ActiveRecord/Base.html#method-c-serialize). Using Pry to look into the Rails controller action #create, we can see that it is in the correct format:

![recipe object in the Rails controller](/img/world-recipes-02.png)

For the purposes of this tutorial, I've purposefully omitted some code, including Bootstrap classes and data validations, but you can view the full project [on Github](https://github.com/auranbuckles/world-recipes).



