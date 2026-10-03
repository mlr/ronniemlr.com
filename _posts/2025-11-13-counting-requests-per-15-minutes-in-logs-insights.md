---
title: Counting requests per 15 minutes in Logs Insights
date: 2025-11-13
summary: "CloudWatch Logs Insights rejected sort bin(15m) with 'unexpected symbol'. Name the bin with as, then sort by that name."
topics: [AWS]
---

I wanted to count the requests to one API endpoint in 15-minute windows, from the app's logs in CloudWatch Logs Insights. Every variation I tried failed with:

```
unexpected symbol found (
```

The error pointed at the `(` in `sort bin(15m)`. Grouping with `stats ... by bin(15m)` is fine, but `sort` takes a field name, not a function call. Give the bin a name with `as`, and sort by that name:

```
filter @message like /\/api\/example\/search/
| stats count() as request_count by bin(15m) as block
| sort block
```

Put `filter` before anything that limits the results. Logs Insights runs the commands in order, so a `limit 2000` in front of `stats` means only those 2,000 events get counted.

For a chart, the Visualization tab draws a `bin()` query as a time series, so you don't need to format the timestamps yourself.
