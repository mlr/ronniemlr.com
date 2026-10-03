---
title: Connecting Rails to Amazon RDS with SSL
description: A guide to setting up secure SSL connections between Rails applications and Amazon RDS databases, including troubleshooting self-signed certificate issues in Docker environments.
keywords: Rails, Amazon RDS, SSL, database, OpenSSL, Docker
tags: Rails, AWS, RDS, SSL, Database, Configuration
image: /images/banner/connecting-rails-to-amazon-rds-with-ssl.png
image_insert_order: 2 # number of paragraphs after which the image will be inserted
summary: 'Download the regional RDS certificate bundle, set `ssl_mode` in database.yml, and fix self-signed certificate errors in Docker.'
topics: [Ruby and Rails, AWS, Databases]
---

Securing your database connections is a critical aspect of application security,
especially when your application deals with sensitive data.

Amazon RDS supports SSL/TLS encrypted connections, which protect data in transit between your Rails
application and your database.

This guide walks you through setting up secure
SSL connections between Rails and Amazon RDS, including troubleshooting common
issues like self-signed certificate errors.

## Setting Up SSL for Amazon RDS with Rails

### Basic Configuration

To enable SSL for your Rails application connecting to Amazon RDS, you'll need
to:

1. Download the appropriate RDS certificate for your AWS region
2. Configure your Rails application to use SSL when connecting to the database

### Downloading the RDS Certificate

The first step is to download the appropriate certificate bundle for your AWS
region. You can add this to your `Dockerfile` for containerized applications:

```
# Download AWS RDS Certificate
RUN mkdir -p config/certs && \
    curl -o config/certs/rds-ca-root.pem https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem
```

Replace `us-west-2` with your specific AWS region in both places.

### Configuring database.yml

Next, update your `database.yml` file to enable SSL connections:

For MySQL:
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

For PostgreSQL:
```yaml
production:
  adapter: postgresql
  encoding: unicode
  url: <%= ENV['DATABASE_URL'] %>
  sslmode: verify-full
  sslrootcert: <%= Rails.root.join('config/certs/rds-ca-root.pem') %>
```

The SSL mode options serve different purposes:
- `:verify_identity` or `verify-full` (most secure): Verifies that the server certificate is issued by a trusted CA and that the server hostname matches the certificate's Common Name
- `:verify_ca` or `verify-ca`: Verifies that the server certificate is issued by a trusted CA, but doesn't check the hostname
- `:required` or `require`: Encrypts the connection but doesn't verify the server certificate

## Common SSL Connection Issues

Despite proper configuration, you might encounter several common issues when
connecting to RDS with SSL.

### Self-Signed Certificate Errors

A frequent issue when connecting to RDS with SSL is related to self-signed
certificates. When the connection is attempted, you might see an error like:

```
ActiveRecord::ConnectionNotEstablished: TLS/SSL error: self-signed certificate in certificate chain
```

This happens because AWS RDS uses certificates signed by their own Certificate
Authority (CA), which isn't included in the default trust store of most systems.

### Investigating Certificate Issues

To confirm whether the issue is related to the certificate, you can inspect it using OpenSSL:

```bash
openssl x509 -in us-west-2-bundle.pem -text -noout
```

For a more targeted check, verify the subject and issuer:

```bash
openssl x509 -in ~/Downloads/us-west-2-bundle.pem -text -noout | grep "Subject:"
openssl x509 -in ~/Downloads/us-west-2-bundle.pem -text -noout | grep "Issuer:"
```

If both commands show `Amazon Web Services, Inc.`, then the certificate is
self-signed, confirming the need to explicitly trust it.

## Solving the Self-Signed Certificate Problem

For Docker applications using Alpine Linux (a common base image for Ruby
applications), you need to add the RDS certificate to the container's trust
store:

```Dockerfile
RUN apk add --no-cache ca-certificates
RUN cp /app/config/certs/rds-ca-root.pem /usr/local/share/ca-certificates/rds-ca-root.crt
RUN update-ca-certificates
```

This adds the certificate to the system's trust store, allowing your application
to trust the self-signed RDS certificate.

## Verifying Your SSL Connection

Once you've configured SSL and resolved any connection issues, it's important to
verify that your connection is actually using SSL.

### For MySQL

```ruby
ActiveRecord::Base.connection.execute("SHOW STATUS LIKE 'Ssl_cipher'").to_a
```

If successful, you'll see output similar to:
```
=> [["Ssl_cipher", "TLS_AES_256_GCM_SHA384"]]
```

### For PostgreSQL

```ruby
ActiveRecord::Base.connection.execute("SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();").to_a
```

A successful SSL connection will return:
```
=> [{"ssl"=>true, "version"=>"TLSv1.2"}]
```

## Best Practices and Tips

1. **Use the most secure SSL mode**: Always use `:verify_identity` (MySQL) or `verify-full` (PostgreSQL) in production environments.

2. **Keep certificates updated**: Amazon periodically updates their CA certificates. Stay informed about certificate rotations and update your application accordingly.

3. **Monitor SSL connections**: Regularly verify that your connections are using SSL, especially after deployments or infrastructure changes.

4. **Handle certificate rotation gracefully**: Implement a strategy to update certificates without downtime, such as dual certificate support during transition periods.

5. **Test in staging environments**: Always test SSL configuration changes in a staging environment before deploying to production.

## Conclusion

Securing your Rails to Amazon RDS connections with SSL is an important step in
protecting your data.

Remember that while SSL protects data in transit, it's just one part of a
comprehensive security strategy that should also include proper authentication,
authorization, and data encryption at rest.

Happy Connecting! 🚀🔒

## Resources

- [AWS RDS SSL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- [Download Latest RDS Certificates](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.CertificatesDownload)
- [Rails Database Configuration Guide](https://guides.rubyonrails.org/configuring.html#configuring-a-database)
