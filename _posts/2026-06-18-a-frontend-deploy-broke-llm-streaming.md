---
title: A frontend deploy broke LLM streaming
date: 2026-06-18
summary: 'After a deploy that changed only frontend code, every LLM call in a Node service failed with "Premature close". The image used a floating node:22-alpine tag, and the rebuild had picked up a new Node release.'
topics: [Docker and CI, JavaScript, AI and agents]
---

A Node service streams LLM replies with the OpenAI SDK. CI rebuilds its Docker image on every deploy, pushes it to `:latest`, and ECS runs that tag. After a deploy that changed only frontend code, every LLM call in the service failed:

```
LLM error: Premature close
```

The error count went from zero for three days to over a hundred an hour.

Restarting the service changed nothing, because ECS pulled the same `:latest` image. The environment, the secrets, the code, and the lockfile hadn't changed since April. The base image had. The Dockerfile said `FROM node:22-alpine`, a tag that moves with every Node 22 release, so the frontend deploy rebuilt the service on a newer Node. The image config showed `NODE_VERSION` 22.22.3 in the last good image and 22.23.0 in the bad one. The service used SDK 4.x, which streams through node-fetch 2 and a keep-alive agent, not Node's built-in fetch.

A git rollback couldn't fix this. The rollback build pulled `node:22-alpine` again and got the same new Node. It also failed on its own, because an old pinned Alpine package was no longer in the repository.

What got production back was pointing `:latest` at the last good image in ECR, without a build:

```sh
M=$(aws ecr batch-get-image --repository-name my-repo \
  --image-ids imageDigest=sha256:<good> --query 'images[0].imageManifest' --output text)
aws ecr put-image --repository-name my-repo --image-tag latest --image-manifest "$M"
aws ecs update-service --cluster my-cluster --service my-svc --force-new-deployment
```

The new tasks had no errors. Then I upgraded the SDK to v6, which uses Node's built-in fetch, and staging on the new Node had no `Premature close` errors either.

The upgrade had one surprise of its own. The service cancels a reply when the caller starts talking, and it ignores the error from that cancel by checking `err.name === 'AbortError'`. In v6 the cancel throws an `APIUserAbortError` whose `name` is `"Error"`, so the check missed it and the service treated every cancel as a failure. A check for both fixed it:

```js
function isAbortError(err) {
  return err?.name === 'AbortError' || err instanceof OpenAI.APIUserAbortError;
}
```

The Dockerfile now names an exact Node version. A version tag can still be moved upstream, so a digest is the only exact pin. Immutable image tags in ECR, one per commit, turn a rollback into a re-tag instead of a rebuild.
