---
title: Hanging up is the hard part
date: 2026-03-04
summary: 'My phone agent hung up before its last sentence finished, and once it greeted the caller again right after saying goodbye. Closing the socket drops queued speech, and a goodbye with an end-call tool call is already the last turn.'
topics: [AI and agents, JavaScript]
---

The phone agent I built for a service business ends a call with an end-call tool. The model calls it when the conversation is over, and the service then sends an "end" message on the telephony websocket. Replies stream to text-to-speech token by token. Getting the last few seconds of a call right took three tries.

In February the agent hung up with no goodbye. Sending "end" drops any speech still queued, and the tool ran right after the stream finished. The first fix flushed the speech, waited 800 ms, and then sent "end". A week later the agent hung up before it told the caller their appointment was booked. A confirmation like that takes 8 to 10 seconds to say.

A fixed delay can't fit every sentence, so the wait now comes from the length of the text, minus the time the speech has already been playing:

```js
// about 14 characters per second, plus a margin, between 3 and 15 seconds
const wait = clamp(text.length / 14 * 1000 - msSinceFirstToken + 1500, 3000, 15000);
```

In March a call ended like this:

```
Agent: ... Goodbye!
Agent: Hi <caller>, how can I help you today?
[hangup]
```

The model's last reply had the farewell text and the end-call tool call together. The code ran one more model round after any end-call tool, so the model could say goodbye. But it had already said it, so the extra round had nothing to say, and the model started the conversation over. The fix skips that round when the reply already has text, and goes straight to flush, wait, and end:

```js
if (session.pendingTerminal && result.content) {
  sendText(ws, '', true);
  await sleep(estimateTtsDrainMs(result.content, firstTokenAt));
  return sendEnd(ws);
}
```

A test that looks for a greeting after the end-call tool failed before the change and passes after it.

The 14 characters per second fits the voice I measured. A different voice or language speaks at a different rate, so a "playback finished" event from the speech provider would be better than an estimate, if the provider has one.
