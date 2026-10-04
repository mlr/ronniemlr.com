---
title: 633 Worker versions and no way to delete them
date: 2026-01-21
summary: 'A viewer asked if Cloudflare cleans up old Worker versions the way GitHub deletes merged branches. It does not, and the API refused to delete a version with an API token.'
topics: [Cloudflare]
---

A viewer asked me if Cloudflare has a cleanup setting like GitHub's option to delete branches after merge, for the versions that pile up when a Worker deploys on every merge. I didn't know, so I looked at one of my own Workers.

A version is an uploaded snapshot of the Worker's code and config. A deployment says which version gets traffic, or which two during a gradual rollout. `wrangler deploy` creates both, so versions only grow. I counted them with the API:

```sh
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/my-worker/versions" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

`result_info.total_count` was 633. The same Worker had 10 deployments.

There's no retention setting and no wrangler command that prunes versions. Deleting one version through the API failed:

```json
{"code":10000,"message":"DELETE method not allowed for the api_token authentication scheme"}
```

The Global API Key might be allowed to do it, but that key has full access to the whole account, and it doesn't belong in a cleanup script. My answer to the viewer was that there's no built-in cleanup and that a community feature request for deleting old deployments is open.
