---
title: grammY's bot.start() never returns
date: 2026-02-05
summary: 'My Telegram bot received messages but never answered, and later its scheduled tasks never ran. Both times the code after await bot.start() was waiting for the bot to stop.'
topics: [JavaScript, AI and agents]
---

I run NanoClaw, an open-source personal Claude assistant, as a launchd service on my Mac. I moved its chat channel from WhatsApp to a Telegram bot built with grammY. One Node process runs the bot, a message loop, an IPC watcher, and a task scheduler.

After the switch, the log showed "Telegram message received" and the messages were in the database, but the bot never answered. The startup code looked like this:

```ts
await connectTelegram();   // calls await bot.start()
startMessageLoop();
```

In grammY, `bot.start()` starts long polling, and its promise resolves only when the bot stops. So `startMessageLoop()` never ran. Removing the `await` got replies working.

Three days later, chats worked but scheduled tasks didn't run. A retry wrapper for 409 errors had been added in between, and it put an `await bot.start(...)` back in front of `startSchedulerLoop()`. The log had no "Scheduler loop started" line. This time I moved the other loops into grammY's `onStart` callback, which runs once polling begins:

```ts
let started = false;
await bot.start({
  drop_pending_updates: true,
  onStart: () => {
    if (started) return;
    started = true;
    startSchedulerLoop();
    startIpcWatcher();
  },
});
// code here runs only after the bot stops
```

The `started` guard matters because of that retry wrapper. It calls `start()` again after a 409, and grammY calls `onStart` again each time, which would start a second scheduler.

The 409 itself was a separate problem:

```
GrammyError: Call to 'getUpdates' failed! (409: Conflict: terminated by other getUpdates request; make sure that only one bot instance is running)
```

Telegram allows only one long poll per bot. I was running `npm run dev` while the launchd service was polling too, and restarting the service while I also ran it by hand made more of them. Unloading the service before running the bot by hand stopped the 409s. Calling `bot.stop()` on SIGTERM and SIGINT, as the grammY docs show, lets the old poller end cleanly when launchd restarts it.
