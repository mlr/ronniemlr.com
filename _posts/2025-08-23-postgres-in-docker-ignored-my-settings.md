---
title: Postgres in Docker ignored my POSTGRES_ settings
date: 2025-08-23
summary: "An old side project's Postgres container refused every connection despite POSTGRES_HOST_AUTH_METHOD: trust. Those variables only apply to an empty data directory."
topics: [Databases, Docker and CI]
---

I opened an old side project again after several months. Its database was a Postgres 10 container in Docker Compose with a bind-mounted `./pgdata` directory, and the compose file set `POSTGRES_HOST_AUTH_METHOD: trust`. The server refused every connection anyway:

```
FATAL: no pg_hba.conf entry for host "...", user "...", database "...", SSL off
```

The `POSTGRES_*` variables in the official image only do something when the data directory is empty. On first start, the entrypoint runs `initdb` and writes `pg_hba.conf` and the users. My `pgdata` directory already existed, so the container used the `pg_hba.conf` and roles inside it and ignored the variables.

The fix was to edit `pg_hba.conf` in the data directory, which is fine for a local development database:

```
local all all trust
host  all all 0.0.0.0/0 trust
host  all all ::/0 trust
```

```sh
docker compose restart db
```

That got me in. Then `pg_dump -U postgres` failed with `role "postgres" does not exist`, which fits the same story. The roles in that data directory were whatever had been created there originally, not what this image's first start would have made. Dumping as my own superuser role worked:

```sh
docker compose exec -T db pg_dump -U my_user -d my_app_development | gzip > my_app.sql.gz
```

The `-T` matters there. Without it, `exec` allocates a terminal and can mangle piped output.

The port mapping was a problem too. `"5439:5432"` listens on every network interface. With trust authentication, that's a superuser login for anyone on the same network. Bind it to localhost:

```yaml
ports:
  - "127.0.0.1:5439:5432"
```
