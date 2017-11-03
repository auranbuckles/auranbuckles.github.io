---
layout: post
title: Injecting Metadata Into Objects in Stripe With Webhooks
date: 2017-08-31
---

Metadata contains additional, neatly structured information about an object, mostly in the form of key-value pairs. In [Stripe](https://stripe.com/), a wide range of objects such as Account, Charge, Customer, Refund, Subscription, and Transfer all allow for a metadata parameter, which greatly enhances the developer experience in interacting with the [Stripe API](https://stripe.com/docs/api). In this app I'm working on, donors can sign up to donate monthly to nonprofits via Stripe. With the help of webhooks, we'll take a look at how we can get notified when a recurring payment was successfully processed, then update that payment's metadata parameter with the donor's first name and last name.

## Webhooks and Specifying URL Endpoints

Webhooks are essentially HTTP callbacks, which are triggered when something happens and an HTTP POST request is subsequently created. Using webhooks, web applications are "notified" whenever certain events occur, and can retrieve information about that event in the request. Your app may want to use this information, for example, to update transaction details in your database, or send a notification email to users letting them know that their Stripe payment preferences were successfully updated. This example uses Ruby on Rails (4.2).

For webhooks to work, you have to specify a URL endpoint on your server to which Stripe's servers will send a POST request to. Assuming that the application you're working with is already [connected to your Stripe account via the API keys](https://rails.devcamp.com/ruby-gem-walkthroughs/payment/how-to-integrate-stripe-payments-in-a-rails-application-charges), head over to your dashboard in Stripe and go to API > [Webhooks](https://dashboard.stripe.com/account/webhooks). There, you'll be able to add your URL endpoints under both the live (production) mode and test (development) mode. You'll specify two for each if you are also using [Stripe Connect](https://stripe.com/docs/connect).

![Stripe Webhooks Live Mode]({{ site.img_path }}{{ page.date | date: '%Y-%m-%d' }}/stripe-webhooks-live.png)
![Stripe Webhooks Test Mode]({{ site.img_path }}{{ page.date | date: '%Y-%m-%d' }}/stripe-webhooks-test.png)

## Using Ultrahook to Test HTTP Requests

For the record, I am using [Ultrahook](http://www.ultrahook.com/) to connect to and test [Stripe webhooks](https://stripe.com/docs/webhooks) in development mode. It is completely free and easy to set up. Once set up, you only have to run `ultrahook stripe <your application's port>` to tunnel all Stripe HTTP requests to a private endpoint on your local environment.

![Ultrahook in Terminal]({{ site.img_path }}{{ page.date | date: '%Y-%m-%d' }}/ultrahook-stripe.png)

## Creating a Webhooks Controller

In Rails, all you have to do is (1) specify which controller the endpoint URL(s) will be using, and (2) set up the controller. Optionally, you can [use signatures to validate webhook events](https://stripe.com/docs/webhooks#signatures) to make sure they were not sent by third parties.

```ruby
# config/routes.rb

post 'stripehooks1', :to => 'webhooks#stripe_account_events'
post 'stripehooks2', :to => 'webhooks#stripe_connect_events'

# app/controllers/webhooks_controller.rb

class WebhooksController < ApplicationController
  #events relating directly to stripe account
  def stripe_account_events
    # optionally verify signature here
    initialize_variables
  end

  #events relating to connected stripe accounts
  def stripe_connect_events
    # optionally verify signature here
    initialize_variables
  end

  private

  def initialize_variables
    @event = @event_json["type"]
    @event_json = JSON.parse(@response)
    @object = @event_json["data"]["object"]
  end
end
```

Although adding metadata to one-time charges can be done in real-time when the charge is happening, recurring monthly charges (subscriptions) occur solely on Stripe's end, and my app won't be notified without webhooks. My goal is to listen to subscription payment events relating to various Stripe accounts connected to my application, under the `stripe_connect_events` controller action.

`@event` captures the name of the event that is coming through. Stripe has an [plethora of webhook events](https://stripe.com/docs/webhooks) you can select from, such as `coupon.create` and `charge.succeeded`. In "Update details" under each webhook endpoint, you can choose to either be receiving "all event types" or select certain ones you want.

As explained in [this article](https://stripe.com/docs/subscriptions/lifecycle) and [this helpful cheatsheet](https://www.masteringmodernpayments.com/stripe-webhook-event-cheatsheet), four events are fired when a subscription is due for renewal:
1. invoice.upcoming
2. invoice.created
3. charge.succeeded
4. invoice.payment_succeeded

What we're interested here is `invoice.payment_succeeded`, the last step in successfully receiving a recurring payment from a user. The structure of the response looks like this:

```json
{
  "created": 1326853478,
  "livemode": false,
  "id": "evt_00000000000000",
  "type": "invoice.payment_succeeded",
  "object": "event",
  "request": null,
  "pending_webhooks": 1,
  "api_version": "2017-06-05",
  "data": {
    "object": {
      "id": "in_00000000000000",
      "object": "invoice",
      "amount_due": 12500,
      "application_fee": null,
      "attempt_count": 1,
      "attempted": true,
      "billing": "charge_automatically",
      "charge": "_00000000000000",
      "closed": true,
      "currency": "usd",
      "customer": "cus_00000000000000",
      "date": 1509469492,
      "description": null,
      "discount": null,
      "ending_balance": 0,
      "forgiven": false,
      "lines": {
        "data": [
          {
            "id": "sub_AznLYbwXGciAc5",
            "object": "line_item",
            "amount": 12500,
            "currency": "usd",
            "description": null,
            "discountable": true,
            "livemode": true,
            "metadata": {
            },
            "period": {
              "start": 1511475574,
              "end": 1514067574
            },
            "plan": {
              "id": "donations-ultimate-monthly",
              "object": "plan",
              "amount": 64500,
              "created": 1499638605,
              "currency": "usd",
              "interval": "month",
              "interval_count": 1,
              "livemode": false,
              "metadata": {
              },
              "name": "Donations Ultimate",
              "statement_descriptor": null,
              "trial_period_days": null
            },
            "proration": false,
            "quantity": 1,
            "subscription": null,
            "subscription_item": "si_1AdnkYCZVg7LuwAsfZAxYYYe",
            "type": "subscription"
          }
        ],
        "has_more": false,
        "object": "list",
        "url": "/v1/invoices/in_1BJ3AWCZVg7LuwAshpTpEwug/lines"
      },
      "livemode": false,
      "metadata": {
      },
      "next_payment_attempt": null,
      "number": "d3f6687555-0004",
      "paid": true,
      "period_end": 1509469456,
      "period_start": 1506791056,
      "receipt_number": null,
      "starting_balance": 0,
      "statement_descriptor": null,
      "subscription": "sub_00000000000000",
      "subtotal": 12500,
      "tax": null,
      "tax_percent": null,
      "total": 12500,
      "webhooks_delivered_at": 1509469502
    }
  }
}
```

## Updating and Adding Metadata to the Charge Object

The response above contains a boat load of information, but we only need a few of them to (1) match the data to our database and update it, then subsequently (2) attach metadata containing the donor's first name and last name, and lastly (3) save it to Stripe's database.

```ruby
# app/controllers/webhooks_controller.rb

class WebhooksController < ApplicationController
  ...

  #events relating to connected stripe accounts
  def stripe_connect_events
    # optionally verify signature here
    initialize_variables
    invoice_payment_succeeded
  end

  private

  def invoice_payment_succeeded
    if @event == "invoice.payment_succeeded"
      # Get IDs and subscription data
      customer_id = @object["customer"]
      charge_id = @object["charge"]
      data = @object["lines"]["data"][0]
      subscription_id = data["id"]

      if sub = Commitment.find_by(stripe_connect_customer_id: customer_id, stripe_subscription_id: subscription_id)

        # Update record in database
        sub.update(
          current_period_start: DateTime.strptime(data["period"]["start"].to_s, '%s'),
          current_period_end: DateTime.strptime(data["period"]["end"].to_s, '%s')
        )

        # Retrieve and update charge description on Stripe
        user = sub.user
        org = sub.organization
        charge = Stripe::Charge.retrieve(charge_id, {stripe_account: org.stripe_user_id})
        charge.metadata = {firstname: user.firstname, lastname: user.lastname}
        charge.save
      end
    end
  end
end
```

The `invoice_payment_succeeded` method first checks whether the `@event` variable is "invoice.payment_succeeded", and plucks out the relevant IDs and data we need. It queries the Commitment database table (where Stripe subscriptions are) and updates it with the new information we have, current_period_start and current_period_end.

Here, `user` is the donor of the donation/payment, and `org` is the nonprofit donee. With Stripe Connect, charges must be retrieved by supplying the connected account's account/user ID as the second parameter, in the format `Stripe::Charge.retrieve(< CHARGE ID >, {stripe_account: < CONNECTED ACCOUNT ID >})`. Once retrieved, simply use `charge.metadata = { < KEY >: < VALUE > }` to update the metadata, and finally `charge.save` it.

Now, whenever a recurring payment goes through successfully, your webhooks controller will automatically handle data manipulation and add metadata for you. This way, you and your connected accounts will be able to see additional donor information for each payment on their dashboard.
