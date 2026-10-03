---
title: Building Ruby 3.0.7 on an M2 Mac
date: 2024-07-10
summary: 'ruby-install stopped on RUBY_FUNCTION_NAME_STRING. One CFLAGS define got Ruby built, and a mysql2 flag fixed the next error.'
topics: [Ruby and Rails]
---

I was about to upgrade an older Rails app. Before changing anything, I wanted it running locally on the Ruby it already used, 3.0.7, on an M2 Mac. `ruby-install ruby 3.0.7` would not build on macOS 14.5. It stopped in `compile.c`:

```
error: use of undeclared identifier 'RUBY_FUNCTION_NAME_STRING'
```

None of these helped. I updated ruby-install, tried 3.0.6, pointed `--with-openssl-dir` at Homebrew's openssl@1.1, and set `-Wno-error=implicit-function-declaration` by itself.

A configure check normally defines `RUBY_FUNCTION_NAME_STRING`. When that check fails, the macro is never set. Defining it yourself gets the build through:

```sh
CFLAGS="-Wno-error=implicit-function-declaration -DRUBY_FUNCTION_NAME_STRING=__func__" \
  ruby-install ruby 3.0.7
```

`ruby --version` then showed 3.0.7 on arm64.

Next was the mysql2 gem. It went looking for headers in a `mysql-client@8.0` path that didn't exist. Point it at whatever Homebrew has installed:

```sh
gem install mysql2 -- --with-mysql-dir="$(brew --prefix mysql-client)"
```

If bundler keeps using the old path, look for a stale `build.mysql2` entry in `bundle config`.

The define works around the failed check without fixing it, which was fine for a local dev Ruby. For the real cause, `config.log` in the build directory shows which check failed, and other people report that a fresh install of the Xcode Command Line Tools fixes it.

Ruby 3.0 reached end of life in April 2024.
