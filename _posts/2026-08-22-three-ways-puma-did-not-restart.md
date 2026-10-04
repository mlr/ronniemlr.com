---
title: Three ways Puma didn't restart
date: 2026-08-22
summary: 'A systemd path unit was supposed to restart Puma after each Capistrano deploy. It never ran, then it caused eight seconds of 502s per deploy, and then a bad config line took the site down two days later.'
topics: [Ruby and Rails, Command line and Git]
---

My invoicing app deploys with Capistrano to one Ubuntu VM, and nginx proxies to Puma over a unix socket. The deploy user has no sudo, so a deploy restarts Puma by touching `shared/tmp/restart.txt`. A systemd `.path` unit watches that file and starts a service that restarts Puma. During a Rails upgrade I found out that chain had three problems.

**It never ran.** After a deploy, Puma kept serving the old release. `ps` still showed the release from March on the Puma process. Neither `puma.service` nor `puma-restart.path` had an `[Install]` section, so `systemctl` listed both as "static". You can't enable a unit with no `[Install]` section, and the path unit was inactive, so nothing watched the file. Adding the section and enabling both units fixed it:

```ini
[Install]
WantedBy=multi-user.target
```

```
puma pid before: 3186983 ... after: 3187364
RESULT: puma restarted
```

**It caused 502s.** Now each deploy brought about 8 seconds of 502 errors. The watcher ran `systemctl restart puma`, and a full stop removes the socket, so nginx had nothing to connect to until the new Puma bound it again. A hot restart with SIGUSR2 keeps the socket open. Puma re-executes itself in place, and setting its directory to the `current` symlink makes it load the new release:

```ini
# puma-restart.service
ExecStart=/bin/systemctl kill -s SIGUSR2 --kill-who=main puma.service

# puma.service
Environment=PUMA_DIRECTORY=/var/www/my-app/current
```

```ruby
# config/puma.rb
directory ENV['PUMA_DIRECTORY'] if ENV['PUMA_DIRECTORY']
```

A probe during the next deploy got 313 responses with status 200, the release changed, and Puma's main process ID stayed the same. The app uses `preload_app!`, which rules out a phased restart, so the hot restart is the right kind.

**It took the site down.** Two days later every request returned 502. The journal had this:

```
config/puma.rb:9: undefined method 'umask' for an instance of Puma::DSL (NoMethodError)
```

Another agent had added `umask 0002` to `puma.rb` for the socket's permissions. Puma has no such setting. The hot restart at the next deploy read the file again and failed, and systemd's restarts failed the same way until it hit its start limit. A failed unit can't be started by touching `restart.txt` either. The socket's permissions were already open enough, so I reverted the line and started Puma by hand.

A hot restart reads `puma.rb` again, so a bad edit only fails at the next deploy. If you need socket permissions, Puma takes them in the bind URL, like `unix:///path/puma.sock?umask=0002`.
