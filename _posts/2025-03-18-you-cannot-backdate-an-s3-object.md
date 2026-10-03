---
title: You can't backdate an S3 object
date: 2025-03-18
summary: 'To test a stale-file cleanup, I tried to make an S3 object look two weeks old. Every write resets Last-Modified, and S3 has no way to set it.'
topics: [AWS]
---

I was testing a job that treats S3 objects as stale once they're older than two weeks. I needed an object that looked two weeks old, so I copied one onto itself with a backdated metadata value:

```sh
aws s3 cp s3://my-bucket/path/obj s3://my-bucket/path/obj \
  --metadata "touched=$(date -u -v-14d +%Y-%m-%dT%H:%M:%SZ)" \
  --metadata-directive REPLACE
```

The command worked, and `Last-Modified` on the object became the current time. A copy in place is a write, and S3 sets `Last-Modified` on every write. It's system metadata, so you can't set it yourself, and `aws s3 sync` doesn't carry it over either.

You can keep your own date in user metadata, as above, and read it back with `head-object`:

```sh
aws s3api head-object --bucket my-bucket --key path/obj
```

That only helps if the code under test reads that metadata instead of `LastModified`. For a test, it's easier to make the age threshold or the clock injectable, or to run against a local S3 such as moto or LocalStack.

Also watch for a side effect of the copy. `REPLACE` throws away any metadata you don't pass again, including `Content-Type`.
