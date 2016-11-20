---
layout: post
title:  "Extending a Rails App with a jQuery Frontend"
date:   2016-11-10 01:33:11 -0500
---


The most mind-boggling aspect of web development isn't learning a new language or memorizing the different functions or methods in a language, at least for a beginner developer. Coordinating different languages in a flexible and effective fashion is important in creating beautiful and functional web applications, but the path isn't always so smooth. Often, the benefits reaped from libraries and frameworks that are built on this principle come with incidental disadvantages that just have to be compromised.

As mentioned in a previous blog post, I created [a basic Rails application](https://github.com/auranbuckles/oovarts-planet-shop-at-the-end-of-the-universe) that sells planets to customers. A user can sign up, create planets, and make orders to add features like forests and glaciers to their planets. I extended this app to incorporate a jQuery frontend, which required an effective integration of HTML, CSS, JavaScript, and Ruby. As a result, certain pages can display information and interact with the user while discarding the need for a new GET request, the default browser behavior.

## Adding User Interaction

When users browse a feature's show page at `/features/:id`, they can see a display of the feature's name and description attributes, fetched from the database, along with an associated image from the asset pipeline. Previously, this was done by simply rendering Ruby code through the ERB templating system – `<%= @feature.name.titleize %>` would return "Forest," and so forth.

![Oovart's Planet Shop feature page](/img/oovarts-planet-shop-3.png)

With a jQuery frontend, I made it possible for users to (1) press a button to view the feature's associated orders in a table, and (2) use the "next" and "previous" buttons to scroll through all the features in the database, (3) without the page calling for an HTML GET request and refreshing the page. The last functionality requires firing a GET request through AJAX, and enhances user experience because information is generated (seemingly) seamlessly.

![Oovart's Planet Shop feature page](/img/oovarts-planet-shop-4.gif)

The tricky part of this is to mimic how the page was rendered using Rails in the backend, and bring it to the frontend with JavaScript and jQuery. For example, `<%= image_tag @feature.name.parameterize, :id => "featureImage", :class => "img-rounded img-responsive" %>` becomes `$("#featureImage").attr("src", "/assets/" + feature["name"].parameterize() + ".jpg")`. Because both options have to be available, when a change is made in one file, the other needs to be adjusted accordingly. This results in duplicated work for the developer, but there really isn't an alternative under this framework.

## Rendering JSON Through AJAX GET Requests

After implementing serializers through [ActiveModelSerializers](https://github.com/rails-api/active_model_serializers), and [establishing the relationships and rendering the pages in JSON](https://blog.engineyard.com/2015/active-model-serializers), AJAX is ready to deliver the information. The jQuery below listens for the click event made on the `".show-orders"` button and returns a list of associated orders via AJAX.

{% highlight ruby %}
  $(".show-orders").on("click", function(e) {
    // prevent response from loading a new page
    e.preventDefault();

    $(this).data('clicked', true);

    var currentId = $(".js-next").attr("data-id");

    $.get("/features/" + currentId + "/orders").success(function(json) {
      console.log(currentId);
      var list = $("div.orders-list table")
      list.html("")

      list.append("<tr><th>Order ID</th><th>Feature</th><th>Planet</th><th>Size (fy sq.)</th><th>Price (Pu)</th></tr>");

      json.forEach(function(order) {
        list.append("<tr><td>"
         + order.id + "</td>"
         + "<td>" + order.feature.name + "</td>"
         + "<td>" + order.planet.name + "</td>"
         + "<td>" + order.size + "</td>"
         + "<td>" + order.price * 1000
         + "</td></tr>")
      })
    })
  });
{% endhighlight %}

Then, moving back and forth between the features is made possible by the following jQuery. The "previous" button is exactly the same, except that data-id is written as `("data-id")) - 1`.

{% highlight ruby %}
  $(".js-next").on("click", function() {

    var nextId = parseInt($(".js-next").attr("data-id")) + 1;
    $.get("/features/" + nextId + ".json", function(feature) {
      $("#featureName").text(feature["name"].titleize());
      $("#featureDescription").text(feature["description"]);
      $("#featureImage").attr("src", "/assets/" + feature["name"].parameterize() + ".jpg");

      // re-set the id to current on the link
      $(".js-next").attr("data-id", feature["id"]);

      // does not show orders if user has not already clicked for it
      if($(".show-orders").data('clicked')) {
        $(".show-orders").click();
      }
    });
  });
{% endhighlight %}

## Harmonizing AJAX GET Requests

At the very beginning of the code, the variable `currentId` became necessary because while the jQuery functions performed perfectly well on their own, the user experience wasn't great. The `$(".show-orders")` and `$(".js-next")` functions were not aware of each other – when the user jumps to the next feature, the orders list would linger on information about the previous feature. By having the `currentId` variable be tied to the "data-id" attribute in `$(".show-orders")` (`currentId = $(".js-next").attr("data-id")`, and `$(".js-next")` updating the attribute (`$(".js-next").attr("data-id", feature["id"])`), we can make sure that both functions are on the same page regarding the current feature.

Then, to update the orders when the "next" button is clicked, the function should also trigger a click event on the `".show-orders"` button. However, we also don't want the orders for the next feature to appear if the orders for the previous feature is not already displayed. To solve this problem, `$(this).data('clicked', true)` is provoked when `".show-orders"` is clicked. Subsequently,  `$(".js-next")` will only clicked on it within the function if `$(".show-orders").data('clicked'` were trued. By doing so, the interactions on the site between the buttons make more sense from the user perspective.

Github Repository: [Oovart's Planet Shop at the End of the Universe](https://github.com/auranbuckles/oovarts-planet-shop-at-the-end-of-the-universe)


