---
title: Two places MySQL wants another layer
date: 2026-08-31
summary: 'A UNION of queries with LIMIT failed with a syntax error, and a DELETE that read its own table failed with ERROR 1093. MySQL wanted parentheses around the first and a derived table inside the second.'
topics: [Databases]
---

I ran into two MySQL syntax rules this year, months apart, and both times the fix was to wrap something.

In February I made a slow phone-number search faster. The query had an `OR` across columns, so I split it into one indexed query per column and joined them with `UNION`. Each part had `.limit(500)`, and the combined SQL failed:

```
Mysql2::Error: You have an error in your SQL syntax; ... near 'UNION SELECT DISTINCT customers.* FROM customers LEFT OUTER JOIN ...'
```

In MySQL, a part of a `UNION` that has its own `LIMIT` or `ORDER BY` has to be in parentheses. I built the SQL from `to_sql` strings, so the fix was one line:

```ruby
union_sql = parts.map { |q| "(#{q})" }.join(' UNION ')
```

In August I had to delete a batch of bad rows from a table, chosen by a query on the same table:

```sql
DELETE FROM notifications WHERE id IN (
  SELECT id FROM notifications WHERE <filter> ORDER BY id LIMIT 26
);
```

That fails twice over. MySQL doesn't allow `LIMIT` in an `IN` subquery, and it doesn't let a `DELETE` read the table it's changing in a subquery:

```
ERROR 1093 (HY000): You can't specify target table 'notifications' for update in FROM clause
```

The usual workaround is one more layer. A derived table makes MySQL build the list of ids first, and the `LIMIT` is fine in there:

```sql
DELETE FROM notifications WHERE id IN (
  SELECT id FROM (
    SELECT id FROM notifications WHERE <filter> ORDER BY id LIMIT 26
  ) AS ids
);
```

Run the inner `SELECT` alone first to see what you'll delete. And keep the `ORDER BY`, since a `LIMIT` without it picks whichever rows MySQL finds first.
