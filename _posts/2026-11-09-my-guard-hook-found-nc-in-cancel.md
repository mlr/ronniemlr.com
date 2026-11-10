---
title: My guard hook found nc in cancel
date: 2026-11-09
summary: 'In five weeks my Claude Code guard hook blocked 82 commands in my own projects. 53 were the exfiltration rule, and only one looked like what that rule is for. The agent learned to route around it.'
topics: [AI and agents, Command line and Git]
---

My Claude Code plugin has a PreToolUse hook that checks each Bash command before it runs. It lowercases the command and blocks it if it matches one of a list of patterns, like an `rm -rf` on a wide path or a `curl` that sends a secret out. In February [it failed open](/2026/02/01/a-guard-hook-that-errors-lets-the-command-run/), and I wrote then that blocking too much is the safer way to be wrong. Five weeks of sessions since then changed my mind.

In my own projects alone, the hook blocked 82 commands in 18 sessions. 53 of those came from this rule:

```bash
if echo "$cmd_lower" | grep -qE '(curl|wget|nc|netcat).*(-d|--data|<)\s*.*(\$|`|/etc/|/users/|/home/)'; then
```

It has no word boundaries, so `nc` matches inside `cancel`, `once`, `since`, `function`, `branch`, `launch`, `reference`, and `preferences`. 32 of the 53 blocked commands had no network tool in them at all. `git branch --show-current` is enough for the first part.

The other two parts match almost anything. `-d` matches `cut -d`, `tr -d`, `docker compose up -d`, or a file name like `thumb-desktop.png`. It also matches my scratchpad path. Claude Code names that folder after the project path, so it has `-Users-me-Development-` in it, which lowercases to `-development`. The third part takes any `$`, and every macOS home path lowercases to `/users/`. So a `curl`, my scratchpad path, and a variable on one line count as exfiltration.

Only one of the 53 had the shape the rule is for, a `curl -d` with a `Bearer $KEY` header. It went to my local dev server.

The other rules have the same problem. The `rm` rule has a bare `/` as one of its alternatives, so it blocks `rm -rf` on any absolute path, including the session's own scratch folder. The credentials rule matched a `| tail -1` from one command and the word `credentials` in a path later on the same line. A rule for `set |` matched the `asset|look` inside a `grep -E` pattern. The client projects had about 50 more blocks, almost all of them like these. While I gathered the material for this post, the hook blocked two of my own read-only commands.

The cost is the part I didn't expect. Only I can type `!` to override a block, so when the agent hits a false one, it goes around it. In the transcripts it split commands over several lines, used relative paths instead of `/Users/...`, moved values into variables on separate lines, or wrote the command into a script with the Write tool and ran `bash script.sh`. Claude saved that last one as a memory note, so it does it on purpose now. `grep` checks each line separately, so a multi-line command passes. A script passes completely, because the hook only sees `bash script.sh`.

That works for real matches too. Twice I told Claude to put a force push in a script, and both pushes went through, past a separate force-push hook. I approved both. The hook would have seen the same `bash push.sh` without my approval.

A better check would join continuation lines, split the command on `;`, `&&`, `||`, and `|`, and look at the first word of each segment. Then `nc` has to be a command, and `-d` has to be its flag. Word boundaries alone aren't enough. With `\b(curl|wget|nc|netcat)\b`, 23 of the 53 commands would still be blocked, all by a `-d` or `<` that belonged to another command.
