---
title: find -path "./node_modules/*" only matches the top level
date: 2026-02-12
summary: 'My lines-of-code alias counted about 100,000 extra lines in a monorepo: nested node_modules, build output, and Wrangler temp files. The exclusion patterns only matched at the top level.'
topics: [Command line and Git]
---

I have a shell alias that counts lines of source code with `find` and `wc`. In a monorepo with several apps under `apps/`, the total came out about 100,000 lines too high. The end of the output showed why. It counted files in each app's `node_modules`, in `dist/` build output, and in `.wrangler/` temp bundles. It also skipped `.ts` and `.tsx` files, which is most of the code in that repo.

The alias excluded `node_modules` like this:

```sh
-not -path "./node_modules/*"
```

`-path` matches the whole path from where `find` started, so `./node_modules/*` only matches the `node_modules` directory at the top. `./apps/web/node_modules/...` doesn't match. A leading `*` matches at any depth:

```sh
alias loc='find . -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.wrangler/*" \( -name "*.rb" -o -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) | xargs wc -l'
```

`-not -path` still walks into those directories and throws the results away. On a big tree, `-prune` is faster because it skips them. In a git repo, `git ls-files` avoids the exclusion list, because it already leaves out what `.gitignore` ignores.
