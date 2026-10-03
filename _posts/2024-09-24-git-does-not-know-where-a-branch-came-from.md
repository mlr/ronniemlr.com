---
title: Git doesn't know where a branch came from
date: 2024-09-24
summary: 'A CI step needed the branch that another branch was created from. Git does not store that. The pull request does.'
topics: [Command line and Git]
---

I had a CI job that builds a preview of a branch. To build it against the right versions of everything else, it needed to know which branch that branch was started from, for example a release branch or main. The job had only the repo and the branch name.

I tried a lot of ways to get that from git and the GitHub API:

- `git show-branch --merge-base` gives a commit, not a branch name.
- `git rev-parse --abbrev-ref` on that commit gives back nothing.
- The line above `*` in `git show-branch` looks like the parent. It's the previous branch in name order.
- The branches API has no parent field. The jq paths I was handed for one don't exist.

Git doesn't store a parent for a branch. A branch is a pointer to a commit, and two branches made from the same commit look the same once they exist.

A pull request does have a base branch:

```sh
gh pr view my-branch --repo my-org/my-repo --json baseRefName --jq .baseRefName
```

Or with the API, which can also find closed and merged pull requests:

```sh
gh api "repos/my-org/my-repo/pulls?head=my-org:my-branch&state=all" --jq '.[0].base.ref'
```

Without `state=all`, the API returns only open pull requests. If the branch has no pull request, the job should fail with a clear message instead of guessing.
