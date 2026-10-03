---
title: In a rebase, ours and theirs swap places
date: 2024-09-11
summary: 'I wanted staging to win every conflict while rebasing onto it. That is -X ours, not -X theirs.'
topics: [Command line and Git]
---

A framework upgrade had lived on its own branch for weeks, while regular work kept landing on staging. Before it could merge, the upgrade branch needed a rebase onto staging, and staging had moved a lot. For every conflict I wanted staging's version. Staging was the source of truth, and I could redo my changes on top where needed.

The first answer I got was `git rebase -X theirs staging`. It sounds right, because in my head staging is "theirs", but it's backwards.

A rebase checks out the branch you rebase onto, then replays your commits on top of it one at a time. While that happens, "ours" is the branch being built on, staging here. "Theirs" is the commit being replayed, which is your own work.

So to let staging win:

```sh
git rebase -X ours staging
```

The same swap applies when you fix files by hand in the middle of a rebase. `git checkout --ours path/to/file` takes staging's copy, and `--theirs` takes yours.

`-X ours` decides only the conflicting hunks. Your changes that don't conflict still apply, which is usually what you want. If you need staging's version of a file no matter what, check that file out from staging after the rebase.

In a merge it's the other way around. `git merge -X ours staging` keeps the side of the branch you are on.
