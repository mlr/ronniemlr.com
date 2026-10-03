---
title: An alias can't put arguments in the middle
date: 2024-07-16
summary: 'My be alias was supposed to choose between docker compose and plain bundle exec. The arguments only reached the second command.'
topics: [Command line and Git]
---

In a Rails app that runs in Docker Compose, every rake task, migration and console goes through `docker compose run web bundle exec ...`. In apps that don't use Docker, it's plain `bundle exec`. I type `be` for `bundle exec` all day, and I wanted it to decide for me. If the compose project is up, run the command in the `web` container. If not, run it on the host.

The first version was a one-line alias:

```sh
alias be="[ -n \"$(docker compose ls -q --filter name=$(basename $(pwd)))\" ] && docker compose run web bundle exec || bundle exec"
```

`be rake db:migrate` with the project running:

```
bundler: exec needs a command to run
```

An alias is text replacement. The shell pastes the alias in and puts your arguments after all of it, so the line becomes:

```sh
[ ... ] && docker compose run web bundle exec || bundle exec rake db:migrate
```

The docker branch gets no command at all. Only the last `bundle exec` sees `rake db:migrate`.

That alias had two more bugs. The `$(...)` parts sit inside double quotes, so they run once, when `.zshrc` loads, and never again. And `A && B || C` is not if/else. If the docker command fails, C runs as well, and the command runs a second time on the host.

A function fixes all three:

```sh
be() {
  if [ -n "$(docker compose ps --status running -q web 2>/dev/null)" ]; then
    docker compose run --rm web bundle exec "$@"
  else
    bundle exec "$@"
  fi
}
```

`"$@"` passes the arguments exactly as typed, quotes and spaces included. Since the check already knows the container is running, `docker compose exec web` would also work in place of `run --rm`, and it skips starting a new container.
