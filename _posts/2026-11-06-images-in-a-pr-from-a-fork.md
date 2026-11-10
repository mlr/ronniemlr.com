---
title: Images in a PR from a fork
date: 2026-11-06
summary: 'I wanted test screenshots in a PR as native GitHub attachments. gh can attach files now, but only with write access to the repo that holds the PR. From a fork into a read-only repo, that left the web editor.'
topics: [AI and agents, Command line and Git]
---

Claude opens PRs for me, and I wanted the screenshots from my local tests in the PR description. I wanted them the way GitHub's web editor adds an image when you drag it in, as a `github.com/user-attachments/...` link, not as files pushed to a branch. In October Claude told me GitHub has no API for that. It tried an undocumented upload endpoint, which answered 404, and then found that gh 2.102.0 has `--attach` on `gh pr edit` and other commands. That PR still failed:

```
$ gh pr edit 123 --repo client/app --body-file body.md --attach a.png
attaching files requires write access to the repository
```

The PR was from my fork into the client's repo, where I have read access only. `--attach` uploads to the repo that holds the PR. That left the web editor. I signed in to GitHub in a fresh browser profile, and Claude uploaded each file in the PR's new comment box, copied the generated link, and never posted the comment. All 20 images showed on the PR page, and the comment box was empty.

Two weeks later, in another project, Claude said again that GitHub has no API for PR images and pushed an image-only branch to host them. I told it gh has a way. It ran `gh pr edit --help`, found `--attach`, and that one worked. The October lesson had gone into the memory folder for the project I started that session in, and the new project's memory was empty. Claude Code memory is per project folder, so a rule that should follow me everywhere belongs in `~/.claude/CLAUDE.md`.

Two other things went into PR descriptions that I didn't want, and neither is easy to take back.

A Claude session link showed up in two PR descriptions. My `commit-msg` hook already rejects those links, but a PR body goes through `gh pr create`, and no git hook sees it.

A PR body named three other PRs by number. Claude removed the sentence, but GitHub had already added a cross-reference event to each of those three PRs, and the timeline API still showed it after the edit. The reference stays when the text that made it is gone.

Both are memory rules for Claude now.
