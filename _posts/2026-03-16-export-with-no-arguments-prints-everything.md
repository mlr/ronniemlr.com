---
title: export with no arguments prints everything
date: 2026-03-16
summary: 'An agent skill loaded an API key with export $(grep KEY .env). When the key was missing, that became a bare export, which printed every exported variable into the agent output.'
topics: [AI and agents, Command line and Git]
---

One of my Claude Code plugin skills generates images and needs a Gemini API key. The skill tells the agent to load the key from the project's `.env` file without ever printing it:

```bash
export $(cat .env | grep GEMINI_API_KEY | xargs)
```

That works when the key is there. When it isn't, `grep` prints nothing, the command substitution is empty, and the line becomes a bare `export`. With no arguments, `export` lists every exported variable and its value. That's what happened in a Claude Cowork session. The `.env` file didn't have the key, and the whole environment ended up in the tool output.

The agent made it more likely, too. It changed into the skill's own folder before running the command, so it looked for `.env` in the wrong place.

I added rules to the skill: run the command exactly as written, run it from the project root, and never run `cat .env`, `env`, or `printenv`. Rules like these are only instructions to the agent, so I also changed the command to fail safe:

```bash
LINE=$(grep '^GEMINI_API_KEY=' .env 2>/dev/null) && export "$LINE" && echo "SET (length: ${#GEMINI_API_KEY})" || echo "NOT SET"
```

If `grep` finds nothing, the `&&` chain stops before `export`, and the agent sees `NOT SET`. If it finds the key, the agent sees only its length.

A few details matter with this pattern. `export "$LINE"` keeps any quotes around the value, and a Windows line ending stays in the key. Also, Claude Code doesn't keep environment variables between separate Bash calls, so the script that uses the key has to run in the same command as the export. A tool that reads the file itself, like `uv run --env-file .env`, avoids the export completely.
