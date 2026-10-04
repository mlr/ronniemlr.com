---
title: Time.local doesn't know the Rails zone
date: 2026-03-23
summary: 'A Rails test suite that had only run on laptops in Pacific time failed 2 to 17 specs per run in CI. The specs used Ruby time methods that ignore the Rails time zone, and one failure came from a daylight saving change.'
topics: [Ruby and Rails, Docker and CI]
---

I added a GitHub Actions workflow for a Rails test suite that had only ever run on laptops in Pacific time. The app sets `config.time_zone` to Pacific, and the runner is in UTC. Every run failed somewhere between 2 and 17 specs, and which ones changed with the time of the run and the random seed:

```
expected: "8 AM"
     got: "9 AM"

expected: 2017-05-28 00:01:00 -0700
     got: 2017-05-28 00:01:00 -0500
```

Setting `TZ=America/Los_Angeles` on the test container cut the failures down but didn't get to zero, and it only hides the problem. The real fix was in the specs. Several Ruby time methods use the server's zone, not the Rails zone: `Time.local`, `Time.new`, `Date#to_time`, and `Date.today`. Only `Time.zone.*` and `Date.current` use the Rails zone. The changes looked like this:

```ruby
Timecop.freeze(Time.zone.local(2017, 5, 28))               # not Time.local
create(:call, created_at: 15.days.ago.change(hour: 8))     # not beginning_of_day + 8.hours
let(:tomorrow) { (Time.zone.now + 1.day).change(hour: 8) } # not Date#to_time
```

The "8 AM" failure had a different cause. The run was on March 23, so `15.days.ago` was March 8, 2026, the day US clocks moved forward. That day is 23 hours long, so midnight plus 8 hours is 9:00 AM. `change(hour: 8)` sets the hour directly and gives 8 AM on any day.

After these changes the suite passed, 2206 examples with 0 failures, twice in a row.

The `-0500` offset means a zone other than Pacific was still set during that example, left over from code that changed `Time.zone` earlier in the run. Running every example inside `Time.use_zone` with an `around` hook stops that kind of leak. The same kind of leak turned up in production later in the year, in [another app](/2026/10/01/a-time-on-a-date-column-moved-the-month/).
