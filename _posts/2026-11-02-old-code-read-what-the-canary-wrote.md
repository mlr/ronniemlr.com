---
title: Old code read what the canary wrote
date: 2026-11-02
summary: 'A branch ran against shared databases and queues before it merged. Its jobs, its mailer, and one new STI row reached code on main that had never heard of those classes.'
topics: [Ruby and Rails, Docker and CI]
---

A client's Rails app has two ways to try a branch before it merges. A PR preview runs the branch against the staging database. A canary runs the branch's web code as one extra task against the production database and Redis, next to the regular tasks and workers, which run `main`. A feature branch of mine added a new kind of user, an STI subclass of `User`, plus some Sidekiq jobs and a mailer. In one week it broke old code three times.

The first one I saw coming. A delayed job queued from the canary would run on a production worker, and that worker had no `AgentRunWorker` class. Then approval emails never arrived. Production Sidekiq had six jobs failing and retrying:

```
ActionMailer::MailDeliveryJob ... uninitialized constant AgentApprovalMailer
```

`deliver_later` puts the job on the app's shared mailer queue, and any worker on that queue can take it. The production workers run `main`, so they couldn't load the mailer, and Sidekiq would have kept retrying the `NameError` for weeks.

The new jobs got their own queue, and the canary task got an extra worker container that listens only to it. After the merge, the normal workers listen to it too. A spec checks that every new worker uses that queue.

```ruby
class AgentRunWorker
  include Sidekiq::Worker
  sidekiq_options queue: "agent", retry: 3
end

AgentApprovalMailer.requested(approval, email).deliver_later(queue: "agent")
```

The third one was a row. Staging returned a 500 on every page for some admins, right after sign-in:

```
ActionView::Template::Error: The single-table inheritance mechanism failed to locate the
subclass: 'AgentAccount'. This error is raised because the column 'type' is reserved for
storing the class in case of inheritance. ...
Location: app/views/layouts/application.html.erb:140
```

The preview had created one `AgentAccount` user in the shared staging database, and staging runs `main`. Line 140 of the layout is a "switch user" menu that loads every user of the current account. So every page for an admin of that account tried to build that row and failed. The canary had made the same kind of row in production two days earlier, and the logs there had 13 of these errors, all on internal admin pages.

The fix was to ship the class before the feature. A small PR put a bare subclass on `main`:

```ruby
class AgentAccount < User
  def send_reset_password_instructions
    false
  end
end
```

When the feature branch later merged `main`, the conflict on that file went to the branch's full class.

Staging loaded the dashboard with the login that had failed. In production, the last STI error in the log was at 20:20:04 UTC, before the new tasks started, and there were none after. The canary task showed the new worker container picking up jobs.

A shared database or queue keeps what a branch wrote after the branch's code is gone. When a branch writes a new class name into a row or a job, code that doesn't know that class reads it later. Either the old code learns the class first, or the work has to stay where only the new code can reach it.
