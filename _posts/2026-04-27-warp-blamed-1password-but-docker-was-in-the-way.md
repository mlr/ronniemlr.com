---
title: WARP blamed 1Password, but Docker was in the way
date: 2026-04-27
summary: 'Cloudflare WARP refused to connect with CF_DNS_PROXY_FAILURE and named a 1Password helper. Stopping 1Password changed nothing. Turning off Docker Desktop''s kernel networking for UDP fixed it.'
topics: [Docker and CI, Cloudflare]
---

I was chasing dropped connections on my home network and wanted to send my Mac's traffic through a tunnel, to see if the problem followed the network path. Cloudflare WARP was the quickest way to test that. It refused to connect:

```
Error code: CF_DNS_PROXY_FAILURE
A third-party process is performing DNS resolution on this device: Browser\x20Helper.
```

"Browser Helper" is 1Password's browser helper. I quit 1Password, and launchd started the helper again, so I stopped its launcher too:

```sh
launchctl bootout gui/$(id -u)/com.1password.1password-launcher
```

Nothing from 1Password was running after that, and WARP showed the same error. `sudo lsof -i UDP:53` listed only mDNSResponder, so no other process held the DNS port.

The cause was Docker Desktop. Its setting to use kernel networking for UDP was on, and you can see it in the arguments of Docker's VM process:

```sh
ps aux | grep -o -- '--kernel-for-udp'
```

I turned that setting off in Docker Desktop, restarted Docker, and WARP connected.

If WARP names a process and stopping that process changes nothing, check this Docker setting next.
