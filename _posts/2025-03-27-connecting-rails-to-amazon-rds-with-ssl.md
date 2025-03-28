---
title: Fixing Self-Signed SSL Errors When Connecting to RDS
description: A guide to resolving SSL issues when connecting a Rails application to Amazon RDS.
keywords: Rails, Amazon RDS, SSL, database, OpenSSL, Docker
tags: Rails, AWS, RDS, SSL, Database Configuration
---

When connecting an application (in this case, a Rails application) to Amazon RDS
using SSL, you may encounter connection issues related to self-signed
certificates. RDS uses self-signed root certificates, which are not always
trusted by default. Here’s how to investigate and resolve these issues.

## Setting Up SSL

To enable SSL, the first step was modifying the `Dockerfile` to download the RDS certificate:

```dockerfile
# Download AWS RDS Certificate
RUN mkdir -p config/certs && \
    curl -o config/certs/rds-ca-root.pem https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem
```

Next, the `database.yml` was updated to enable SSL:

```yaml
production:
  adapter: mysql2
  encoding: utf8mb4
  collation: utf8mb4_unicode_ci
  reconnect: true
  pool: 25
  url: <%= ENV['DATABASE_URL'] %>
  ssl: true
  ssl_ca: <%= Rails.root.join('config/certs/rds-ca-root.pem') %>
  ssl_mode: :verify_identity
```

Despite these updates, the connection still failed with an SSL error.

## The Issue

When the connection was being attempted, this error appeared:

> ActiveRecord::ConnectionNotEstablished: TLS/SSL error: self-signed certificate in certificate chain

This happens because AWS RDS uses self-signed root certificates, which aren’t
always trusted by default.

## Investigating the Certificate

To confirm that the issue is related to the certificate, inspect it using OpenSSL:

```bash
openssl x509 -in us-west-2-bundle.pem -text -noout
```

For a more targeted check, verify the subject and issuer:

```bash
openssl x509 -in ~/Downloads/us-west-2-bundle.pem -text -noout | grep "Subject:"
openssl x509 -in ~/Downloads/us-west-2-bundle.pem -text -noout | grep "Issuer:"
```

If the result of each of these commands have `Amazon Web Services, Inc.`, then
the certificate is self-signed, confirming the need to explicitly trust it.

## Configuring SSL in Docker

The fix involves adding the RDS certificate to the Docker container’s trust
store, so it can trust the self-signed certificate.

The following example is for Alpine Linux:

```dockerfile
RUN apk add --no-cache ca-certificates
RUN cp /app/config/certs/rds-ca-root.pem /usr/local/share/ca-certificates/rds-ca-root.crt
RUN update-ca-certificates
```

Now that the certificate is trusted, the Rails app can connect to Amazon RDS using SSL.

## Verifying the Connection

To confirm the SSL connection, run this in the Rails console:

```ruby
ActiveRecord::Base.connection.execute("SHOW STATUS LIKE 'Ssl_cipher'").to_a
```

If successful, you’ll see output similar to:

```
=> [["Ssl_cipher", "TLS_AES_256_GCM_SHA384"]]
```

## Takeaways

- AWS RDS uses self-signed certificates that require explicit trust.
- Containerized environments need manual certificate installation.
- Always test and verify your SSL setup in a staging environment, if possible.

Happy Connecting! 🚀🔒

## Resources

- [AWS RDS SSL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- [Download Latest RDS Certificates](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.CertificateRotation)
- [OpenSSL Command Reference](https://www.openssl.org/docs/manmaster/man1/openssl.html)
