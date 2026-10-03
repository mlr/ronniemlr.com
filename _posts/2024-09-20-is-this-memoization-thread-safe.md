---
title: Is this memoization thread safe?
date: 2024-09-20
summary: 'A spec with two threads on two records can never catch a race in instance variable memoization. Each record has its own instance variable.'
topics: [Ruby and Rails]
---

A Rails model had a method that finds a related user, either through a parent record or through the record itself. It saves the result in an instance variable, so repeated calls in the same request don't query again:

```ruby
def owner
  unless defined?(@owner)
    source = parent_record || self
    @owner = source.account&.user if source.respond_to?(:account)
  end
  @owner
end
```

Someone asked if this was thread safe, and if one request's value could show up in another request.

My first spec ran two threads at the same time, each calling `owner` on a different record, and checked that each got its own user. That spec can never fail, because `@owner` lives on one object. Two records have two separate `@owner`s, so the threads have nothing to share.

A race needs one object shared across threads. In a Rails app that mostly doesn't happen, because each request loads its own records. Even when it does, the worst case for this method is that two threads both compute the value and one write wins. Both computed the same thing, so you get duplicate work, not a wrong answer.

A mutex isn't needed here. The first advice I got was to wrap the method in one, which adds a lock to every call for a race that can't happen.

`||=` versus `defined?` doesn't change any of this. The only difference is `nil`. `||=` computes a `nil` result again on every call, and `defined?` keeps it once the variable is assigned.
