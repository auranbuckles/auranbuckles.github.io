---
layout: post
title: Creating Dynamic Nested Forms in Rails with jQuery - Part II
date: 2018-01-22
---

Gems like [cocoon](https://github.com/nathanvda/cocoon) and [nested_form](https://github.com/ryanb/nested_form) make nested forms an easy cake in Rails, but not everyone prefers to pile on gems in their projects. Whether it's because of dependencies issues down the line, or whether it's the lack of control, you might want to build nested forms the old-fashion vanilla way. For me, it was because the nested_form gem just wasn't producing the exact outcome I was looking for. Creating user-friendly, dynamic forms can get tricky, especially when relationships are complex. But even if you end up using gems, hopefully this article still sheds some light on how they operate behind the scenes.

In this project, Event has_many sponsorship_levels, and SponsorshipLevel has_many perks through sponsorship_perks. In my [previous article]({% post_url 2017-10-28-creating-dynamic-nested-forms-in-rails-with-jquery-part-i %}), I implemented a nested form between Event and SponsorshipLevel using the nested_form gem. To go another level deep into sponsorship_perks and perks -- all in the same form -- I will be using purely jQuery to create the Perks section of the form.

![Sponsorship Levels Form]({{ site.img_path }}{{ page.date | date: '%Y-%m-%d' }}/sponsorship-levels.gif)

As mentioned in the [last article]({% post_url 2017-10-28-creating-dynamic-nested-forms-in-rails-with-jquery-part-i %}), make sure your models are all set for accepting nested attributes:
First, define relationships and add `accepts_nested_attributes_for :sponsorship_perks` to the Event model

```ruby
# app/models/sponsorship_level.rb
class SponsorshipLevel < ActiveRecord::Base
  belongs_to :event
  has_many :sponsorship_perks
  has_many :perks, through: :sponsorship_perks

  accepts_nested_attributes_for :sponsorship_perks, reject_if: :all_blank, allow_destroy: true
end
```

Then, make sure you've permitted all the attributes you need using strong parameters, and create the nested form using `fields_for`. I excluded the parts already mentioned in the [previous article]({% post_url 2017-10-28-creating-dynamic-nested-forms-in-rails-with-jquery-part-i %}) as we're focusing on just the perks section.

```ruby
<div id="add-sponsorship-levels" class="add-fields">
  <div id="sponsorship-levels-form" class="fields-form">
    <%= f.fields_for(:sponsorship_levels, @event.sponsorship_levels.build, html: { class: "form-horizontal sponsorshipLevelsForm" }) do |ff| %>
      <!-- fields for sponsorship levels -->

      <!-- sponsorship perks form -->
      <div class="new-perks">
        <div class="new-perks-container">
          <div class="new-perk">
            <h4 class="sub subsection">Perk <span>1</span></h4>
            <%= ff.fields_for(:sponsorship_perks, @event.sponsorship_levels.build.sponsorship_perks.build, html: { class: "form-horizontal sponsorshipPerksForm" }) do |fff| %>
              <%= fff.fields_for(:perk, @event.sponsorship_levels.build.sponsorship_perks.build.build_perk, html: { class: "form-horizontal PerksForm" }) do |ffff| %>
                <div class="form-group">
                  <%= ffff.label :description, "Brief Description", class: "control-label col-sm-4 required" %>
                  <div class="col-sm-6">
                    <%= ffff.text_field :description, class: "form-control", required: true, maxlength: 140, placeholder: "e.g., Logo printed on the back of our t-shirts" %>
                  </div>
                </div>

                <div class="form-group">
                  <%= ffff.label :details, class: "control-label col-sm-4" %>
                  <div class="col-sm-6">
                    <%= ffff.text_area :details, class: "form-control", rows: "6", maxlength: 600, placeholder: "e.g., Your brand name and logo will be printed on the back on our t-shirts for this fundraiser, which will be sold and distributed at the booths." %>
                  </div>
                </div>
              <% end %>
            <% end %>
          </div>
        </div>
        <div class="col-sm-offset-4">
          <button class="btn btn-subtle btn-xs add-another-perk" type="button" onclick="addPerkFields(this)">+ Add another perk</button>
        </div>
      </div>

      <!-- buttons to add and remove sponsorship levels -->
```

Rails convention requires parameters to be structured in a way to allow Rails to identify which attributes belong to which model or object to be created. Each set of attributes that belong to a model must have a unique identifier, like this given our `has_many :through` relationship between the 3 models:

```ruby
"sponsorship_levels_attributes"=>
 {"0"=>
   {"name"=>"Gold",
    "amount"=>"3000"
    "sponsorship_perks_attributes"=>
     {"0"=>
       {"perk_attributes"=>
         {"description"=>
           "Logo placement on our homepage and products pages for one year",
          "details"=>
           "Your logo will be placed as a sponsor on our homepage and products pages for one year."}},
      "001"=>
       {"perk_attributes"=>
         {"description"=>
           "Brand featured on a banner during event",
          "details"=>
           "Your brand will be featured on a banner during our event, and we'll give you a shout out!"}},
      "002"=>
       {"perk_attributes"=>
         {"description"=>"Social media promotion",
          "details"=>
           "We'll post about your brand and sponsorship on our Facebook and Twitter pages."}}}}
```

This unique identifiers derive from the `name=` and `id=` of the form field, so we want to make sure that each name and id is unique, and that the forms fields that belong to the same model have the same identifier in their names and ids. The most common way is to use UNIX timestamps. For example, `name="event[sponsorship_levels_attributes][0][sponsorship_perks_attributes][1520268053750][perk_attributes][details]"` and `id="event_sponsorship_levels_attributes_0_sponsorship_perks_attributes_1520268053750_perk_attributes_details"`.

Below is the function used to (1) duplicate the form fields needed using `clone()`, (2) get the current time using `new Date()` and `getTime()`, and (3) rearrange the numbering of the added or removed fields to correspond to the visible order on the page. It is triggered when the user clicks on the "Add another perk" button.

```javascript
function addPerkFields(element) {
  // get parent container div and sponsorship level ID
  var parentSponsorship = $(element).closest('#sponsorship-levels-form .fields');
  // event_sponsorship_levels_attributes_0_name
  var levelId = parentSponsorship.find('input:first').attr('id').replace('event_sponsorship_levels_attributes_', '').replace('_name', '');

  // create Date object
  var date = new Date();
  // get UNIX timestamp and use it for address key
  var mSec = date.getTime();

  // replace 0 with timestamp
  descriptionIdAttribute = "event_sponsorship_levels_attributes_[level]_sponsorship_perks_attributes_[perk]_perk_attributes_description".replace("[level]", levelId).replace("[perk]", mSec);
  descriptionNameAttribute = "event[sponsorship_levels_attributes][level_num][sponsorship_perks_attributes][perk_num][perk_attributes][description]".replace("level_num", levelId).replace("perk_num", mSec);
  detailsIdAttribute = "event_sponsorship_levels_attributes_[level]_sponsorship_perks_attributes_[perk]_perk_attributes_details".replace("[level]", levelId).replace("[perk]", mSec);
  detailsNameAttribute = "event[sponsorship_levels_attributes][level_num][sponsorship_perks_attributes][perk_num][perk_attributes][details]".replace("level_num", levelId).replace("perk_num", mSec);

  var newdiv = $(".new-perk:first").clone();

  // apply timestamps to form fields and append to form
  $.each(newdiv.find(":input"), function() {
    if ($(this).attr('id').includes('description')) {
      $(this).attr('id', descriptionIdAttribute);
      $(this).attr('name', descriptionNameAttribute);
    } else if ($(this).attr('id').includes('details')) {
      $(this).attr('id', detailsIdAttribute);
      $(this).attr('name', detailsNameAttribute);
    }
    $(this).val('');
  });
  var parentPerks = element.closest(".new-perks");
  $(parentPerks).find(".new-perks-container").append(newdiv);

  // add remove button to all perks except first
  if ($(parentSponsorship).find('.new-perk').length > 1) {
    newdiv.append("<div class='remove-perk'><button class='btn btn-danger btn-xs col-sm-offset-4' type='button' onclick='removePerk(this)'>Remove perk</button></div>");
  }

  // number order of perks
  $(parentSponsorship).find('.new-perk h4.subsection span:visible').each(function(index) {
    $(this).html(index + 1);
  });
};
```

When the user clicks on "Remove perk", it simply removes the corresponding fields and visually reorders the perk fields.

```javascript
function removePerk(element) {
  var parentSponsorship = $(element).closest('#sponsorship-levels-form .fields');
  $(element).closest('.new-perk').remove();
  // number order of perks
  $(parentSponsorship).find('.new-perk h4.subsection span:visible').each(function(index) {
    $(this).html(index + 1);
  });
}
```

The output parameters will have this structure:

```ruby
"sponsorship_levels_attributes"=>
 {"0"=>
   {"name"=>"Gold",
    "amount"=>"3000",
    "max_sponsorships"=>"",
    "_destroy"=>"false",
    "sponsorship_perks_attributes"=>
     {"0"=>
       {"perk_attributes"=>
         {"description"=>
           "Logo placement on our homepage and products pages for one year",
          "details"=>
           "Your logo will be placed as a sponsor on our homepage and products pages for one year."}},
      "1520268053750"=>
       {"perk_attributes"=>
         {"description"=>
           "Brand featured on a banner during event",
          "details"=>
           "Your brand will be featured on a banner during our event, and we'll give you a shout out!"}},
      "1520268107993"=>
       {"perk_attributes"=>
         {"description"=>"Social media promotion",
          "details"=>
           "We'll post about your brand and sponsorship on our Facebook and Twitter pages."}}}}
```
