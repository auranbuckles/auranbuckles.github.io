---
layout: post
title:  "Object-Oriented Business Logic"
date:   2016-10-24 00:47:45 +0000
---


No matter where you work as a developer, you can't escape business-related considerations. At a minimum, deadlines and budget concerns are issues that every programmer deals with. On top of that, it is estimated that "90 percent of programming jobs are in creating Line of Business software" ([source](http://www.kalzumeus.com/2011/10/28/dont-call-yourself-a-programmer){:target="_blank"}). The work of these programmers include tracking expenses, optimizes shipping costs, inventory management, generating price estimates, and assisting the financial department in their everyday operations.

Programmers don't have to be financers or economists to be successful in their field, but gaining an understanding of the business aspect of what they're doing and its role in the company or industry will certainly boost their competitive advantage. This is because a great amount of programming is done to *solve business problems*. Most of the time, this means saving and making money, or saving and making money through saving time. This is the *business value* that programmers offer, and the [*business logic*](https://en.wikipedia.org/wiki/Business_logic){:target="_blank"} is the part of programming that integrates real-world business rules into an application or program.

If you've worked on object-oriented programming, business logic is no stranger. The logic and rules simply determine what and how objects get created, read, updated, and destroyed (when used in a CRUD application), and subsequently programming the associations (relationships) between these objects. For example, a cafeteria in a Sinatra CRUD application has the various products it offers, managers, cashiers, and customers. These objects are connected through orders and transactions. A product may have the attributes of "Name", "Category", "Cost", "Price", "Date of Purchase", and "Expiration Date".

{% highlight ruby %}
# the Product class within app/models

class Product < ActiveRecord::Base

  validates_presence_of :name, :cost, :price, :date_of_purchase, :expiration_date

  belongs_to :category

end

# the database for products

class CreateProducts < ActiveRecord::Migration
  def change
    create_table :products do |t|
      t.string :name
      t.float :cost
      t.float :price
      t.date :date_of_purchase
      t.date :expiration_date
      t.integer :category_id
  end
end
{% endhighlight %}

Some distinguish business logic and business rules, which are expressions of business procedures and policies written in code. Our example above can have (but not limited to) the following business rules:
* Each customer gets a ticket number to get in line.
* The customer first in line will get to order next.
* The total price for the customer is the sum of the price of each item multiplied by quantity, with sales tax.
* The cashier must be authorized to make the transaction before making the transaction.
* The transaction must be [atomic](https://en.wikipedia.org/wiki/Atomicity_%28database_systems%29){:target="_blank"}.
* Only managers have the authority to void transactions.

It would take books to describe what the ideal approaches are in structuring the business logic and rules of an application, but there are certain principles that many agree on. "Separation of concerns" is a core idea in Rails and other MVC-structured frameworks. Under this principle, the business logic would normally reside in the "models" department. Components needed for the business rules could also be written under models: we can, for example, add a `self.available_products` method in the Product class that returns an array or hash of products to be used in other parts of the application.

The core principle of "separation of concerns" aims to maximize the application's maintainability and flexibility. Keeping the business logic layer (whether it be just the model, or model and controller) isolated is important. While the database is part of the system that makes the business logic work, it simply provides a space to store the different attributes of objects defined by the business logic layer. This layer is defined as the <a href="https://en.wikipedia.org/wiki/Persistence_(computer_science)" target="_blank">persistence layer</a>, which is separated from the business logic (also called the domain layer). An example implementation of this is the [Business Rule Management System](https://en.wikipedia.org/wiki/Business_rule_management_system). This way, when changes occur, they can happen in more isolated areas. In business terms, this means saving time and money.

The idea of separating concerns and organizing code to make it more manageable isn't something new to developers. However, in the real world, it is crucial (and practical) to think from the business perspective as well. Considerations such as externalizing rules (abstraction), lowering risks and chances of error, and the level of ease in which other developers can understand and work together with you on your code aren't just for developers, but for the business as well.
