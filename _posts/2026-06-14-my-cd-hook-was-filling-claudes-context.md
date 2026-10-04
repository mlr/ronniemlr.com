---
title: My cd hook was filling Claude's context
date: 2026-06-14
summary: 'My zsh config lists the directory after every cd. Claude Code''s shell loads the same config, so every cd the agent ran added a directory listing to its context.'
topics: [AI and agents, Command line and Git]
---

My zsh config has a `chpwd` function that lists the directory after every `cd`. I like it in my own terminal:

```zsh
function chpwd() {
  emulate -L zsh
  lh
}
```

`lh` is my alias for a long directory listing. Claude Code's Bash tool loads the same zsh config, so each time the agent ran `cd`, the listing went into the tool output and used up context. Nothing failed. It was just noise on every directory change.

Claude Code sets `CLAUDECODE=1` in the environment of the commands it runs, so the hook can skip the listing when that's set:

```zsh
function chpwd() {
  emulate -L zsh
  [[ -n $CLAUDECODE ]] && return
  lh
}
```

That covers Claude Code. Other agents set their own variables or none at all, so a check for a terminal, `[[ -t 1 ]] || return`, is the broader version. It skips the listing whenever output isn't going to a terminal. The same goes for anything else in `precmd` or `chpwd` that prints. An agent's shell runs those hooks too.
