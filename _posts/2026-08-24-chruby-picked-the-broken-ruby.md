---
title: chruby picked the broken Ruby
date: 2026-08-24
summary: 'ruby-install said Ruby 3.4.10 installed fine, but chruby 3.4.10 selected a broken x86_64 copy I had renamed and left in ~/.rubies. chruby keeps the last partial match.'
topics: [Ruby and Rails, Command line and Git]
---

I use chruby and ruby-install on an Apple Silicon Mac. Four days earlier, an agent had installed Ruby 3.4.10 for an app upgrade. Its shell was running under Rosetta, so ruby-install built an x86_64 Ruby, and that build had no psych. The agent renamed the folder to `ruby-3.4.10.broken-x86_64`, built again with `arch -arm64`, and couldn't delete the broken one, so it stayed in `~/.rubies`.

I reinstalled 3.4.10 myself and got a healthy arm64 build. ruby-install reported success every time. Then `chruby 3.4.10` failed:

```
rubygems.rb:9:in 'Kernel#require': cannot load such file -- rbconfig (LoadError)
```

`chruby` with no arguments marked `ruby-3.4.10.broken-x86_64` as the current Ruby, and `ruby -v` said `[x86_64-darwin24]`.

Rosetta wasn't it this time, because `uname -m` in my terminal said arm64. The answer was in chruby's match loop:

```sh
case "${dir##*/}" in
  "$1")   match="$dir" && break ;;  # exact name, stop
  *"$1"*) match="$dir" ;;           # partial name, keep going
esac
```

Every folder in `~/.rubies` counts as a Ruby. An exact folder name wins at once, but `3.4.10` isn't the exact name of any folder. Both `ruby-3.4.10` and `ruby-3.4.10.broken-x86_64` contain it, the loop keeps going, and the last match wins. The broken folder sorts after the good one.

The broken copy also failed in a confusing way. Its binary still looked for its library files under its original build path, `ruby-3.4.10/lib`, which was now the good arm64 install. It wanted `x86_64-darwin24/rbconfig.rb` there and found only `arm64-darwin24`. Selecting the good folder by path worked:

```
ruby 3.4.10 ... [arm64-darwin24]
rubygems OK
```

So the fix is to get the broken copy out of `~/.rubies`, by deleting it or moving it somewhere chruby doesn't look. Until then, `chruby ruby-3.4.10`, the exact folder name, stops the loop on the right folder.

Two habits from this. Never park a renamed Ruby in `~/.rubies`. And before you build anything native in an agent's shell, check `sysctl -n sysctl.proc_translated`. It prints 1 under Rosetta.
