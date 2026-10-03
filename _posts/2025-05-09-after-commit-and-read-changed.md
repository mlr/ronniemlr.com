---
title: after_commit and read_changed? never fire together
date: 2025-05-09
summary: 'A callback guarded by read_changed? never ran, because the change is already saved when after_commit fires. Use saved_change_to_read? instead.'
topics: [Ruby and Rails]
---

A model sends a notification after it's saved. It should go out when the record is created, and again when its `read` flag changes. This callback never fired:

```ruby
after_commit :notify_user, if: :read_changed?
```

By the time `after_commit` runs, the change has been saved, and `read_changed?` only tracks changes that haven't been saved yet. In an after callback it's always false. The saved-change version is the one to use there:

```ruby
after_commit :notify_user, if: -> { previously_new_record? || saved_change_to_read? }
```

`previously_new_record?` covers the create case. It needs Rails 6.1 or later.

One version I was handed split this into two callbacks with the same method:

```ruby
after_commit :notify_user, on: :create
after_commit :notify_user, if: :saved_change_to_read?
```

That looks fine, but Rails keeps only the last callback registered for a given method name, so the create callback silently disappears. Combine the conditions into one callback, as above, or give the two callbacks different method names.
