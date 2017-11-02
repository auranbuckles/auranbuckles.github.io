---
layout: post
title: Creating Dynamic Nested Forms in Rails with jQuery - Part I
date: 2017-08-01
---

I'm currently working on a project for nonprofits to create event pages, which allows users to register for, volunteer at, or sponsor these events. To allow nonprofits to create sponsorship levels for sponsors to choose from when creating an event, I've had to add nested fields via multiple `has_many` and `has_many :through` relationships. For the first layer of the relationship, I used the [nested_form](https://github.com/ryanb/nested_form) gem, with some jQuery sprinkled on to enhance UX, which is the focus of this article. Because utilizing the gem in implementing more complex relationships wasn't very practical, the next article will be demonstrating how this can be done through pure jQuery.

Here's a summary of the relationships between events and sponsorship options. This article will only focus on just the association between Event and SponsorshipLevel.

```ruby
# app/models

class Event < ActiveRecord::Base
  has_many :sponsorship_levels
end

class SponsorshipLevel < ActiveRecord::Base
  belongs_to :event
  has_many :sponsorship_perks
  has_many :perks, through: :sponsorship_perks
end

class SponsorshipPerk < ActiveRecord::Base
  belongs_to :sponsorship_level
  belongs_to :perk
end

class Perk < ActiveRecord::Base
  has_many :sponsorship_perks
  has_many :sponsorship_levels, through: :sponsorship_perks
end
```

After fiddling around for a while with jQuery, I decided that it would be easier to translate the first association, Event `has_many :sponsorship_levels`, into a nested form through ryanb's [nested_form](https://github.com/ryanb/nested_form) gem. It's easy to use and even has support for [SimpleForm](https://github.com/plataformatec/simple_form) and [Formtastic](https://github.com/justinfrench/formtastic). The docs are also undeniably straightforward in guiding you through the installation and implementation process. Just be sure you:
1. Add `accepts_nested_attributes_for :sponsorship_levels` to the Event model
2. Permit `:_destroy` in your controller if you're using strong parameters in Rails 4+
3. Start you form with the `nested_form_for` helper

```ruby
# app/views/events/_form.html.erb

<%= nested_form_for([@organization, @event]) do |f| %>
  # various form fields here
  <div id="add-sponsorship-levels">
    <div id="sponsorship-levels-form">
      <%= f.fields_for(:sponsorship_levels) do |ff| %>
        <hr>
        <h4 class="subsection new-sponsorship-level">Sponsorship Level <span>1</span></h4>

        <%= ff.label :name %>
        <%= ff.text_field :name %>

        <%= ff.label :amount %>
        <%= ff.number_field :amount %>

        <%= ff.label :max_sponsorships, "Limit" %>
        <%= ff.number_field :max_sponsorships %>

        <div class="remove-sponsorship-level">
          <%= ff.link_to_remove do %>
  	        <button type="button">Remove sponsorship level</button>
          <% end %>
        </div>
      <% end %>
    </div>
    <hr>
    <div id="add-sponsorship-level">
      <%= f.link_to_add :sponsorship_levels, :data => { :target => "#sponsorship-levels-form" } do %>
        <button type="button">+ Add another sponsorship level</button>
      <% end %>
    </div>
  </div>
  # submit buttons here
<% end %>
```

`<%= f.fields_for :sponsorship_levels do |ff| %>` contains the nested fields for sponsorship levels. The nested_form gem provides the helpers `link_to_add` and `link_to_remove` so that users can add and remove entire form fields smoothly without refreshing the page, using jQuery. If you have a specific div you want the fields to be duplicated into, you can supply `link_to_add` with a "data-target" attribute that specifies the div id, shown above. Here are the resulting nested forms:

![Sponsorship Levels Form]({{ site.img_path }}{{ page.date | date: '%Y-%m-%d' }}/sponsorship-levels.png)

Don't forget to provide the nested attributes using strong parameters in the Events controller:

```ruby
def create_params
  params.require(:event)
    .permit(:name, :category, :venue, :address_line1, :address_line2, :city, :state, :zipcode, :country, :organization_id, :start_date, :end_date, :cost, :dress_code, :description, :thank_you_message, :notes, :start_time, :end_time, :time_zone, :cover, :online, :web_address, :max_attendees, :volunteers, :max_volunteers,
    sponsorship_levels_attributes: [:id, :name, :amount, :max_sponsorships, :corporate_only, :individual_only, :event_id, :_destroy]
  )
end
```

`:_destroy` is used so that removed fields will be set to `"_destroy"=>"1"` and fields not removed will be set to `"_destroy"=>"false"`. If you've added `reject_if: :all_blank` to your accepts_nested_attributes_for method, entirely blank fields will also not be saved to the database, but you can also prevent that through form validations. In addition, nested_form uses UNIX timestamps to uniquely identify each attribute object.

```ruby
"sponsorship_levels_attributes"=>
 {
  "0"=>
    {"name"=>"Cheeseburger", "amount"=>"1000", "max_sponsorships"=>"", "_destroy"=>"false"},
  "1509581295693"=>
    {"name"=>"Unwantedburger", "amount"=>"1300", "max_sponsorships"=>"", "_destroy"=>"1"},
  "1509581297853"=>
    {"name"=>"Double Cheeseburger", "amount"=>"2000", "max_sponsorships"=>"", "_destroy"=>"false"},
  "1509581299240"=>
    {"name"=>"Triple Cheeseburger", "amount"=>"3000", "max_sponsorships"=>"", "_destroy"=>"false"}
  }
```

There are two jQuery/JavaScript scripts that were used to improve user experience when interacting with the sponsorship levels forms. The first one hides the first remove button on the page so that the user cannot remove all sponsorship levels on the page:

```javascript
  $('.remove-sponsorship-level:first').hide();
```

The second script reorders the sponsorship level number (contained in `<span></span>`) when the user adds or removes fields. The nested_form gem provides some helpful custom events that are triggered when adding or removing fields:

```javascript
function reorderSponsorshipLevels() {
  $('#sponsorship-levels-form h4.subsection.new-sponsorship-level span:visible').each(function(index) {
    $(this).html(index + 1);
  });
};

$(document).on('nested:fieldAdded nested:fieldRemoved', function(event){
  reorderSponsorshipLevels();
});
```

The end result:
![Sponsorship Levels Form]({{ site.img_path }}{{ page.date | date: '%Y-%m-%d' }}/sponsorship-levels.gif)

For readability's sake, I've removed all Bootstrap classes and form validations, so your form may not look exactly the same. In Part II of this article, I'll be extending SponsorshipLevel by adding another layer of nested fields for SponsorshipPerk and Perk, and explaining how adding and removing nested fields can be done using jQuery.
