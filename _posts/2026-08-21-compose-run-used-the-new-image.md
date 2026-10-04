---
title: compose run used the new image, the server didn't
date: 2026-08-21
summary: 'After a Gemfile change and an image rebuild, specs passed in docker compose run but the dev server was missing a gem. The running service was still on the old image.'
topics: [Docker and CI]
---

My invoicing app runs in Docker Compose in development. A long-running `web` service serves the app, and I run specs in one-off `docker compose run` containers. After I added a gem and rebuilt the image, the specs passed, but the dev server failed. `bundle check` inside the running container said:

```
The following gems are missing
 * jquery-ui-rails (8.0.0)
```

The running container was on an image from five hours earlier. The `latest` tag was an hour old. `docker compose run` starts a new container from the newest image every time, but a running service keeps the image it started with until you recreate it, and `docker compose restart` doesn't recreate it. Recreating the service fixed it:

```sh
docker compose up -d --force-recreate web
```

A later `docker compose restart web` then stopped on a leftover pid file:

```
A server is already running. Check /app/tmp/pids/server.pid.
```

Deleting `tmp/pids/server.pid` fixed that. Removing the pid file at the start of the `web` command would keep it from happening again.
