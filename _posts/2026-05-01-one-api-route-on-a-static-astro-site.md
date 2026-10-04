---
title: One API route on a static Astro site
date: 2026-05-01
summary: 'Two static Astro sites on Cloudflare Workers each had one contact form route. Between them they hit five failures, and every fix came down to which requests reach the worker.'
topics: [Cloudflare, JavaScript]
---

This year I built two marketing sites with the same setup: Astro with the Cloudflare adapter, deployed as a Worker with static assets. Each site is static except for one `/api/contact` route that sends the contact form by email. Between them I hit five failures, and they were all about the same question. Which requests actually reach the worker?

**The route was prerendered.** On the first site, `POST /api/contact` returned 404. The route was built as a static file like every other page. Marking it as server-rendered fixed it:

```ts
export const prerender = false;
```

**There was no worker.** On the second site, the same POST returned 404 for a different reason. `wrangler.toml` had an `[assets]` section and no `main`, so Cloudflare served the files and never ran any code. The upload size gave it away at 0.31 KiB. With `main`, `nodejs_compat`, and the assets binding, the upload was about 3.4 MB and the route answered with its own JSON.

**The secret was an empty string.** The route then returned its own "Server configuration error". A debug line showed the API key had length 0. An agent had run `wrangler secret put` for me in a non-interactive shell, and Wrangler stored an empty value instead of waiting for input. Running it in my own terminal fixed it. You can also pipe the value in:

```sh
printf '%s' "$KEY" | npx wrangler secret put RESEND_API_KEY
```

**The worker was about to become a public file.** A deploy stopped with `Uploading a Pages _worker.js directory as an asset`. The build writes the server code to `dist/_worker.js`, inside the assets directory. Adding `_worker.js` to `public/.assetsignore` fixed it, after I rebuilt. The first deploy after the change still used the old `dist/`.

**Unknown paths crashed the worker.** A missing page returned Cloudflare error 1101 with HTTP 500, not a 404, because every request that didn't match a file went to the worker. A `404.astro` page alone didn't change that, and neither did rewriting `_routes.json` after the build. The fix was to run the worker only for the API and let the assets handle everything else:

```toml
main = "./dist/_worker.js/index.js"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "404-page"
run_worker_first = ["/api/*"]
```

After that, `/does-not-exist` returned a 404 with the site's 404 page.

All five fixes ended up in the same file. `run_worker_first` decides which paths run code, and the rest of the config decides what happens to everything else. These sites were on Astro 5. Astro 6 and the newer Cloudflare adapter change the build output, so check the adapter docs before copying this.
