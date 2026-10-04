---
title: The relation ran after the block ended
date: 2026-05-01
summary: 'An admin page that turned off tenant scoping still showed blank rows for other tenants. The query was built inside ActsAsTenant.without_tenant but ran later, in the view, with the tenant back on.'
topics: [Ruby and Rails]
---

A Rails app uses the acts_as_tenant gem, so every request runs with a current tenant and tenant-scoped models filter by it. I was building a super-admin dashboard that shows rows from every tenant. Rows from other tenants came out with a blank organization and no View button.

My first try put the whole request inside `ActsAsTenant.without_tenant` with an `around_action`. That broke the layout, which uses the current tenant's name:

```
ActionView::Template::Error: undefined method `name' for nil
```

So I wrapped only the lookups in the controller:

```ruby
without_tenant do
  @rows = Row.where(id: ids).includes(parent: :organization)
end
```

The totals on the page were right after that, but the rows were still blank. `@rows` is a lazy relation. Building it inside the block doesn't run it. It ran in the view, when the template first called `each`, and by then the block had ended and the tenant was back. The preload of the tenant-scoped parent records ran with the tenant filter on, so every parent from another tenant came back nil.

Loading the relation inside the block fixed it:

```ruby
without_tenant do
  @rows = Row.where(id: ids).includes(parent: :organization).to_a
end
```

`.load` works too. Any relation that has to run outside the current tenant needs to load before the block ends, so it's worth checking the other instance variables the view reads.
