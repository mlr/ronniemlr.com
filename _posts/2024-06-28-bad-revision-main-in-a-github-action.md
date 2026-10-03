---
title: "fatal: bad revision 'main' in a GitHub Action"
date: 2024-06-28
summary: 'A pull request check could not diff against main. The runner has a shallow clone and no local main branch.'
topics: [Command line and Git]
---

A repo kept its URL redirects in one file, one rule per line, and a bad rule meant visitors landed on a 404. I wanted pull requests to check only the rules they add, so I wrote a small JavaScript action that diffs that file against main and requests each new URL. On the runner it failed right away:

```
fatal: bad revision 'main'
```

The cause is how `actions/checkout` sets up the repo. By default it fetches a single commit, the merge commit for the pull request, and checks it out on a detached HEAD. There is no local `main` branch, so `git diff main -- file` has nothing to compare against.

Fetch main and diff against the remote-tracking ref instead:

```js
const git = simpleGit();
await git.fetch('origin', 'main');
const diff = await git.diff(['origin/main', '--', filePath]);
```

The same thing as a plain step:

```yaml
- uses: actions/checkout@v4
- run: |
    git fetch --depth=1 origin main
    git diff origin/main -- path/to/file.txt
```

One suggestion I got was to add `git reset --hard origin/main` after the fetch. That replaces the pull request's files with main's, so the diff comes back empty and the check passes every time.

If you need real history, for example to diff from the merge base with `origin/main...HEAD`, set `fetch-depth: 0` on the checkout step.
