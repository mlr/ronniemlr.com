---
title: An axios upgrade dropped my POST body
date: 2025-03-07
summary: 'After moving from axios 0.19 to 0.29, POSTs written as post(url, null, { data }) arrived empty. The body belongs in the second argument.'
topics: [JavaScript]
---

An older Rails app had axios 0.19.2 in its front end, and a security advisory meant it had to move. The first step was 0.29.0.

That step broke a test. Requests that used to work arrived at the server with no body, and they were all written the same way:

```js
await api.post('/items', null, { data: body });
```

That passes `null` as the request body and tucks the real body into the config. With 0.19 the body still went out. With 0.29 the explicit `null` wins, and the request goes out empty. The fix is to put the body where axios expects it:

```js
await api.post('/items', body);
```

The default `Content-Type` didn't change. axios still sets a JSON content type for plain objects, so the missing body is the whole story.
