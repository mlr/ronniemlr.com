---
title: Making the Claude GitHub Action open the PR
date: 2026-01-18
summary: 'Out of the box, the Claude Code GitHub Action pushes a branch and leaves a "Create PR" link. Getting it to open the PR under my own account took my own token and a prompt change, with two errors on the way.'
topics: [AI and agents, Docker and CI]
---

I set up the Claude Code GitHub Action on one of my repos, authenticated with my Claude subscription's OAuth token from `claude setup-token`. I wanted an issue labeled `claude` to end as a finished pull request opened under my account. The default setup gets partway there. It pushes a branch as the bot and leaves a "Create PR" link in its comment.

The first run failed in the prepare step:

```
Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable
Could not fetch an OIDC token. Did you remember to add `id-token: write` to your workflow permissions?
```

When you don't pass your own `github_token`, the action uses an OIDC token to get an installation token for the Claude GitHub App, and a job can only request an OIDC token with `id-token: write`. Adding that permission fixed it, and the next run commented that it had finished the task.

Next I wanted the PR to come from me, not the bot. I passed a personal access token as `github_token`, and also as `GH_TOKEN` so the `gh` CLI in Claude's shell commands would use it. That run failed when the action tried to comment on the issue:

```
HttpError: Resource not accessible by personal access token
```

The workflow's `permissions:` block doesn't help with this, because it only applies to the built-in `GITHUB_TOKEN`. A personal access token has only the access you gave it when you made it. A fine-grained token needs read and write on Contents, Issues, and Pull requests for the repo. When the repo belongs to an organization, the token's resource owner has to be that organization, and the organization may have to approve it.

The last part was the PR itself. The action already pushes a branch, but whether it opens a PR depends on the prompt, so I added an instruction:

{% raw %}
```yaml
- uses: anthropics/claude-code-action@v1
  env:
    GH_TOKEN: ${{ secrets.MY_PAT }}
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    github_token: ${{ secrets.MY_PAT }}
    label_trigger: "claude"
    prompt: |
      After you commit for an issue, open a PR with gh pr create
      and put "Closes #<issue>" in the body.
```
{% endraw %}

Now a labeled issue becomes a PR in my name, and merging the PR closes the issue. Because the agent acts with my token, I also had to limit who can start it, which I wrote about in [a separate note](/2026/01/17/there-is-no-author-association-on-sender/).
