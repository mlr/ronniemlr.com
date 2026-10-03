---
title: TLS from the load balancer to the container
date: 2025-04-03
summary: 'An ALB ended TLS and spoke plain HTTP to ECS tasks. A self-signed cert in the nginx sidecar encrypts that hop, because the ALB never checks the target certificate.'
topics: [AWS]
---

A Rails app runs on ECS Fargate behind an Application Load Balancer, with an nginx container in the same task in front of Puma. TLS ended at the load balancer, so the hop from the ALB to the task was plain HTTP inside the VPC. I wanted traffic encrypted all the way to the container.

The obvious idea was to reuse the load balancer's certificate in the container. It's an ACM certificate, and you can't export the private key of an ACM-managed certificate, so that was out.

What made it simple is that the ALB doesn't validate target certificates. It encrypts the connection to the target but accepts any certificate, self-signed or expired. So a self-signed certificate baked into the nginx image is enough:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout server.key -out server.crt -subj "/CN=my-app"
```

```nginx
server {
  listen 443 ssl;
  ssl_certificate     /etc/ssl/certs/server.crt;
  ssl_certificate_key /etc/ssl/private/server.key;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
    proxy_set_header X-Connection-SSL-Protocol $ssl_protocol;
  }
}
```

Containers in a Fargate task share `localhost`, so nginx reaches Puma on `localhost:3000`, not by container name. Pass the ALB's `X-Forwarded-Proto` through as-is. If nginx sets it from `$scheme`, Rails sees the scheme of the inner hop instead of the client's.

Some advice I got said to set a target group attribute that turns off certificate checks. Those attributes don't exist, and the code that used them failed. You don't need them.

The rollout went like this:

- Keep nginx listening on port 80 during the switch.
- Create new target groups with protocol HTTPS on port 443 and HTTPS health checks.
- Attach each new target group to a listener or listener rule before pointing the ECS service at it. Otherwise ECS fails with `target group ... does not have an associated load balancer`.
- Move the service to the new target groups, and drop port 80 once nothing uses it.

To prove the hop was encrypted, I passed nginx's `$ssl_protocol` through to a health page. On the canary it showed `TLSv1.2`, and on the old path it showed nothing.

This encrypts the hop but doesn't authenticate it. It stops anyone reading traffic inside the VPC. Since the ALB doesn't check the certificate, it won't stop an active man-in-the-middle, if your threat model goes that far.
