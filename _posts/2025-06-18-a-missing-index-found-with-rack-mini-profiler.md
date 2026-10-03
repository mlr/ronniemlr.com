---
title: A missing index, found with rack-mini-profiler
date: 2025-06-18
summary: 'One page spent seconds in a single query. EXPLAIN showed a join table read through its deleted_at index. A composite index made that query about 50 times faster.'
topics: [Databases, Ruby and Rails]
---

A page in a Rails app on MySQL 8 was very slow. I added rack-mini-profiler, loaded the page, and one SQL query stood out, at about five seconds on its own.

`EXPLAIN` on that query pointed at one join table, a soft-deleted table with a `deleted_at` column:

- `key` was the `deleted_at` index.
- `rows` was in the thousands.
- `filtered` was 1%.

MySQL was reading thousands of rows through the only index that partly fit, then throwing 99% of them away. `SHOW INDEXES` confirmed it. The table had its primary key, one foreign key index, and `deleted_at`. No index covered the column the query joined on together with the column it filtered on.

```ruby
class AddItemTagsLookupIndex < ActiveRecord::Migration[7.1]
  def change
    add_index :item_tags, [:item_id, :tag_id, :deleted_at, :rank],
              name: "idx_item_tags_lookup"
  end
end
```

The column order matters. The join column comes first, then the filter column, then `deleted_at`. The sort column goes last, so the index covers the whole query. After the migration, `EXPLAIN` showed the new index reading one row, and the query dropped from about five seconds to under 100 milliseconds. A smaller lookup that ran over a hundred times per page got the same treatment.

rack-mini-profiler also lists a lot of repeats marked `CACHE`, which is the Rails per-request query cache. Those cost Ruby object work but no database time, so they matter less than the list makes them look.
