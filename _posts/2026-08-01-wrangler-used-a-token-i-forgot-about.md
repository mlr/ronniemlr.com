---
title: Wrangler used a token I forgot about
date: 2026-08-01
summary: 'Twice this year Wrangler failed with an auth error while whoami looked fine. Once it used a cached account ID, and once it read an old API token from the project .env file.'
topics: [Cloudflare, Command line and Git]
---

I deploy Workers to my own Cloudflare accounts and to a customer's account from the same Mac. Wrangler can get credentials from at least five places: an environment variable, the project's `.env` file, its OAuth login, its cache, and `wrangler.toml`. Twice this year it used one I didn't expect.

In February I deployed a customer's Worker with an API token from their account, exported as `CLOUDFLARE_API_TOKEN`. The deploy failed:

```
A request to the Cloudflare API (/accounts/<OLD_ID>/workers/services/<name>) failed.
Authentication error [code: 10000]
```

`wrangler whoami` showed the right account. The account ID in the URL was mine, from an earlier test deploy of the same project. Wrangler had cached it, and the customer's token couldn't use my account. Clearing the cache is one way out, but the cache can live in more than one place depending on how you run Wrangler. Pinning the account in `wrangler.toml` doesn't depend on the cache at all, and with it both hostnames returned 200:

```toml
account_id = "0123456789abcdef0123456789abcdef"
```

In August, on one of my own projects, Wrangler kept telling me I was logged in, and `whoami` failed:

```
Invalid access token [code: 9109]
```

Running `wrangler login` didn't change anything. From another directory, `whoami` said I wasn't logged in at all. The difference was the project's `.env` file. It had an old `CLOUDFLARE_API_TOKEN`, and Wrangler v4 reads `.env` by itself. An API token wins over the OAuth login, so the expired token was used every time. Telling Wrangler to skip the file confirmed it:

```sh
npx wrangler whoami --env-file /dev/null
```

I commented out the token in `.env` and ran `wrangler login`. After that `whoami` showed an OAuth token and the deploy worked.

In both cases `whoami` didn't say where the credential came from. When auth fails and `whoami` looks fine, check which source gave Wrangler the token and which gave it the account ID.
