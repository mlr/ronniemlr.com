---
title: Logs Insights months start in UTC
date: 2026-05-15
summary: 'I grouped API calls by month with bin(1mo), and the labels read April 30 at 5 pm. The buckets start at midnight UTC, and the console shows that moment in local time.'
topics: [AWS]
---

A third-party API I call announced per-call pricing, so I wanted to count my calls per endpoint and per month from the app's logs. Last year I [counted requests per 15 minutes](/2025/11/13/counting-requests-per-15-minutes-in-logs-insights/) in CloudWatch Logs Insights, so I started there again.

Grouping by month with `bin(1mo)` worked:

```
fields @timestamp, @message
| filter @message like /api\.example\.com/
| parse @message /GET (?<url>https:\/\/[^\s?]+)/
| stats count(*) as requests by url, bin(1mo) as month
| sort month desc, requests desc
```

The counts looked right, but the month labels read `2026-04-30T17:00:00.000-07:00`, which made it look like the buckets were cut on the wrong day. They weren't. `bin()` cuts the buckets in UTC, so the May bucket starts at midnight UTC on May 1. The console shows that moment in the browser's time zone, and in Pacific time that's 5 pm on April 30.

I also tried to give `bin()` the timestamp myself, which fails:

```
bin(@timestamp, 1mo)
Invalid arguments, received: (@timestamp,1mo) but expected: (period: Period)
```

`bin()` takes only the period and always uses `@timestamp`. Parsing the month out of `@timestamp` with a regex returned an empty field, so that isn't a way around it either.

So when month buckets in Logs Insights look a few hours off, check the time zone before the query. The labels are UTC month starts shown in your local time.
