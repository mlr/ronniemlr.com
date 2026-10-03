---
title: Deploying a Cloudflare Worker from GitHub Actions
date: 2025-10-22
summary: 'An Astro site on Cloudflare Workers needed deploys on push, PR previews and a scheduled rebuild. A build script that ran tsc first, and the smallest API token that worked.'
topics: [Docker and CI, JavaScript]
---

I had an Astro site deployed as a Cloudflare Worker. It fetches its data at build time, so I wanted a deploy on every push, preview builds for pull requests, a rebuild every few hours, and a way to start one by hand.

Most of the advice I found was for Cloudflare Pages, not Workers, and they're separate products. Deploy hooks and per-environment variables in the dashboard are Pages features, and Workers Builds keeps build variables apart from runtime variables.

### The build

Builds failed with:

```
error TS2307: Cannot find module 'astro:content'
```

The build script ran `tsc && astro build`. `astro:content` is a virtual module that only exists while Astro builds, so plain `tsc` can't resolve it. Astro's own checker can:

```json
"build": "astro check && astro build"
```

### The token

Workers has no deploy hook to call on a schedule, so the scheduled and manual rebuilds run in GitHub Actions with `wrangler deploy`. Getting the API token right took four tries. With only Workers Scripts: Edit, the deploy failed on `/memberships`. Adding User Details: Read didn't help. Adding Memberships: Read got the upload through, and then the deploy failed on the zone's routes. This is the set that worked:

- Account: Workers Scripts, Edit
- User: Memberships, Read
- User: User Details, Read
- Zone: Workers Routes, Edit, for the one zone

The two User permissions are there because Wrangler calls `/memberships` to find your account ID. Setting `account_id` in the wrangler config, or `CLOUDFLARE_ACCOUNT_ID` in the workflow, gives Wrangler the account up front instead.
