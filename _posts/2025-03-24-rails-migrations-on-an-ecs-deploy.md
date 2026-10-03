---
title: Running Rails migrations on an ECS deploy
date: 2025-03-24
summary: 'An entrypoint that migrates before Puma starts, what happens when five tasks try it at once, and how to drop a column without breaking the old tasks.'
topics: [Ruby and Rails, AWS]
---

A Rails app runs on ECS Fargate with five tasks. I wanted migrations to run on every deploy, finish before Puma starts, and cause no downtime.

The pattern I landed on is an entrypoint script. It migrates only when the container is about to start the web server, then hands off to the real command:

```sh
#!/bin/sh
set -e
if [ "$*" = "bundle exec puma -C config/puma.rb" ]; then
  bin/rails db:migrate
fi
exec "$@"
```

```dockerfile
ENTRYPOINT ["bin/docker-entrypoint"]
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

The `exec "$@"` matters, because Puma replaces the shell and gets signals from ECS directly. One-off commands, like a console through ECS Exec, skip the migration because their command doesn't match.

All five tasks run this script on a deploy. Rails takes a database advisory lock while it migrates, so the first task gets the lock. The others raise `ActiveRecord::ConcurrentMigrationError` and exit, and ECS restarts them after the migration is done. That works, but it's noisy. Running the migration once with `aws ecs run-task` before updating the service is cleaner.

The harder part is migrations that remove things. During a rolling deploy, old and new tasks run side by side against the new schema, so dropping a column the old code still uses breaks the old tasks. Removing the column from your code isn't enough either. Active Record caches the column list at boot, and with the Rails 7 defaults its INSERTs list every column. It takes three deploys:

1. Ignore the column with `self.ignored_columns += ["old_column"]`.
2. Drop it in a migration.
3. Delete the `ignored_columns` line.

Adding a column is safe in a single deploy.
