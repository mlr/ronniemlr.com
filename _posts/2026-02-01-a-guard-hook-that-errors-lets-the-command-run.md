---
title: A guard hook that errors lets the command run
date: 2026-02-01
summary: 'My Claude Code guard hook was supposed to block force pushes. A missing execute bit made it error, and Claude Code ran the push anyway. Only exit code 2 blocks.'
topics: [AI and agents, Command line and Git]
---

My Claude Code plugin ships a few PreToolUse hooks that stop the agent from force pushing, running risky shell commands, and writing to system paths. They matter most when I run sessions that skip permission prompts. Over a month the force-push guard failed in two different directions.

In January it blocked too much. The pattern was `git.*(--force|--force-with-lease|[[:space:]]-f([[:space:]]|$))`, and it blocked this:

```sh
gh api repos/my-org/my-repo/pulls/16/comments -f body="Add 'github-actions' to the keywords list" -f commit_id=...
```

The `git` in `github-actions` matched, and then the next ` -f ` did. Anchoring the pattern to the start of the command fixed that case:

```bash
if [[ "$command" =~ ^git[[:space:]].*(--force|--force-with-lease|[[:space:]]-f([[:space:]]|$)) ]]; then
```

In February it blocked nothing. I asked Claude to test the guard with `git push -f origin main`. Claude Code printed `PreToolUse:Bash hook error` twice, and then the push ran. The script had lost its execute bit (`-rw-r--r--`), so the hook couldn't start at all. The commits that edited the hook show `mode change 100755 => 100644`. After `chmod +x`, the same push was blocked:

```
ERROR: Force push blocked by hook - use ! if needed
```

That made me look at the other ways the hooks could fail. They read the tool input with `jq ... 2>/dev/null`. Without jq the variables come out empty, the pattern doesn't match, and the script reaches `exit 0`. Each hook now checks for jq first and blocks if it's missing:

```bash
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required for safety hooks but not found" >&2
  exit 2
fi
```

A PreToolUse hook blocks only when it exits with code 2. If it crashes, can't run, or exits with any other code, Claude Code shows "hook error" and runs the command. So a guard has to fail closed on purpose. Starting the script with `bash path/to/hook.sh` in the hooks config would also stop the file mode from mattering.

A pattern on the raw command line will always be approximate. This one misses `cd repo && git push -f`, and it blocks `-f` on git commands that aren't pushes, like `git branch -f`. For a guard, blocking too much is the safer way to be wrong, and `!` is there to override it.
