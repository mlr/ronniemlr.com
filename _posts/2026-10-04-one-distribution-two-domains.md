---
title: One distribution, two domains
date: 2026-10-04
summary: 'After this site moved to ronniemiller.com, both domains served the same pages from one CloudFront distribution, and every canonical URL still named the old one. A CloudFront Function now sends the old hosts to the new one.'
topics: [This site, AWS]
---

This site is static files on S3 behind CloudFront, and it moved from ronniemlr.com to ronniemiller.com. When I added SEO tags in October, an audit found the move was half done. Both domains returned 200 from the same CloudFront distribution, so there were two copies of the site. `url` in `_config.yml` still named the old domain, so every canonical URL, sitemap entry, and Open Graph URL pointed there. And the `www` names failed over HTTPS:

```
https://www.ronniemiller.com/ -> SSLError: [SSL: TLSV1_ALERT_INTERNAL_ERROR] tlsv1 alert internal error
http://www.ronniemiller.com/some/path?x=1 -> 301 http://ronniemiller.com/some/path?x=1
```

The certificate already covered all four names, and the distribution listed them all. The `www` records at DNSimple were URL redirect records, which only work over HTTP, so HTTPS to `www` never reached CloudFront.

A CloudFront Function on viewer request handles the duplicate. Every host except the new one gets a 301 to the same path and query on the new domain:

```js
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : "";
  if (host === "ronniemiller.com") return request;

  var parts = [];
  for (var key in request.querystring) {
    var entry = request.querystring[key];
    var values = entry.multiValue ? entry.multiValue : [entry];
    for (var i = 0; i < values.length; i++)
      parts.push(values[i].value === "" ? key : key + "=" + values[i].value);
  }

  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: {
      location: { value: "https://ronniemiller.com" + request.uri + (parts.length ? "?" + parts.join("&") : "") },
      "cache-control": { value: "max-age=3600" }
    }
  };
}
```

`aws cloudfront test-function` runs it before it's published. The old host got a 301 to the same post path with `?utm_source=x` kept, the new host passed through, and repeated keys came out as `?a=1&a=2&flag`. Then `update-distribution` attached it, and a diff of the saved config showed that only `FunctionAssociations` had changed. Live, `https://ronniemlr.com/` and a post URL with a query both return 301 to the new domain.

The rest was Jekyll. `url` names the new domain now, and the site has a sitemap and a `robots.txt` that points to it.

The `www` fix was a DNS change. Each `www` record is now a CNAME to the distribution's CloudFront domain, and both `https://www.` names return 301 to `https://ronniemiller.com/`.
