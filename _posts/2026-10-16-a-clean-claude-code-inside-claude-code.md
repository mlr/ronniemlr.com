---
title: A clean Claude Code inside Claude Code
date: 2026-10-16
summary: 'To test a prompt in a fresh Claude Code, I started one from inside a session. The child inherited CLAUDE_* variables, my plugin blocked it, and a temp HOME logged it out. A Library symlink kept the login.'
topics: [AI and agents]
---

Twice I had Claude start another Claude Code as a test subject. The first time I recorded a real interactive session for a demo. The second time I tested an onboarding prompt against a stub CLI, so nothing real got created. Both needed a Claude Code with none of my plugins, memory, or instructions. A child started from inside a session gets the parent's environment and my home folder, so getting a clean one took a few tries.

The child showed a yellow banner saying transcript saving was off, because of an inherited `CLAUDE_CODE_CHILD_SESSION` marker. It had the parent's environment, including `CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_MESSAGING_SOCKET`, and `CLAUDE_EFFORT`. Dropping every `CLAUDE*` variable before the child starts fixed that:

```python
env = {k: v for k, v in os.environ.items() if not k.startswith("CLAUDE")}
env.update(TERM="xterm-256color", CLAUDE_CODE_HIDE_ACCOUNT_INFO="1")
```

A later session used `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT claude -p ...` for the same reason.

To keep my own config out, I gave the child an empty HOME. Then it wasn't logged in:

```
Not logged in · Please run /login
```

On macOS the login is in the Keychain. A symlink to my real `~/Library` kept the login and left the rest of HOME empty:

```sh
mkdir -p "$T/home" && ln -s "$HOME/Library" "$T/home/Library"
env -i HOME="$T/home" USER="$USER" PATH="$P" TERM=xterm-256color \
  claude -p "Reply with the single word: ready" --output-format json --max-turns 1
```

It answered `ready`, and afterwards the temp home had only `.claude`, `.claude.json`, `.config`, `.npm`, and `Library`.

The recording used my normal HOME, so the child loaded my plugin, and its guard hook blocked commands the demo needed. `--settings` turns a plugin off for one process without touching any settings file:

```sh
claude --settings '{"enabledPlugins":{"my-plugin@my-marketplace":false}}'
```

The recording script had to decide when the session was done. First it stopped when no spinner text showed up for 14 seconds. Claude Code redraws with diffs, so the full spinner text rarely appears, and that take ended at 85 seconds. Ten seconds of no output didn't work either, because the agent started a background shell and went quiet while it waited. The script now waits for the demo's end state in the database and then 10 seconds of quiet. Take 6 ran the whole thing.

The prompt sign is followed by a no-break space, U+00A0, and the status dot is U+23FA. The renderer, agg, drew both badly, so the script swaps them in the cast file before rendering:

```python
cast = cast.replace(chr(0xA0), " ").replace(chr(0x23FA), chr(0x25CF))
```

It uses `chr()` because the Write tool had turned the `\u` escapes in the file into the characters themselves.
