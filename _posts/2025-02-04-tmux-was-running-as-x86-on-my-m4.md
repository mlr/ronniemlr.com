---
title: tmux was running as x86 on my M4
date: 2025-02-04
summary: 'On a new Apple Silicon Mac, every shell inside tmux reported i386. An old Intel Homebrew in /usr/local came first on the PATH.'
topics: [Command line and Git]
---

I set up a new M4 Mac and lived in tmux as usual. Then I noticed that inside tmux, `arch` printed `i386`. Outside tmux it printed `arm64`. Every shell that tmux started was running under Rosetta.

`arch -arm64 brew install tmux` didn't change it, and neither did starting zsh with `arch -arm64`. The terminal app wasn't set to open with Rosetta either.

The answer was in `which -a`:

```sh
which -a brew tmux
file "$(which tmux)"
```

I had two Homebrew installs. One was in `/usr/local`, the Intel prefix, and one was in `/opt/homebrew`, the Apple Silicon prefix. `/usr/local/bin` came first on my PATH, so the tmux I ran was the Intel build, and an x86 tmux starts x86 shells.

I removed the Intel Homebrew with its uninstall script. After that, the shell setup only needs one `brew shellenv` line, for the Apple Silicon install, in `~/.zprofile`:

```sh
eval "$(/opt/homebrew/bin/brew shellenv)"
```

If you do the same, save the output of `brew list` first, because the uninstall removes every package installed with the Intel Homebrew. The uninstall script also takes `--path=/usr/local` to target one prefix, which is safer than trusting PATH order. And the tmux server keeps running after you fix the binary, so run `tmux kill-server`, or new sessions attach to the old x86 server.
