---
title: localhost was IPv6 on one end
date: 2026-05-18
summary: 'An SSH tunnel to a dev server on a remote box loaded nothing, though the server said it was on localhost. The server listened on ::1 and the tunnel connected to 127.0.0.1.'
topics: [Command line and Git, JavaScript]
---

I was building a flow that starts a remote dev box for each GitHub issue. The box runs a coding agent and the Astro dev server, and my Mac reaches the preview through an SSH tunnel:

```sh
ssh -fN -L 30032:localhost:4321 my-devbox
```

The preview didn't load, even though Astro on the box said `Local http://localhost:4321/`. Two requests on the box showed why:

```sh
curl -s -o /dev/null -w "v4 %{http_code}\n" http://127.0.0.1:4321/
curl -s -o /dev/null -w "v6 %{http_code}\n" "http://[::1]:4321/"
```

```
v4 000
v6 200
```

Vite, which runs Astro's dev server, listens on `localhost` by default, and Node used the first address that name resolved to on that box, which was `::1`. The tunnel's `localhost` connected to `127.0.0.1`. Both ends said "localhost" and meant different addresses.

Pointing the tunnel at the IPv6 address worked. The address has to be quoted in zsh, or zsh reads the brackets as a glob and fails with `no matches found`:

```sh
ssh -fN -L "30032:[::1]:4321" my-devbox
```

Later I started the dev server with an explicit host so it doesn't depend on how `localhost` resolves. The clearest setup uses the same address at both ends, for example `--host 127.0.0.1` on the server and `127.0.0.1` in the tunnel.
