---
layout: post
title:  "My First CLI Gem - Discover Tokyo!"
date:   2016-10-21 22:03:28 -0400
---


[Tokyo-events](https://github.com/auranbuckles/tokyo-events-cli-gem) is a Ruby gem that scrapes data from [GoTokyo.org]( http://gotokyo.org/en/index.html), a prominent Tokyo travel guide, and returns to the user information about current and upcoming events in Tokyo. The gem follows an object-oriented design pattern that is utilized in managing the data and building an interactive platform for the user. The scraping is done through [Nokogiri](https://github.com/sparklemotion/nokogiri), which provides developers with the ability to parse and search web documents via XPath or CSS3 selectors.

Since the data is used to create manipulable objects through class and instance methods, users of the gem can view detailed information about specific events – they are searchable by index number or keywords. Each event, as a class and object, has name, date(s), location, link, and description attributes. Tokyo-events has the potential to be able to scrape other websites and expand its search functions in the future, providing a centralized, convenient tool for locals and tourists in search of fun adventures in Tokyo.

![tokyo-events](/img/tokyo-events-gem.png)

The most valuable lesson I learned from this project wasn’t the object-oriented structuring, data scraping, or even the meticulous Ruby programming logic needed here and there. I’ve been preparing for all that by learning the individual components of a CLI application or gem – method scope, loops, arrays and hashes, iterations, Regex... What I haven't been focusing on was how they come together to form a coherent, well-organized application. More importantly, the application's workflow should be clean, making clear distinctions between the different roles of the classes, methods, and code that "runs" the application. Through this project, I was able to experience first-handedly, as a developer, what it really means to be a gem and [how gems work](http://www.justinweiss.com/articles/how-do-gems-work/):

The lib/ directory is responsible for containing and delivering the "logic" of the gem (classes, methods, and the version module), and the bin/ directory is responsible for providing a console for debugging and running the CLI class `TokyoEvents::CLI`. Rakefile is used by [Rake]( https://github.com/ruby/rake) to automate testing and provides simplified commands for developers to generate code. The gem specification file (Gemspec), in conjunction with the gem command, is used to create the actual gem. Break or miss a single connection, and everything falls apart, making this an integral part of building an application.

The most challenging part of the project, however, was scraping the data. Tedious might be the better adjective. I started off with a different target website that displayed upcoming events in Japan, a website higher-ranked in Google’s search results. It was heartbreaking to abandon the code I spent hours writing, but ultimately, the untidiness of the event information and HTML/CSS structure of the webpage forced me to eventually bid farewell to the site. Specifically, most of the attributes of the  information (dates and locations of the events, for example) weren’t in well-defined divs, IDs, or classes.

As a result, an overwhelming amount of regex and gsub was used to obtain and arrange the information into different class attributes in the application. The code became too overwhelming in order to consider the various date and address formats. On the other hand, I also learned from this frustrating experience what NOT to do when constructing a website, and it gave me ideas on how I could improve on the things I've built. I've learned to add more classes and IDs in defining and categorizing the different areas of my HTML code, as well as a wider variety of tags such as `<section>` and `<article>`. Below is the scraper method I wrote for the first site. I hope you don't ever have to write a scraper method like this, and if you do, please learn about the `.strip` Ruby method first.

```
def self.scrape_events
	doc = Nokogiri::HTML(open("#"))

	events = {}
	doc.css("tr").each_with_index do |event, index|
		if index != 0
			event.css("td").each_with_index do |info, index|
				if index == 1
					events[:name] = info.css("strong").text
					if info.text.match(/\d+\/\d+\/\d+/)
						start_end_dates = info.text.scan(/\d+\/\d+\/\d+/)
						events[:dates] = start_end_dates.join(" - ")
					elsif info.text.match(/January|February|March|April|May|June|July|August|September|October|November|December/)
						start_end_dates = info.text.scan(/January\s\d+.{2}|February\s\d+.{2}|March\s\d+.{2}|April\s\d+.{2}|May\s\d+.{2}|June\s\d+.{2}|July\s\d+.{2}|August\s\d+.{2}|September\s\d+.{2}|October\s\d+.{2}|November\s\d+.{2}|December\s\d+.{2}/)
						events[:dates] = start_end_dates.join(" - ")
					end

					events[:url] = info.css("a").attribute("href").value
				elsif index == 2
					events[:location] = info.css("a").text.gsub(/\s+/, "")
				end
			end
		end
	end

	events
end
```

Overall, I gained a better understanding of the anatomy and flow of an object-oriented application. In particular, I strengthened my knowledge on concepts such as class vs. instance methods, the separation of code that have different responsibilities, the instantiation of objects, and the importance of keeping the end-user in mind while constructing an application's output. I look forward to growing as a Ruby/Rails developer and contributing to the incredible community.

