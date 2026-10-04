---
title: Claude Code kept dropping on my home Wi-Fi
date: 2026-04-27
summary: 'For weeks Claude Code failed mid-session with ECONNRESET while browsers worked fine. I ruled out VPN leftovers, IPv6, Wi-Fi roaming, MTU, and my own Mac. Sending my traffic through Cloudflare WARP stopped it.'
topics: [AI and agents, Cloudflare]
---

Starting in February, Claude Code kept losing its connection in the middle of sessions on my home Wi-Fi:

```
Unable to connect to API (ECONNRESET)
Retrying in 5 seconds… (attempt 5/10)
```

Browsers and curl worked the whole time. Claude Code holds long streaming HTTPS connections to its API, so it notices drops that a page load never would. It happened on two different home networks, and by late April a fresh session got about one message through before it failed again.

These are the things I checked, roughly in order:

- **VPN leftovers.** I removed an old VPN client's LaunchDaemon and support folder. The number of `utun` interfaces went down, but many `utun` interfaces are normal on macOS, and the resets continued.
- **IPv6 and Handoff.** Turning both off on Wi-Fi changed nothing.
- **Wi-Fi roaming.** My Mac was switching between the router and a range extender on 5 GHz. Option-clicking the Wi-Fi menu shows which access point you're on. Staying on 2.4 GHz helped for a while, then the drops came back.
- **MTU.** A common suggestion is 1492. `ping -D -s 1472` passed, so the path carries full 1500-byte packets, and the lower MTU didn't hold.
- **My own Mac.** I turned off MCP servers and the application firewall, quit Docker, and removed an old file in `/etc/resolver`. It broke the same way each time.

Wireshark gave the clearest picture. When a session died, the API's address sent a burst of bare TCP resets. The TTL on those resets matched the TTL on normal packets from the same host, so no box near me was injecting them. A bare reset means the far end no longer knew about the connection, which points at something between my network and the API dropping connection state, not at my laptop.

```
# Does the path carry 1500-byte packets? 1472 + 8 ICMP + 20 IP = 1500
ping -D -s 1472 api.example.com

# Wireshark display filter for resets sent by the server
tcp.flags.reset == 1 and ip.src == 203.0.113.10
```

What stopped it was sending my Mac's traffic through Cloudflare WARP, which carries it in a tunnel to Cloudflare's network and takes a different path to the API. Getting WARP itself to connect [took a detour through a Docker setting](/2026/04/27/warp-blamed-1password-but-docker-was-in-the-way/). Since I switched to WARP, the resets have stopped.
