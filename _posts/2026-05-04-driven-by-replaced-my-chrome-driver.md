---
title: driven_by replaced my Chrome driver
date: 2026-05-04
summary: 'System tests failed with "user data directory is already in use", and adding a unique --user-data-dir changed nothing. rspec-rails was registering its own :selenium driver, so my options never ran.'
topics: [Ruby and Rails, Docker and CI]
---

I changed a public booking form in an older Rails app and needed its browser system tests to pass in the Docker dev container. Every system spec failed at the first `visit`:

```
Selenium::WebDriver::Error::SessionNotCreatedError: session not created: probably user data directory is already in use, please specify a unique value for --user-data-dir argument, or don't use --user-data-dir
```

The setup was Chromium and ChromeDriver from Alpine packages, selenium-webdriver 4.24, rspec-rails 4, and Rails 6.0. `spec_helper.rb` registered the driver with Capybara:

```ruby
Capybara.register_driver :selenium do |app|
  Capybara::Selenium::Driver.new(app, browser: :chrome)
end
```

Running one spec alone gave the same error. Adding a unique `--user-data-dir` to that block also gave the same error, which was the clue. The options weren't reaching Chrome at all.

rspec-rails calls `driven_by(:selenium)` for system specs, and `driven_by` registers its own `:selenium` driver. It replaced my `register_driver` block without a warning, so nothing I put in the block ran. Setting the driver with `driven_by` in a hook for system specs worked:

```ruby
config.before(:each, type: :system) do
  driven_by :selenium, using: :headless_chrome do |options|
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--user-data-dir=#{Dir.mktmpdir}")
  end
end
```

The spec file passed, 8 examples with 0 failures, and so did the controller specs with it.

Don't trust the "user data directory" message too much. ChromeDriver shows it when Chrome fails to start for other reasons too, like running as root without `--no-sandbox`, or a non-headless Chrome with no display. Whatever Chrome needs in your container, the options only take effect when they go through `driven_by`.
