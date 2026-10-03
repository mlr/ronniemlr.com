---
title: pulumi import gave me stale code
date: 2025-04-07
summary: 'Someone changed an ECR lifecycle policy in the console. pulumi import printed code for it, but with the old values, because the resource was still in state.'
topics: [AWS]
---

Our AWS infrastructure lives in Pulumi with Python, and someone changed the ECR lifecycle policies in the console. I wanted to pull the live settings back into code instead of retyping them.

`pulumi refresh` updates the state from the live resource, but it doesn't touch your code. `pulumi import` generates code, so I tried that:

```sh
pulumi import aws:ecr/lifecyclePolicy:LifecyclePolicy my-repo-policy my-repo
```

It failed with an error that the resource was registered twice, because the policy was already in the stack. It still printed generated code, so I used it. Then I noticed the code said to keep 10 images, and the live policy said 5. The code from the failed import had the old values.

The fix was to remove the resource from state, then import it again:

```sh
pulumi state delete --force \
  'urn:pulumi:staging::my-project::aws:ecr/lifecyclePolicy:LifecyclePolicy::my-repo-policy'
pulumi import aws:ecr/lifecyclePolicy:LifecyclePolicy my-repo-policy my-repo --out policy.py
```

`--force` is needed when the resource is protected. Don't run `pulumi up` between those two commands, or Pulumi tries to create a resource that already exists.

While I was in there, I replaced the escaped JSON string from the import with `json.dumps({...})`, which is much easier to read in a diff.
