---
title: A subagent's model is not the main model
date: 2026-02-14
summary: 'I set an Agent SDK agent to Opus in my app''s settings, and it still ran on the default model. The setting only reached AgentDefinition.model, which applies when the agent runs as a subagent.'
topics: [AI and agents, JavaScript]
---

I have a small lab app that runs three Claude Agent SDK agents, each with its own job. A settings page picks the model for each agent. I set one of them to Opus, started a run, and the sessions table still said "sonnet". There was no error.

The setting went into the agent's `AgentDefinition`:

```ts
const agents = {
  "my-agent": { description, prompt, tools, model: settings.model },
};
```

`AgentDefinition.model` applies when the main agent starts that definition as a subagent. My app calls `query()` with the agent's prompt directly, so the main loop ran, and the main loop takes its model from `options.model`, which I hadn't set. The fix was to pass it there too:

```ts
for await (const msg of query({
  prompt,
  options: { model: agent.model, agents },
})) {
  // ...
}
```

The table still said "sonnet" after that, and that was a second bug. The API route that queued the run wrote a hardcoded `model: "sonnet"` into the session row, so the table never showed the setting anyway.

A column like that stores the model you asked for. To see the model that ran, read `model` from the SDK's init message, or `modelUsage` from the result message.
