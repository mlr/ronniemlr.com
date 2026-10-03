---
title: wkhtmltopdf in an Alpine image
date: 2025-05-21
summary: 'A gem binstub hid the binary I copied in, PDFs came out as black boxes without fonts, and a commented-out package broke it again a month later.'
topics: [Ruby and Rails, Docker and CI]
---

A Rails app makes PDFs with wicked_pdf, which runs the wkhtmltopdf binary, and the app runs in an Alpine-based Docker image. Alpine no longer packages wkhtmltopdf, so the Dockerfile copies the binary out of a prebuilt image:

```dockerfile
FROM --platform=linux/amd64 surnet/alpine-wkhtmltopdf:3.20.1-0.12.6-small AS wkhtmltopdf
FROM ruby:3.3-alpine
RUN apk add --no-cache libxrender fontconfig freetype ttf-dejavu ttf-liberation
COPY --from=wkhtmltopdf /bin/wkhtmltopdf /usr/local/bin/wkhtmltopdf
```

### April: the wrong binary

The first error didn't come from that binary at all:

```
Invalid platform ... missing binary: wkhtmltopdf_alpine_3.16.3_amd64
```

The bundle also had the `wkhtmltopdf-binary` gem, and its binstub was first on the PATH. wicked_pdf found the gem's wrapper, and the wrapper had no build for this Alpine version. Pointing wicked_pdf at the copied binary fixed it:

```ruby
# config/initializers/wicked_pdf.rb
WickedPdf.config = { exe_path: '/usr/local/bin/wkhtmltopdf' }
```

The next PDF rendered every character as a black box, because the image had no fonts. Adding the font packages, the `ttf-*` ones above, fixed it. I had also added OpenSSL packages on a suggestion, and they turned out not to be needed.

### May: libXrender

After a Rails upgrade, PDFs failed again:

```
Error loading shared library libXrender.so.1
```

The `libxrender` line in the `apk add` list had been commented out by accident. Uncommenting it was all it took.

When wkhtmltopdf breaks, start with `which -a wkhtmltopdf`, then `file` and `ldd` on the binary that actually runs. Also worth knowing is that wkhtmltopdf has been archived and unmaintained since 2023, so don't feed it HTML you don't control.
