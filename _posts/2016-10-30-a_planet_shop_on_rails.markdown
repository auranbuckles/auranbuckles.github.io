---
layout: post
title:  "A Planet Shop on Rails"
date:   2016-10-30 17:38:03 -0400
---


[Oovart's Planet Shop at the End of the Universe](https://github.com/auranbuckles/oovarts-planet-shop-at-the-end-of-the-universe) is a Rails application that allows users (customers) to sign up, order planets with different features, and make additional orders to add features to their planets. Available features include forests, fjords, and volcanoes, among others. Customers can also create their own custom features. A price tag is randomly assigned to each order of a planet or feature. Because the planet shop is near the end of the universe, customers who get tired of their planets can press a button to watch the universe end itself while it destroys all their planets.

The idea for this project isn't entirely original. The title is a reference to Douglas Adams' second book in the Hitchhiker's Guide to the Galaxy trilogy, [The Restaurant at the End of the Universe](https://en.wikipedia.org/wiki/The_Restaurant_at_the_End_of_the_Universe).

![Oovart's Planet Shop Sitepage](/img/oovarts-planet-shop-1.png)

The first and foremost task before diving into the code was mapping out the relational database for the application. Instead of features, I initially wanted to allow users to create inhabitants for their planets. The only problem was, because the inhabitants were unique to the individual planets, I wouldn't have been able to implement a has_many, through association between the users and the inhabitants. I could have still gone with it by creating preexisting species of inhabitants, but I ultimately decided to experiment on a less complex scale with the Feature model first.

The second idea was to allow users to create events for the other users on their planets, making Planets the model that connects the User and Guest (of the events) class. However, this would make the associations more complicated and require additional authorizations on top of authentications. At the end, I chose to use an Order class which acted as the `has_many, through` model connecting the Planet and Feature class. In this case, a User simply `has_many` planets.

```
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
```

The toughest hurdle in the making of this app was creating nested forms. For this type of relational database and associated models, I had to create a nested-nested form – while ordering a new planet, a user can also make an optional order for one more features for that planet. In addition, the user can choose whether the features are preexisting (already in the database) or customized, or both. If a custom feature is created, it will be inserted into the database as a new Feature object, making it available to other users as well. Since I wanted to allow blank entries for the features to be sent without accidentally creating a new object in the Feature model, some Ruby validation logic was also necessary (see code below).

```
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
```

As I had to dig deep and understand almost every aspect of how nested forms work, I'll probably write a tutorial in the next blog on nested-nested forms. The lessons I learned were: pay attention to your Rails version, understand how the `accepts_nested_attributes_for` macro works (even if you're just using it as a shortcut), and choose a debugging tool that you're comfortable with. For this app, I used an `orders_attributes=` and a `feature_attributes=` custom attribute writer, instead of the `accepts_nested_attributes_for` macro. [This tutorial](https://www.youtube.com/watch?v=WVR-oDQRrFs&list=PLMEKAK4ZKPNoA13U1xYMwdxFfWc4Wg8eQ&index=1) on Rails 4.2 nested forms was particularly helpful.

Creating seed data is an important part of creating an app, since it allows developers to quickly generate associated data to manipulate, or reload a clean database once you've created too much messy data during the process. Although I eventually decided not use it, the [Faker](https://github.com/stympy/faker) gem is a powerful library to quickly create dummy data. It contains a wide variety of data categories, such as names, books, food, and even Pokemon names and locations. For this app, I simply made great use of the Rails `#rand` class method to randomize and make the seed data seem more natural.

Oovart's Planet Shop at the End of the Universe is by far the most challenging project for me, but I've learned a great ton through the frustrations. It has the potential to contain more features, such as a new Habitant class that belongs to the Planet class, or an Event class that can allow for user interactions. I'd love to implement some of these initial ideas I had in the future.

[Github Repo](https://github.com/auranbuckles/oovarts-planet-shop-at-the-end-of-the-universe)
