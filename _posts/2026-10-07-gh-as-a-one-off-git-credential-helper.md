---
title: gh as a one-off git credential helper
date: 2026-10-07
summary: 'Git over SSH failed in Claude Code''s shell, because my key needs a passphrase and there is no terminal to ask for it. A one-off credential helper sent the push over HTTPS with gh''s login.'
topics: [Command line and Git, AI and agents]
---

On one client project I open PRs from my own fork, and Claude Code does the git work. One day every fetch and push over SSH failed in Claude's shell, including the ones I typed myself with Claude Code's `!` prefix. A one-off credential helper got me past it with no change to my git config. The error:

```
ssh_askpass: exec(/usr/X11R6/bin/ssh-askpass): No such file or directory
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

My key needs a passphrase. The agent's shell has no terminal, so ssh falls back to `ssh-askpass` to ask for it, and that isn't installed on macOS. `!` commands run in the same session shell, so they fail the same way. From my phone, `!` doesn't run anything at all. It arrives as plain text, because it only works in the terminal on the Mac.

`gh auth status` showed a working HTTPS login with a token in the keychain. Git can use gh as its credential helper for one command, with no config change:

```sh
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
  push https://github.com/me/app.git my-branch:my-branch
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
  fetch https://github.com/client/app.git main:refs/remotes/origin/main
```

The empty `credential.helper=` clears the helpers that are already configured, osxkeychain and store on my Mac. The second one makes gh the only helper. Without the empty one, git tries the configured helpers before gh.

The fetch updated `origin/main`, the push printed `To https://github.com/<me>/<repo>.git`, and the PR opened right after. I used the same two commands for the next few branches on that project.
