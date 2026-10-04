---
title: Two Ruby managers, one gem directory
date: 2026-04-27
summary: 'A project setup script installed mise next to my chruby setup. A month later, Homebrew''s tmuxinator failed because native gems built for mise''s Ruby were sitting in chruby''s gem directory.'
topics: [Ruby and Rails, Command line and Git]
---

I use chruby for Ruby. In March I cloned an open-source Rails app to run locally, and its `bin/setup` ran `mise install --yes`. The app's `.mise.toml` asks only for Ruby, but mise also tried to build Python and failed:

```
mise ERROR failed to install core:python@3.13.12
mise ERROR Python installation is missing a `lib` directory
```

`mise ls` showed why:

```
python  3.13.12 (missing)  ~/.python-version
```

mise reads version files in parent directories, including my home directory, and I had a `~/.python-version` with `3.13` in it. Changing it to an exact version got setup past mise, though `mise install ruby` would have skipped Python entirely.

Then the app's gems failed with "ignoring ... because it is missing extensions". mise had built them for its own Ruby 3.4.7, but chruby's 3.3.9 came first on my PATH. Installing 3.4.7 with ruby-install, so chruby could switch to it, got the app running.

In April the cost of having both showed up somewhere else. tmuxinator, installed from Homebrew, wouldn't start:

```
'Kernel#require': linked to incompatible .../mise/installs/ruby/3.4.7/lib/libruby.3.4.dylib -
  ~/.gem/ruby/3.3.9/gems/date-3.5.1/lib/date_core.bundle (LoadError)
```

After that, `gem install` under chruby's 3.3.9 failed the same way on `stringio.bundle`.

chruby exports `GEM_HOME` and `GEM_PATH` to every process started from the shell. Mine pointed at `~/.gem/ruby/3.3.9`. The error shows what that led to. mise's 3.4.7 ran with those variables set and compiled native gems into chruby's directory, linked against mise's `libruby`. Any other Ruby that read that directory, including Homebrew's Ruby under tmuxinator, then loaded gems built for a different Ruby.

My mise activation wasn't in any shell config, but `which mise` found it in Homebrew. The cleanup is to remove mise, move the 3.3.9 gem directory aside, and reinstall gems under chruby. Homebrew's tmuxinator can also run without chruby's variables:

```sh
brew uninstall mise
mv ~/.gem/ruby/3.3.9 ~/.gem/ruby/3.3.9.bak
mux() { env -u GEM_HOME -u GEM_PATH tmuxinator "$@"; }
```

By August, `which mise` found nothing. Ruby on this Mac had [one more surprise](/2026/08/24/chruby-picked-the-broken-ruby/) for me anyway.
