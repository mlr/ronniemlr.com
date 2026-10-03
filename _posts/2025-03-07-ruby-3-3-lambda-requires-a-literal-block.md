---
title: "Ruby 3.3: the lambda method requires a literal block"
date: 2025-03-07
summary: 'After an upgrade from Ruby 3.2 to 3.3, a gem that built its options with lambda raised ArgumentError. Stabby lambdas fixed it on both versions.'
topics: [Ruby and Rails]
---

I was moving a Rails app from Ruby 3.2.2 to 3.3.7. The app depends on an internal SOAP client gem, pinned to a git tag, and creating a client from it failed:

```
ArgumentError: the lambda method requires a literal block
```

The client's initializer passes a few lambdas as options, to convert request keys and response tags:

```ruby
convert_request_keys_to: lambda { |key| key_to_tag(key, wsdl_url) },
convert_tags_to:         lambda { |tag| MySDK.snakecase(tag).to_sym },
```

Ruby 3.3 made `lambda` raise when it gets a block that isn't written right there at the call, for example one passed along with `&block`. Ruby had warned about that since 3.0. These lambdas look literal, so something between this code and `Kernel#lambda` must be passing the block along. I didn't chase down exactly what.

The stabby form avoids the question. `->` is syntax, not a method call, so nothing can intercept it:

```ruby
convert_request_keys_to: ->(key) { key_to_tag(key, wsdl_url) },
convert_tags_to:         ->(tag) { MySDK.snakecase(tag).to_sym },
```

I checked that it behaves the same on 3.2, changed all three lambdas in the gem, cut a new tag, and pointed the app at it. A `proc` would also get past the error, but procs treat arguments and `return` differently, so the stabby lambda is the safe swap.
