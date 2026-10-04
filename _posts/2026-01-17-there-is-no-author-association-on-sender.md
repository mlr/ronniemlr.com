---
title: There is no author_association on sender
date: 2026-01-17
summary: 'I tried to gate an agent workflow on a field of github.event.sender that does not exist. GitHub Actions does not fail on a missing field, so the check was always false and the job never ran.'
topics: [Docker and CI, AI and agents]
---

Once the Claude GitHub Action could push code and open PRs with my personal access token, I wanted to be sure a stranger couldn't start it on my public repo by opening an issue or commenting `@claude`. The workflow runs on labeled issues, issue comments, PR reviews, and PR review comments.

My first gate checked `author_association` separately for each event type. It worked, but it was long, so I tried a shorter version that read the association from the event's sender:

```yaml
if: contains(fromJson('["OWNER","MEMBER","COLLABORATOR"]'), github.event.sender.association)
```

The GitHub Actions extension in my editor flagged it with "Context access might be invalid: association". The warning was right. The association is on the comment, the review, and the issue, as `author_association`, but the `sender` object doesn't have one. GitHub Actions doesn't fail on a missing field. The expression evaluates to an empty string, the check is false, and the job is skipped without an error. A gate like that looks safe because nothing ever runs.

The gate I kept reads the association from the object that has it. For labeled issues it checks my login, because labeling is my own action:

```yaml
if: >-
  (github.event_name == 'issues' && github.event.label.name == 'claude' &&
   contains(fromJson('["my-user"]'), github.event.sender.login)) ||
  (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude') &&
   contains(fromJson('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association))
```

The review and review comment events get the same second form, with `github.event.review.author_association` and `github.event.comment.author_association`. A later run log showed "Trigger result: true" for one of my comments, so the comment path works.

I also removed a trigger. The workflow started on `workflow_run` when CI failed, so the agent could try to fix the failure. Nothing gated that path, so anyone could open a PR that fails CI on purpose and set the agent running with my token. Now I comment `@claude` on the PR when I want a fix.
