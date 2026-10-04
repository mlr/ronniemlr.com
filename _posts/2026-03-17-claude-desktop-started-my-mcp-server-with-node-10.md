---
title: Claude Desktop started my MCP server with Node 10
date: 2026-03-17
summary: 'An MCP server that worked in Claude Code crashed in Claude Desktop with a SyntaxError on its first import. Desktop builds its own PATH, and with nvm that PATH starts at the oldest Node.'
topics: [AI and agents, JavaScript]
---

I use a community Trello MCP server that starts with `bunx`, and it worked fine in Claude Code from a terminal. I wanted the same server in Claude Desktop on my Mac, so I copied the config over. Desktop showed "Server disconnected", and its log had this:

```
Failed to spawn process: No such file or directory
```

Claude Desktop doesn't start servers from your shell, so it never sees the PATH your shell config builds. `bunx` lives in `~/.bun/bin`, which wasn't on Desktop's PATH. An absolute path fixed the spawn error:

```json
"command": "/Users/you/.bun/bin/bunx"
```

Then the server started, received the `initialize` message, and crashed on its first `import` line:

```
SyntaxError: Unexpected token {
```

The stack trace pointed at an old Node, and the Desktop log explained why. It prints the PATH it uses, and that PATH listed every nvm Node directory in lexical order before the system directories. I have about 23 Node versions installed through nvm, and v10.24.1 sorts first. The package runs `node` from PATH, so it got Node 10, which can't parse ES module imports.

At first I thought my Trello key and token weren't reaching the server. They were. The crash happens while Node parses the file, before the server looks at its credentials.

What worked was setting `PATH` and `NODE` in the server's `env`, with the Node version I actually use first:

```json
"trello": {
  "command": "/Users/you/.bun/bin/bunx",
  "args": ["<trello-mcp-package>"],
  "env": {
    "TRELLO_API_KEY": "...",
    "TRELLO_TOKEN": "...",
    "PATH": "/Users/you/.nvm/versions/node/v22.14.0/bin:/Users/you/.bun/bin:/usr/local/bin:/usr/bin:/bin",
    "NODE": "/Users/you/.nvm/versions/node/v22.14.0/bin/node"
  }
}
```

With those two set, the server started and worked in Desktop. PATH is the important one, because the package's shebang runs `node` from PATH. This pins a Node version, so the config has to change when that version goes. Removing old nvm versions you never use also keeps Desktop from finding an ancient Node first.
