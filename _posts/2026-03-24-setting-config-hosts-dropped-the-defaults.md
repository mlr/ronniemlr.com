---
title: Setting config.hosts dropped the defaults
date: 2026-03-24
summary: 'A Node service on my Mac got "Blocked host" from a local Rails app, and two months later almost every system test in CI got a 403. Both came from one config.hosts assignment that replaced the Rails defaults.'
topics: [Ruby and Rails, Docker and CI]
---

In January I built a small Node service that calls a Rails app's JSON API, and ran both on my Mac. The Rails app answered with its "Blocked host" page:

```
Blocked host: localhost
```

The app sets `config.hosts` in `config/application.rb`, for every environment, from its own list: a production pattern, a `*.localhost` pattern for development, and a few test hosts. In development, Rails 6.1 normally allows `.localhost` and any IP address. Assigning `config.hosts` replaces those defaults, so only the list was allowed.

So I tried the app's `.localhost` name, and Node's fetch failed with `fetch failed`. Browsers resolve `*.localhost` names to the loopback address on their own, but macOS name lookup doesn't, so Node couldn't find the host. Then I tried `127.0.0.1` with a `Host` header set to the allowed name, and it was blocked again. Host authorization reads the `Host` header, but Node's built-in fetch doesn't let you override that header and sent `127.0.0.1:<port>`. Adding `127.0.0.1` to the development list fixed it.

In March I set up CI for the same app in GitHub Actions, with Selenium Chrome in a container. 271 of 272 JavaScript system tests failed, and Chrome logged a 403 for every page. The tests reached the app at the runner's `10.x` address, and that wasn't in the test list either. Adding the private range fixed the 403s:

```ruby
# config/application.rb
allowed_hosts << "127.0.0.1"              if Rails.env.development?
allowed_hosts << IPAddr.new("10.0.0.0/8") if Rails.env.test?
config.hosts = allowed_hosts
```

In test, the 403 page is empty, but Rails writes `Blocked host: <host>` to `log/test.log`, so that log is the first place to look. Setting `config.hosts` only in `production.rb` keeps the development and test defaults in place.
