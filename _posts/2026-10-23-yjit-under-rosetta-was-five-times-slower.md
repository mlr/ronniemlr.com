---
title: YJIT under Rosetta was five times slower
date: 2026-10-23
summary: 'A Rails test suite took 5 minutes per suite on an Apple silicon Mac. The container was amd64 under Rosetta with YJIT on, and one spec file ran in 3.5 minutes instead of 28 seconds.'
topics: [Docker and CI, Ruby and Rails]
---

A client's Rails app runs three test suites in Docker on my Mac before each push. The whole run took about 6.5 minutes, each suite took about 5, and I wanted it down to 3 or 4. The Mac is Apple silicon, and the app turns on YJIT, Ruby's JIT compiler. Those two together turned out to cost minutes.

The compose `web` service had `platform: linux/amd64`, so Ruby ran under Rosetta. YJIT comes on through `RUBYOPT=--yjit --yjit-exec-mem-size=32`. I timed one 174-example spec file four ways:

```
amd64 (Rosetta), no YJIT:  37.54 s
amd64 (Rosetta), --yjit:   3 min 27.7 s
arm64 (native),  no YJIT:  31.67 s
arm64 (native),  --yjit:   27.71 s
```

In the amd64 container, YJIT made the file five and a half times slower than no JIT at all. On native arm64 it was the fastest of the four.

`Gemfile.lock` already listed `aarch64-linux-musl`, so a native image was possible. I added a separate compose `ci` service built for `linux/arm64` with YJIT on, left `web` alone, and turned YJIT off in amd64 containers.

The Node suite for the voice agent had a different problem. One test file had 125 tests that waited on real silence timers, about 308 seconds in total. `node --test` runs files in parallel, but the tests in one file run one after another. I split it into 6 files by topic with the same test bodies. That suite went from 5 minutes 9 seconds to 1 minute 4 seconds, and all 1,029 tests still passed.

The full local run went from 6 minutes 26 seconds to 4 minutes 48 seconds on a very busy Mac, and to 4 minutes 11 seconds in a later run. Rosetta has [slowed me down before](/2025/02/04/tmux-was-running-as-x86-on-my-m4/), and I didn't see it coming either time.
