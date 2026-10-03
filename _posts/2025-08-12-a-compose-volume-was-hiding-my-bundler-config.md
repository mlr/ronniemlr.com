---
title: A Compose volume was hiding my Bundler config
date: 2025-08-12
summary: 'Bundler kept using production settings that no rebuild could remove. A named volume over /usr/local/bundle was serving a stale copy.'
topics: [Docker and CI, Ruby and Rails]
---

I was setting up a new Rails 8 app for local development in Docker Compose on an Apple Silicon Mac. To keep gems between rebuilds, the compose file mounted a named volume over `/usr/local/bundle`.

On the first day, Bundler ignored native gems "because it is missing extensions" and couldn't find others. On the second day, `/usr/local/bundle/config` contained production settings:

```
BUNDLE_DEPLOYMENT: "true"
BUNDLE_PATH: "vendor/bundle"
BUNDLE_WITHOUT: "development:test"
```

Nothing I changed in the image made them go away. I ran `bundle config unset`, deleted the file in the Dockerfile, set environment variables, built with `--no-cache` and pruned the builder. A Dockerfile with nothing but a `FROM` line still showed the same config, and the base image run on its own had no config file at all.

The difference was the volume. The official Ruby images put both the gems and Bundler's config in `/usr/local/bundle`, because `GEM_HOME` and `BUNDLE_APP_CONFIG` both point there. Docker fills a named volume from the image only once, when the volume is created. After that, the volume hides whatever later builds put in that directory, including the config file and the compiled extensions. An earlier version of my Dockerfile must have written those production settings, and the volume kept them.

`docker compose config` shows the merged mounts, and reading it was what finally made the volume obvious. The fix is to remove the volume and let it fill again:

```sh
docker compose down
docker volume rm my-app_bundle_cache
docker compose up --build
```

Don't reach for `docker compose down -v` here unless you mean it. It deletes every volume in the project, including the database's.

The "missing extensions" error from the first day fits the same setup. One service ran as `linux/amd64` and another ran natively on arm64, and both mounted the same gem volume. Compiled gems only work on the platform they were built for.
