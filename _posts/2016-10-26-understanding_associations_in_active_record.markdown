---
layout: post
title:  "Understanding Associations in Active Record"
date:   2016-10-26 12:47:21 -0400
---

Relationships are complicated, even in a two-dimensional universe. Trying to understand what Active Record associations are, which ones to use under what circumstances, and how they work together are confusing concepts for beginners to wrap our heads around.

The Rails Guide on [Active Record Associations](http://guides.rubyonrails.org/association_basics.html) offers a straightforward and complete list of the different types of associations you can choose from. According to the guide, associations are "connection[s] between two Active Record models" that "make common operations simpler and easier in your code." To implement Active Record associations, the developer has to incorporate both data manipulation and business logic in the architecture of the application. At a minimum, an object's role in relation to other objects must correspond to how these objects are structured and mapped in the database.

I won't be reiterating the definitions and concepts in the Rails official documentation here, but I'll try to demystify the art of associations by creating a very basic example structure of an airline's business. JadeBlue Airlines offers various flights, and has passengers assigned to the flights through bookings. I'll be discussing which associations are appropriate depending on the circumstances and demonstrating the advantages and disadvantages of each. Hopefully by doing so, beginners won't shy away from employing more complex associations in their projects.

## Basic Associations in Rails
A [one-to-many relationship](http://guides.rubyonrails.org/association_basics.html#the-has-many-association) is the least ambiguous kind of relationship. Here, JadeBlue offers a selection of flights, and each flight has many passengers.

{% highlight ruby %}
class Flight < ActiveRecord::Base
  has_many :passengers
end
{% endhighlight %}

But what is happening behind the scenes in Rails? Here, `has_many` is a method drawn from the Rails DSL. To understand DSLs a little more, [this article](http://martinfowler.com/bliki/InternalDslStyle.html) explains it well. The method accepts a symbol as an **argument**, ```:passengers```. Given this, Rails will automatically create associations based on naming conventions. Essentially, Rails enables a ```passengers``` method that an object of the Flight class can call on. For example, we can do this to get a flight's passengers:

{% highlight ruby %}
flight = Flight.find(2)
flight.passengers
{% endhighlight %}

A reversed association between flights and passengers is needed to complete the relationship:

{% highlight ruby %}
class Passenger < ActiveRecord::Base
  belongs_to :flight
end
{% endhighlight %}

And to access a passenger's flight:

{% highlight ruby %}
passenger = Passenger.find(1)
passenger.flight
{% endhighlight %}

The database for the two objects looks something like this. The `flight_id` is the foreign key, which is assigned to the object that `belongs_to` another object (in this case, passengers).

Students:

| id | first_name | last_name | flight_id |
| -- | ---------  | --------- | --------- |
|  1 | John       | Doe       | 1         |
|  2 | Mary       | Smith     | 3         |
|  3 | Ann        | Johnson   | 1         |
|  4 | William    | Davis     | 2         |      

Flights:

| id | origin    | destination |
| -- | --------- | ----------- |
| 1  | New York  | Hong Kong   |
| 2  | Hong Kong | Shanghai    |
| 3  | Frankfurt | Paris       |

## Using a Join Table
In reality, a passenger can have many flights while a flight has many passengers. A **join table** serves as a liaison between the two models and keeps track of this [has_and_belongs_to_many relationship](http://guides.rubyonrails.org/association_basics.html#the-has-and-belongs-to-many-association). According to naming conventions, the name of the join table must be the two model names put together in alphabetical order (flights_passengers). You may also use `add_index:` in your migrations to create a primary key column (a unique index) in the join table.

{% highlight ruby %}
class Flight < ActiveRecord::Base
  has_and_belongs_to_many :passengers
end

class Passenger < ActiveRecord::Base
  has_and_belongs_to_many :flights
end
{% endhighlight %}

The join table isn't a model. It exists merely for record-keeping purposes:

Passengers:

| id | first_name | last_name |
| -- | ---------- | --------- |
| 1  | John       | Doe       |
| 2  | Mary       | Smith     |
| 3  | Ann        | Johnson   |
| 4  | William    | Davis     |

Flights:

| id | origin    | destination |
| -- | --------- | ----------- |
| 1  | New York  | Hong Kong   |
| 2  | Hong Kong | Shanghai    |
| 3  | Frankfurt | Paris       |

Flights_passengers:

| passenger_id | flight_id |
| ------------ | --------- |
| 1            | 1         |
| 1            | 2         |
| 2            | 3         |
| 3            | 1         |
| 3            | 3         |
| 4            | 2         |

## Why Aren't Join Tables Always the Best?
There are disadvantages in using a has_and_belongs_to_many association. By creating a simple join table, each row contains just two foreign keys. You won't be able to access the join table records directly, or express the nature of the relationship. In other words, it lacks a model that connects flights and passengers to give it more context. In this case, JadeBlue connects its passengers to their flights through bookings. To accomplish this, we can create a third-party **join model**, Booking, to act as a model itself and a join table connecting the flights and passengers.

{% highlight ruby %}
class Flight < ActiveRecord::Base
  has_many :bookings
end

class Booking < ActiveRecord::Base
  belongs_to :passenger
  belongs_to :flight
end

class Passenger < ActiveRecord::Base
  has_many :bookings
end
{% endhighlight %}

By creating the Booking class, we can add certain attributes (columns) to each Booking, such as purchase_date and price in the database. This would allow us to call `Booking.first.purchase_date` on a Booking. You can also obtain an instance of the Booking class by its primary key (ID) with `Booking.find(4)`. With the passengers and flights tables staying the same, the bookings table looks like this:

| id | purchase_date | price   | passenger_id | flight_id |
| -- | ------------- | ------- | ------------ | --------- |
| 1 | 20160108       | 1200.00 | 1            | 1         |
| 2 | 20160108       | 250.00  | 1            | 2         |
| 3 | 20160108       | 180.00  | 2            | 3         |
| 4 | 20160108       | 1200.00 | 3            | 1         |
| 5 | 20160108       | 180.00  | 3            | 3         |
| 6 | 20160108       | 250.00  | 4            | 2         |

But there are several problems with this. If I wanted to see a list of flights of a passenger to update it or manipulate it in other ways, I'd have to do it in a more roundabout fashion, just like I would with a has_and_belongs_to_many association.

{% highlight ruby %}
passenger = Passenger.find(1)
flight_id = Passenger.first.bookings.first.flight_id
Flight.find(flight_id)
{% endhighlight %}

In larger and more complex applications, making changes like this are cumbersome and will take up a lot of time and effort.

## Refining the Join Model
Let's improve this using the same three models. While we previously used a **join table** for a **has_and_belongs_to_many** association, we will now create a **join model** for a **has_many, through** association.

{% highlight ruby %}
class Flight < ActiveRecord::Base
  has_many :bookings
  has_many :passengers, through: :bookings
end

class Booking < ActiveRecord::Base
  belongs_to :passenger
  belongs_to :flight
end

class Passenger < ActiveRecord::Base
  has_many :bookings
  has_many :flights, through: :bookings
end
{% endhighlight %}

The `has_many, through:` association is considered more flexible in several ways. Now, just like a normal `has_many` association, I can call `passenger = Passenger.find(1)` then `passenger.flights` to get a list of the passenger's flights. If you decide to delete a single booking, the association will be destroyed, but its flight and passenger will be left untouched in the database. In addition, creating new objects and making the association is much easier, thereby also lowering the chances of error. For example:

{% highlight ruby %}
passenger = Passenger.create(first_name: "John", last_name: "Doe")

flight = Flight.create(origin: "New York", destination: "Hong Kong")

# Let's create the relationship between John Doe and his flight.

passenger.bookings.create(purchase_date: 20160108, price: 1200.00, flight: flight)
{% endhighlight %}

Since we have a join model *and* a has_many, through association, we can work with the join model as an independent entity and use it to manipulate our objects, passengers and flights. A join model also allows for validations, callbacks, and the ability to hold attributes of itself. On the other hand, programming is about finding the right tool for the job. In the case of JadeBlue, has_many, through is necessary in or to hold records of each booking. In some situations, you may just want to set up a direct relationship between two models without the extra functionality, in which case `has_and_belongs_to_many` may be more suitable. However, this can limit your application if it grows in complexity. All in all, the increasingly popular has_many, through association provides more versatile functions, and is usually a safe bet if you're stuck in between.
