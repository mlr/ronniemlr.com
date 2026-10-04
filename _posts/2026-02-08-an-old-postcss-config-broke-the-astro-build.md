---
title: An old PostCSS config broke the Astro build
date: 2026-02-08
summary: 'After I moved a new Astro site into an old Jekyll repo, the build failed with "module is not defined in ES module scope". Vite had found the old CommonJS postcss.config.js.'
topics: [JavaScript]
---

I rebuilt my company site in Astro and moved it into the repo of the old Jekyll site, so the old build files were still at the root. The first build failed:

```
[astro:build] Failed to load PostCSS config (searchPath: <repo>): [ReferenceError] module is not defined in ES module scope
```

The new site uses Tailwind v4 through `@tailwindcss/vite`, which doesn't need PostCSS at all. But Vite looks for a PostCSS config on its own, and it found the Jekyll site's `postcss.config.js`, which used `module.exports` and `require`. The new `package.json` has `"type": "module"`, so Node loads every `.js` file as an ES module, and `module` doesn't exist there.

I didn't need that config anymore, so I deleted it, and later the old `tailwind.config.js` and the rest of the Jekyll files. The build finished with no warnings.

If you still need the PostCSS config in a `"type": "module"` package, rename it to `postcss.config.cjs` or change it to `export default { ... }`.
