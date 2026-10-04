---
title: A hash without braces became keyword arguments
date: 2026-06-30
summary: 'A Sidekiq job failed with "wrong number of arguments (given 0, expected 1)" on a rare path. In Ruby 3, a braceless hash passed to a method with keyword parameters goes to the keywords.'
topics: [Ruby and Rails]
---

A Rails app started adding a signed unsubscribe link to some customer emails. I booked a few test appointments on an account that gets those emails, and none of the emails arrived. Sidekiq was retrying the job with this:

```
ArgumentError: wrong number of arguments (given 0, expected 1)
```

The backtrace pointed at the helper that builds the unsubscribe token. The code passed `ruby -c` and every other path through the mailer, and only this kind of account ever reached it:

```ruby
verifier.generate('o' => org_id, 'e' => email)
```

`ActiveSupport::MessageVerifier#generate` takes one positional argument, the value, plus keyword arguments like `expires_in:` and `purpose:`. In Ruby 3, when a method has keyword parameters, a hash at the end of the call without braces goes to the keywords. That's true even with string keys. So the whole hash went to the keywords, and `value` got nothing. Braces make it one positional argument:

```ruby
verifier.generate({ 'o' => org_id, 'e' => email })
```

A runner script showed the token now round-trips:

```
{"o"=>42, "e"=>"test@example.com"}
```

After the deploy to staging, the emails arrived.

Ruby 2.7 warned about this case, and Ruby 3 made it an error. Code like this passes a syntax check and fails only when that line runs, so a spec that builds the token, or a review rule for braceless hashes in calls to methods that take keywords, catches it earlier.
