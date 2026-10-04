---
title: Tailwind didn't scan my UI package
date: 2026-02-12
summary: 'Components from a shared UI package in a pnpm monorepo rendered without their padding and layout. Tailwind v4 does not scan workspace packages, and my @source path was one directory short.'
topics: [JavaScript]
---

I set up a pnpm monorepo with a shared UI package of shadcn-style components, used by two apps. I had copied the components from a standalone design system where they looked right. In the apps, the padding and layout were broken, and there was no error.

The classes that only the package used, like `px-6`, `py-6`, `rounded-xl`, and `gap-6`, weren't in the CSS output. Tailwind v4 finds classes by scanning your files, but it skips `node_modules` and anything git ignores, and a workspace package is linked into `node_modules`. So Tailwind never saw the components.

`@source` adds a path to scan. I added one to each app's CSS, along with a few other changes, and the components were still broken. The path was one directory short. It pointed at `apps/packages/ui`, which doesn't exist. Tailwind resolves `@source` relative to the CSS file it's in, which was `apps/web/src/styles.css`, and a path that doesn't exist fails silently. Going up one more level fixed it:

```css
@import "@repo/ui/styles.css";
@source "../../../packages/ui";
```

The components rendered correctly after that. If you have many apps, you can also put the `@source` in the UI package's own `styles.css`, pointing at its components, so each app doesn't need a relative path into the repo.
