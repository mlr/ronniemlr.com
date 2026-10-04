---
title: The caller talked during a tool call
date: 2026-06-20
summary: 'My phone agent cancels its turn when the caller speaks. If that happened during a tool call, every later API request failed. The first fix dropped the tool result, and that caused a double booking.'
topics: [AI and agents, JavaScript]
---

I built a phone agent that answers calls and books appointments for a service business. The caller's speech arrives as text over a telephony websocket, and a Node service calls the OpenAI Chat Completions API with tools for things like checking availability and booking. When the caller starts talking, the service cancels the current turn and starts a new one. A generation counter marks the old turn as stale.

In February a caller spoke while a slow tool call was running. The new turn removed the assistant message that had the unanswered `tool_calls`. Then the old tool call finished and added its result to the conversation, with nothing before it to answer. Every request after that failed:

```
400 Invalid parameter: 'tool_call_id' of 'call_...' not found in 'tool_calls' of previous message.
```

The error handler only said "I'm sorry, I had a momentary issue. Could you repeat that?", so the call looped on that line.

The API has a strict rule here. An assistant message with `tool_calls` has to be followed by one `tool` message for each `tool_call_id`, and every `tool` message has to answer a call in the assistant message just before it. The first fixes kept the history valid by throwing away a tool result when its turn had gone stale. In March I added the same discard to the path that runs tools one at a time, plus a repair in the error handler that deletes `tool` messages with no matching call. The tests passed.

That discard caused the next bug. A caller interrupted while a booking was running. The booking succeeded, but its result was thrown away, so the model never learned about it. It tried to book again, the backend rejected the slot because it was now taken, and the agent told the caller the time was "just taken".

The fix in June keeps the result. When a tool finishes after its turn has gone stale, the service adds the call and its result back to the history as a matched pair:

```js
if (session.generationId !== turnGen) {
  session.messages.push(
    { role: 'assistant', content: null, tool_calls: [call] },
    { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) },
  );
  return;
}
```

Every tool that changes something now runs one at a time, and booking a slot the same call already booked returns the first result instead of booking again. A test that interrupts a booking halfway failed on the old code and passes on the new one.

One detail matters when you add the pair back. It has to go in at a turn boundary. If the new turn has its own `tool_calls` open, putting the old pair in the middle splits that call from its result and breaks the same rule again.
