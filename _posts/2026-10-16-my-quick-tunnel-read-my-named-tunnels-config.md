---
title: My quick tunnel read my named tunnel's config
date: 2026-10-16
summary: 'A Cloudflare quick tunnel returned 404 for every path. cloudflared had loaded ~/.cloudflared/config.yml, and the catch-all rule of my named tunnel answered first. An empty config file fixed it.'
topics: [Cloudflare, Command line and Git]
---

I wanted a public URL for a static demo site running on my Mac with `http-server` on port 8080. The same Mac runs a named Cloudflare tunnel for a webhook, set up in `~/.cloudflared`. For the demo, Claude started a quick tunnel, the kind that needs no account and gets a random `trycloudflare.com` name:

```sh
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8080
```

The trycloudflare URL printed and the tunnel registered, but the first checks failed with curl exit code 6. The Mac couldn't resolve the new hostname yet, and `dig @1.1.1.1` could. With `--resolve` to skip local DNS, every path came back 404, the page, the logo, and the videos.

The tunnel's log had a setting Claude hadn't passed:

```
Settings: map[cred-file:/Users/me/.cloudflared/<uuid>.json credentials-file:... url:http://127.0.0.1:8080]
```

That credentials file belongs to the webhook tunnel, and so does `~/.cloudflared/config.yml`:

```yaml
tunnel: my-webhook-tunnel
credentials-file: /Users/me/.cloudflared/<uuid>.json
ingress:
  - hostname: webhook.example.com
    service: http://localhost:8081
  - service: http_status:404
```

cloudflared reads that default config file even for a quick tunnel. The quick tunnel's hostname matched no rule, so every request fell through to the catch-all `http_status:404`.

Pointing the quick tunnel at an empty config leaves the real one alone:

```sh
printf '# empty: keeps the quick tunnel away from ~/.cloudflared/config.yml\n' > /tmp/cloudflared-empty.yml
cloudflared tunnel --no-autoupdate --config /tmp/cloudflared-empty.yml --url http://127.0.0.1:8080
```

cloudflared logs `ERR Configuration file ... was empty`, which doesn't matter. The page returned 200, and a byte-range request for a video returned 206, which iPhone Safari needs to play it.

Until local DNS catches up with a new trycloudflare name, curl can resolve it through another server:

```sh
curl --resolve "$host:443:$(dig +short "$host" @1.1.1.1 | head -1)" "https://$host/"
```

[Wrangler did something like this](/2026/08/01/wrangler-used-a-token-i-forgot-about/) to me in August, with a token in a config file I'd forgotten about.
