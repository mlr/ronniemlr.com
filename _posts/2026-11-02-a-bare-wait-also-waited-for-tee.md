---
title: A bare wait also waited for tee
date: 2026-11-02
summary: 'A setup script for a Claude Code cloud environment never finished. A prebuilt Ruby only ran from its build path, and a bare wait was waiting on the tee process that logged the script.'
topics: [AI and agents, Command line and Git]
---

I set up a Claude Code routine that picks up an approved ticket, makes the change in a client's Rails app, and opens a PR. It runs in a cloud container that has no MySQL, no Chrome, and not the project's Ruby 3.4, so a setup script installs them first. Claude starts only after that script exits. Mine took two fixes before it did, one for Ruby and one for a bare `wait`. The first run never got to Claude:

```
Setup script failed with exit code -1. Script output: ... Setting up google-chrome-stable ...
```

It stopped about 8 minutes into the session. The script compiled Ruby with mise, and that alone took minutes. So I switched to a prebuilt Ruby, the tarballs from ruby/ruby-builder that `setup-ruby` uses on GitHub's runners. Unpacked into mise's install folder, it didn't run:

```
/root/.local/share/mise/installs/ruby/3.4.10/bin/ruby: error while loading shared libraries:
libruby.so.3.4: cannot open shared object file: No such file or directory
```

Those builds expect to live at their build path, `/opt/hostedtoolcache/Ruby/<version>/x64`. Unpacking it there and pointing mise's version folder at it with a symlink worked:

```bash
mkdir -p "/opt/hostedtoolcache/Ruby/${RUBY_VERSION}" "$HOME/.local/share/mise/installs/ruby"
tar -xzf /tmp/ruby.tgz -C "/opt/hostedtoolcache/Ruby/${RUBY_VERSION}"
ln -sfn "/opt/hostedtoolcache/Ruby/${RUBY_VERSION}/x64" \
        "$HOME/.local/share/mise/installs/ruby/${RUBY_VERSION}"
```

In an amd64 Ubuntu container, `ruby -v` printed `ruby 3.4.10 ... [x86_64-linux]`, the OpenSSL extension loaded, and Bundler installed.

Then the script never ended. It logged everything through `tee`, ran two install functions in the background, and called `wait`:

```bash
exec > >(tee -a "$LOG") 2>&1
packages &
ruby_and_node &
wait
```

In a local test container it had been running for an hour and 27 minutes, with two processes left:

```
PID  PPID  ELAPSED  COMMAND
2483    1  01:26:35 bash /work/routine_setup.sh
2484 2483  01:26:35 tee -a /var/log/setup.log
```

Both install jobs were done. `wait` with no arguments was also waiting for the `tee` from the process substitution. `tee` exits when the script's output closes, and that only happens when the script exits. Waiting on the job PIDs fixed it:

```bash
packages &
PACKAGES_PID=$!
ruby_and_node &
RUBY_PID=$!
wait "$PACKAGES_PID" "$RUBY_PID"
```

A small test script with the same `exec > >(tee ...)` and the PID `wait` exited in 3.5 seconds. The full script installed Chrome, MySQL 8.0, and Ruby 3.4.10 and exited. That was bash 5.2 on Ubuntu 24.04.

One more thing from that day. "Setup script failed" wasn't the end of the run. The cloud started the same session again 4 minutes later with the setup cached, and that run opened the PR. Claude had already marked the ticket as failed, so a setup failure is worth a second look before anything gets closed.
