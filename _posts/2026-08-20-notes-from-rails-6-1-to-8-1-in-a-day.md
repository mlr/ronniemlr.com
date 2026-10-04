---
title: Notes from Rails 6.1 to 8.1 in a day
date: 2026-08-20
summary: 'I moved my invoicing app from Rails 6.1 and Ruby 3.1 to Rails 8.1 and Ruby 3.4 in one day. Four things broke: the JavaScript compressor, a Docker image, a =~ call, and a PDF template.'
topics: [Ruby and Rails, Docker and CI]
---

My invoicing app was on Rails 6.1 and Ruby 3.1. I meant to move it to Rails 7.0 and Ruby 3.4, and it went well enough that I kept going to 8.1 the same day. Production deploys with Capistrano, and development runs in Docker on Alpine. These are the four things that broke.

**Uglifier couldn't read the new JavaScript.** On Rails 7.0, asset precompile failed:

```
Uglifier::Error: Unexpected token: keyword (const). To use ES6 syntax, harmony mode must be enabled with Uglifier.new(:harmony => true).
```

Rails 7.0's Active Storage JavaScript uses `const` and `class`. Harmony mode got past that, but on Rails 7.1 precompile failed again with an empty `Uglifier::Error`. The 7.1 JavaScript uses `?.`, `??`, and `||=`, and Uglifier's harmony mode can't parse any of them. Terser can:

```ruby
gem 'terser'
config.assets.js_compressor = :terser
```

That deployed cleanly, even with the old Node on the server. Skip harmony mode and go straight to terser.

**The Docker image built but wouldn't boot.** `rails db:prepare` failed with an OpenSSL `LoadError`. The Dockerfile copies `libssl` and `libcrypto` from a wkhtmltopdf image into the Ruby image, so PDF generation works on Alpine. The Ruby image's tag had moved to a newer Alpine release than the wkhtmltopdf image, so the copied libraries didn't match the rest of the system. Pinning both to the same release fixed it:

```dockerfile
FROM surnet/alpine-wkhtmltopdf:3.23.4-0.12.6-small AS wkhtmltopdf
FROM ruby:3.4.10-alpine3.23
```

If one stage copies shared libraries from another, pin both to the same release.

**`=~` on an Integer.** Specs failed with `undefined method '=~' for an instance of Integer`. Ruby 3.2 removed `Object#=~`, so it only works on strings, regexps, and nil now. A setter got an Integer from parsed JSON and called `=~` on it. A type check fixed it:

```ruby
if string.is_a?(String) && string.include?(":")
```

**The PDF template had a format in its name.** In production, Download PDF returned 500 with `ActionView::MissingTemplate`. The controller rendered `template: "invoices/download.pdf"`. Rails 6.1 removed the `.pdf` and found `download.pdf.erb`. Rails 7 keeps it and looks for `download.pdf.pdf.erb`. Removing the suffix fixed it, and production returned 200 with `application/pdf`. A request spec that downloads the PDF catches this kind of change before it ships.
