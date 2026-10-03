---
title: Block Public Access wins over a public bucket policy
date: 2024-08-22
summary: 'A static site in S3 behind CloudFront returned 403s with Block Public Access on. Origin Access Control fixed it, and a CloudFront Function fixed folder URLs.'
topics: [AWS]
---

I was putting a small static website in S3, with CloudFront in front for HTTPS and caching. S3 Block Public Access was on for the bucket, and I didn't want to turn it off to serve a few HTML pages. My first idea was a public-read bucket policy next to Block Public Access. CloudFront returned 403 for everything.

Block Public Access overrides bucket policies. Two of its four settings are about policies. `BlockPublicPolicy` rejects a new policy that grants public access, and `RestrictPublicBuckets` makes S3 ignore a public policy that is already there.

If you really want a public bucket, turn off only those two settings and leave the two ACL settings on. The better fix is to keep the bucket private and let only CloudFront read it, with Origin Access Control:

```json
{
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
    }
  }
}
```

That fixed the 403s, but folder URLs stopped working. Origin Access Control needs the bucket's REST endpoint as the origin, not the S3 website endpoint. The REST endpoint doesn't turn `/privacy` into `/privacy/index.html`. A small CloudFront Function on viewer request does:

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.split('/').pop().includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
```

Without `s3:ListBucket` in the policy, a missing object comes back as 403, not 404. And skip the single-page-app advice that maps every 403 and 404 to `/index.html` with a 200. On a plain site, that turns every mistyped URL into your home page. Send them to a real 404 page with a 404 status.
