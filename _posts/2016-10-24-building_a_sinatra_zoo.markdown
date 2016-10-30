---
layout: post
title:  "Building a Sinatra Zoo"
date:   2016-10-24 16:12:12 -0400
---


For this project, I wanted to build something that simulated a real life event, perhaps something fun that people do on a weekend. I ultimately decided to create a zoo because (1) I love animals, and (2) going to the zoo involves just a few simple activities, but still has enough programmable interactions between the objects to make it interesting. After some brainstorming, I tweaked the idea a little, so that each user would create their own zoo, hence the name Zookeeper. This leaves room for potential additions such as visitors and tickets to be implemented in the future.

![Zookeeper sitepage](/img/zookeeper.png)

This project made me realize how important it is to take time to make a blueprint of the application before diving into the code. I spent a considerable amount of time drawing diagrams and mapping out possible relationships and interactions between the different classes (objects). During this planning stage, I had in mind 4 different zoo structures:

1. Each User has many Food objects and has many Animal objects, and each Animal has many (can obtain or gain) Food objects through User.
2. Each species of animal is its own class, and each of them has many Users while each User has many Animals. Each Food object belongs to a User.
3. Some combination of the above, but each User has many Zoo objects that has many Animal objects, so that each User has many Animal objects through Zoo objects, with different kinds of foods as an attribute (a column in the database) of each User.
4. Without using a Zoo class, each User has many Animal objects and has different kinds of foods as an attribute (a column in the database) of each User.

After thorough consideration, I went with the last idea, because it was the simplest and most straightforward. It wasn’t necessary to build a whole Zoo class; each user can have one zoo (be their own zoo), at least for the time being. If I wanted each user to be able to build multiple zoos, I can add the Zoo class later. It also wasn’t necessary to make food its own class, since it doesn’t have many attributes, and it would be unnecessarily cumbersome to continuously track down, update, and delete the food and types of food. As for only allowing each animal to eat their corresponding type of food, I decided to code in the restrictions using helper methods and a form. After the foundational structure was built, I made a list of what the app actually does.

Users in [Zookeeper](https://github.com/auranbuckles/zookeeper) can:
1. Create an account and view their profiles
2. Log in and out of their accounts
3. Browse other users' profiles and their animals' profiles
4. Create animals with a name, species, gender, and description
5. Edit an animal's name and description
6. Purchase food and feed it to the animals they own
7. Reset their animal's status to the default status
8. Delete their animals

By default, a profile picture is assigned to each species, so that when a user creates a sloth, a picture of a sloth will show up in its profile. Upon creation, each animal also has an appetite level of 10 and a happiness level of 0. This is because the animal is not fed yet. At sign up, each user gets a certain amount of bamboo shoots, fish, fruits, grass, and meat. Users may purchase more of each type of food by submitting a form (no credit card required, of course). Because each species only eats one type of food, when an animal is fed, the user's food inventory will adjust accordingly. This restriction begins with a helper method:

```
class ApplicationController < Sinatra::Base

  ...

  helpers do

    ...

    def appropriate_food
      species = @animal.species
      case species
      when "dolphin", "penguin", "brown bear", "polar bear", "seal"
        "fish"
      when "panda"
        "bamboo shoots"
      when "elephant", "monkey", "sloth", "ape"
        "fruits"
      when "lion", "tiger", "cheetah", "red fox", "wolf"
        "meat"
      when "kangaroo", "zebra", "buffalo", "elk", "deer", "rhino"
        "grass"
      end
    end

  end
end
```

The animal's profile (where the user can feed the animal) will indicate to the user which type of food it requires, using `<h2>Eats: <%= appropriate_food %></h2>`. When the user clicks on `Feed <%= @animal.name %>`, a form is submitted and the user's food inventory is updated through some Ruby logic. At the same time the user's corresponding food inventory decreases by 1, the animal's appetite level decreases by 1 and its happiness level increases by 1.

```
class AnimalsController < ApplicationController

...

	patch '/animal-attributes/:id' do
		@animal = Animal.find(params[:id])
		if logged_in? && current_user.id == @animal.user.id
			@animal.update(appetite: @animal.appetite - 1, happiness: @animal.happiness + 1)
			case appropriate_food
			when "bamboo shoots"
				@animal.user.update(bamboo_shoots: @animal.user.bamboo_shoots - 1)
			when "fish"
				@animal.user.update(fish: @animal.user.fish - 1)
			when "fruits"
				@animal.user.update(fruits: @animal.user.fruits - 1)
			when "grass"
				@animal.user.update(grass: @animal.user.grass - 1)
			when "meat"
				@animal.user.update(meat: @animal.user.meat - 1)
			end
		end
		redirect "/animal/#{@animal.id}"
	end
	
	...
end
```

Writing the above two pieces of code was probably the second most difficult part of this project, as it required some long-time-no-see lower level Ruby code. The most difficult part was user authentication during sign up and log in, and preventing the user from taking actions that belong to other users. For example, a user shouldn't be able to edit or feed another user's animals, or update their food inventory. Luckily, the cookie-cutter ```logged_in?``` and ```current_user``` helpers often used in simple applications solved all these problems. While I at first filled in all the routes in the Application Controller, they were moved to a separate Session Controller to free up the clutter.

If I were to expand upon this project, the first move would be to display error messages in the sign up / login routes, and where users perform actions without authority. The front-end CSS and JavaScript also need some beautification. To increase user interaction in the application, an additional Zoo class or Visitor class can add more layers of functionality. Having visitors would allow users to issue and track tickets to other users. Overall, I enjoyed this project, not just because I love the subject and theme, but more importantly, I gained a firmer grasp of the CRUD functions in a Sinatra application. Watching the code come together bit by bit and blossom into a fully functional application is truly every developer's greatest satisfaction.

[Zookeeper (Github)](https://github.com/auranbuckles/zookeeper)
