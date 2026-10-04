---
title: A time on a date column moved the month
date: 2026-10-01
summary: 'The September calendar in my invoicing app showed October 1 entries on September 1. A month range built from a zone-aware time was compared to a date column in UTC. The audit after it found Time.zone leaking between requests.'
topics: [Ruby and Rails]
---

I had just added a per-user time zone setting to my invoicing app. Its timesheet page shows a month calendar of time entries. The day after, the September calendar showed October 1 entries on September 1. Clicking that day said "No hours logged", and the real September 1 entries weren't there.

The entries have a `performed_on` column, which is a date. The calendar built its range from a time in the user's zone:

```ruby
recorded_between(date.beginning_of_month, date.end_of_month)
```

`date` was a `TimeWithZone` there, so the range was two times, not two dates. Rails converts a `TimeWithZone` to UTC before it compares it with a column. For a user west of UTC, the end of September 30 in their zone is already October 1 in UTC, so the range covered the wrong days. Passing plain dates fixed it:

```ruby
recorded_between(date.to_date.beginning_of_month, date.to_date.end_of_month)
```

A new request spec failed before the change and passed after it.

Then I looked at how the app set the zone, and found a second bug. A `before_action` did `Time.zone = current_user.time_zone`. `Time.zone` is stored per thread, and Puma reuses threads, so the zone stayed set after the request, and the next request on that thread started with the previous user's zone. `Time.use_zone` sets it for the block and puts it back after:

```ruby
around_action :use_user_zone

def use_user_zone(&block)
  Time.use_zone(current_user&.time_zone || "Pacific Time (US & Canada)", &block)
end
```

The same audit found two other places the setting didn't reach. The client portal controller doesn't inherit from `ApplicationController`, so it now uses the account owner's zone. The cron jobs used the server's date, so they now wrap each user's work in `Time.use_zone`. A spec that checks the zone is reset after a request failed before the change. After it, all 607 examples passed.

Earlier this year I fixed [the test-suite version of this problem](/2026/03/23/time-local-does-not-know-the-rails-zone/) in another app.
