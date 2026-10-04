---
title: CONVERT TO runs after MODIFY
date: 2026-08-26
summary: 'An emoji from speech-to-text broke a job that saved captions to a utf8mb3 table. Converting to utf8mb4 turned every TEXT column into MEDIUMTEXT, even with a MODIFY in the same ALTER.'
topics: [Databases, Ruby and Rails]
---

A background job saves captions for uploaded videos. One speech-to-text result had a thumbs-up emoji in it, and the job failed with a `Mysql2::Error`. The app's `database.yml` said utf8mb4, but the older tables were still utf8mb3, which can't store 4-byte characters like emoji.

The fix is to convert the tables to utf8mb4. The first migration did it with `CONVERT TO`:

```sql
ALTER TABLE t CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

The schema diff showed every TEXT column in those tables turned into MEDIUMTEXT. MySQL does that on purpose. A TEXT column holds 65,535 bytes, and utf8mb4 needs up to 4 bytes per character, so `CONVERT TO` promotes TEXT columns to keep the same number of characters.

An older migration in the repo put a `MODIFY` in the same `ALTER` to keep the type:

```sql
ALTER TABLE t CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  MODIFY COLUMN body TEXT;
```

On MySQL 8.0.36 the columns were still promoted. MySQL applied the `CONVERT TO` after the `MODIFY`. Two separate statements worked:

```ruby
execute "ALTER TABLE `t` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
execute "ALTER TABLE `t` MODIFY COLUMN `body` text"
```

After that, the schema diff showed only the charset changes. Inserting the emoji's bytes as hex (`F09F918D`) and reading them back worked, and staging showed the captions column as `text utf8mb4`.

`MODIFY` replaces the whole column definition, so it needs any `NOT NULL`, `DEFAULT`, or `COMMENT` the column had. And a TEXT column now holds fewer characters than before when they're 4-byte characters.
