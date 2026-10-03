---
title: nginx returned 405 for PATCH
date: 2025-12-29
summary: 'A JavaScript client got 405 Not Allowed from nginx on a PATCH that Rails would have accepted. A method allowlist in the nginx config left PATCH out.'
topics: [Ruby and Rails]
---

A booking flow sends a `PATCH` from JavaScript each time the user finishes a step, to a Rails route declared with `resources ... only: [:create, :update]`. The PATCH came back `405 Not Allowed`, and the response was nginx's own HTML error page. Rails never saw the request.

Running `curl -v -X PATCH` against the endpoint returned the same nginx page with no `Location` header, so it wasn't a redirect that changed the method. The nginx config had a method allowlist like this one:

```nginx
if ($request_method !~ ^(GET|POST|HEAD|OPTIONS|PUT|DELETE)$) {
  return 405;
}
```

PATCH wasn't in it. Adding it and reloading nginx fixes the request:

```nginx
if ($request_method !~ ^(GET|POST|HEAD|OPTIONS|PUT|PATCH|DELETE)$) {
  return 405;
}
```

A gap like this can go unnoticed for a long time because of how Rails forms work. An HTML form can only send GET or POST, so Rails sends updates from forms as a POST with a hidden `_method=patch` field. Every form in the app passes the allowlist, and only a client that sends a real PATCH runs into it.

Switching the JavaScript to `PUT` also works, since Rails routes PUT to `update` too, but that leaves the allowlist wrong for the next client. If a 405 is still there after the nginx fix, check the load balancer, WAF or CDN for their own lists of allowed methods.
