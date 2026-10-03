---
title: Cloud Run job args replace the command
date: 2025-07-30
summary: 'Passing --date to a Cloud Run job execution never reached the Python script. Execution args replace the container args completely, CMD included.'
topics: [Docker and CI]
---

A Python data loader runs once a day as a Cloud Run job, started by Cloud Scheduler. I needed to backfill about a year of days, so I wanted to run the job once per date with a `--date` flag.

The image's Dockerfile ended with `CMD ["python", "-m", "loader.daily"]`, with no `ENTRYPOINT`. My first try:

```sh
gcloud run jobs execute my-job --args="--date=2024-06-07"
```

That failed with `"--date=2024-06-07" not found`. Execution-time `--args` replace the container's arguments, and without an `ENTRYPOINT` the arguments are the whole `CMD`. The container tried to run `--date=2024-06-07` as a program.

Setting the command on the job and passing only the date didn't work either, because execution args also replace the job's own args instead of adding to them. Python started with no module to run and rejected `--date`. What worked was passing the full argument list on every execution:

```sh
gcloud run jobs update my-job --command=python --args=-m,loader.daily
gcloud run jobs execute my-job --wait \
  --args="-m,loader.daily,--date,2024-06-07"
```

A cleaner setup is `ENTRYPOINT ["python", "-m", "loader.daily"]` in the Dockerfile and no args on the job. Then `--args="--date,2024-06-07"` is all you pass.

### The backfill

I started all the dates in parallel, and BigQuery rejected most of them with `too many table update operations for this table`. Every run wrote to the same table, and BigQuery limits how often one table can be updated. Running the dates one at a time with `--wait` worked.
