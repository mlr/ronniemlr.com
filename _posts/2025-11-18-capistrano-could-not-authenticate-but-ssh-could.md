---
title: Capistrano couldn't authenticate, but ssh could
date: 2025-11-18
summary: 'cap production deploy failed with Net::SSH::AuthenticationFailed while plain ssh worked. My be function had run Capistrano inside a Docker container with no SSH keys.'
topics: [Ruby and Rails, Command line and Git]
---

A small Rails app deploys with Capistrano to a single server. `ssh deploy@my-server` worked fine from my Mac, but the deploy didn't:

```
$ be cap production deploy
Net::SSH::AuthenticationFailed: Authentication failed for user deploy@my-server
```

Two clues in the output gave it away. Docker Compose printed a warning about orphan containers, and the gem paths in the backtrace started with `/usr/local/bundle`, which is where gems live inside the Ruby Docker image, not on my Mac.

The cause was my own tooling. Last year I wrote a [`be` function](/2024/07/16/an-alias-cannot-put-arguments-in-the-middle/) that runs `bundle exec` inside the project's web container when its Compose project is up, and on the host when it isn't. This project had containers running, so Capistrano ran inside the container, and the container has no SSH keys or agent.

Running it on the host fixed it:

```sh
bundle exec cap production deploy
```

So `be` has a blind spot. Anything that needs things from the host, like SSH keys, the macOS keychain, or files outside the project, should skip it. If you do need SSH inside a container on Docker Desktop for Mac, forward the agent through Docker's socket at `/run/host-services/ssh-auth.sock`, because mounting your macOS `$SSH_AUTH_SOCK` doesn't work.

The same deploy turned up a few smaller fixes on the server side. Ansible's `include` had to become `include_tasks`, an old ruby-install couldn't find a Ruby tarball until I updated it, and `assets:precompile` needed a placeholder `SECRET_KEY_BASE` during the build.
