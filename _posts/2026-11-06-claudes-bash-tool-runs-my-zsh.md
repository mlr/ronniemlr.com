---
title: Claude's Bash tool runs my zsh
date: 2026-11-06
summary: 'Claude Code runs Bash tool commands in my login shell, which is zsh. Over five weeks, five zsh behaviors broke bash-style one-liners, and one grep error happened 29 times.'
topics: [Command line and Git, AI and agents]
---

Claude Code runs each Bash tool command through my login shell. On my Mac that's zsh, the macOS default. Claude writes bash one-liners anyway, and five zsh defaults kept breaking them across my sessions and their subagents. The errors all start with `(eval):1:`. If you use Claude Code on a Mac and see that prefix, this is probably why. [My cd hook](/2026/06/14/my-cd-hook-was-filling-claudes-context/) was the first sign that the agent's shell is my shell.

**Unquoted variables aren't split into words.** zsh leaves `SH_WORD_SPLIT` off, so a command kept in a variable stays one word:

```
$ AB="agent-browser --session demo"; $AB open http://localhost:4000/sign-up
(eval):1: no such file or directory: /Users/me/.local/bin/agent-browser --session demo
```

The same thing passed 19 file names to a script as one argument, and broke a curl call written as `R="--resolve ..."; curl $R ...`. A function or a tiny wrapper script works:

```sh
oc() { env -i HOME="$T/home" PATH="$P" opencode "$@"; }
```

So does an array, `args+=(--attach "$f")` and then `"${args[@]}"`. Command substitution does get split, so `for f in $(cat files.txt)` worked, which made the difference easy to miss.

**A glob that matches nothing is an error.** This one came up 29 times:

```
$ grep -rn "trigger" lib --include=*.ex
(eval):1: no matches found: --include=*.ex
```

zsh tries to expand `--include=*.ex` as a file pattern, finds nothing, and stops. Quoting it, `--include='*.ex'`, is the fix. Claude usually dropped the flag and grepped everything instead.

**`=word` expands to a command path.**

```
$ tail -6 a.sql; echo ===; tail -8 b.sql
(eval):1: == not found
```

**`$var:x` is a history modifier, even inside double quotes.**

```
$ git push -q origin "$commit:refs/heads/pr-assets/screens"
error: src refspec 296baa5...efs/heads/pr-assets/screens does not match any
```

zsh read `:r` as "remove the extension" and used up the `r` of `refs`. `"${commit}:refs/heads/..."` works.

**`$var[...]` is a subscript.** In an ffmpeg filter string, `d=$D[bg]` became an empty duration:

```
[Parsed_color_15 @ 0x...] Unable to parse option value "" as duration
```

Moving long ffmpeg commands into a `#!/bin/bash` script got rid of that whole class of problem.

Claude found the cause almost every time, usually right after the first failure. It didn't carry it forward. The word-splitting error came back five more times over three weeks, and the glob error kept coming through November. It happened twice while I gathered the material for this post. A line in my global CLAUDE.md about quoting globs and not keeping commands in variables is the next thing I'll try.
