---
title: Bootstrap 2 caps you at jQuery 2
date: 2025-05-31
summary: 'Moving an old app from jQuery 1.12 to 3.7 broke dropdowns with "unrecognized expression: #". Bootstrap 2 passes the selector "#" to jQuery.'
topics: [JavaScript]
---

An older server-rendered app still ran jQuery 1.12.4 with Bootstrap 2.3.2, and jQuery that old has known XSS vulnerabilities. I wanted to get it onto a version that still gets security fixes.

jQuery 2.2.4 went in cleanly, and the browser tests all passed. But 2.2.4 has the same unpatched CVEs as 1.12.4, so it could only be a step on the way.

jQuery 3.7.1 broke on the first click of a dropdown:

```
Syntax error, unrecognized expression: #
```

Bootstrap 2's dropdown code reads the toggle's `href`, and for a link with `href="#"` it ends up calling `$("#")`. jQuery 1 and 2 return an empty set for that, and jQuery 3 throws. Bootstrap 3.3 and later guard against it. In Bootstrap 2 you can patch `getParent()`:

```js
// Bootstrap 2.3.2 getParent(), patched to skip a bare "#"
$parent = selector && selector !== '#' && $(selector)
```

Patching a vendored Bootstrap 2 gets you running, but the real limit is that your Bootstrap version sets the newest jQuery you can use. I decided to move to Bootstrap 4 with jQuery 3. Bootstrap 4 is past its end of life too, and Bootstrap 5 drops jQuery entirely, so that's the longer-term target.

If you do the same, run jQuery Migrate first. It logs every deprecated call your code makes. And the XSS fixes need jQuery 3.5 or later, so 3.4 isn't enough.
