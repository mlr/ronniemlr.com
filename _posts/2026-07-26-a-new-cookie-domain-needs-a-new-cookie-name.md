---
title: A new cookie domain needs a new cookie name
date: 2026-07-26
summary: 'I changed the session cookie''s domain so admins stay signed in across subdomains. The browser kept the old cookie and sent both, Rack read the old one, and sign-in broke in two new ways.'
topics: [Ruby and Rails]
---

A Rails app serves many tenants, each on its own subdomain, under two brand domains. Super admins switch between tenants often, and every switch made them sign in again. The session cookie had no `Domain` attribute, so it belonged only to the exact host that set it. The switch links also sent admins to `www.` on one fixed domain.

The first fix set the cookie domain with Rails's domain list, where Rails picks the entry that matches the request's host, and built the switch links from `request.domain`. Then sign-in broke differently. The password step passed, the two-factor step said the password was invalid, and the browser ended in `ERR_TOO_MANY_REDIRECTS`.

The cookie's name hadn't changed, but its domain had. Browsers treat those as two different cookies, so everyone who had signed in before still had the old host-only cookie and now got a new one too. The browser sent both, and Rack keeps the first cookie with a given name, which was the old one. Rails wrote the session to the new cookie and read it from the old one, so the two-factor step never saw that the password step had passed. Renaming the session cookie fixed it in production.

Ten days later, staging returned a 422 on every form, "The change you wanted was rejected", until I cleared my cookies. Staging runs on a subdomain of the production domain, so the production cookie, now set for `.example.com`, went to staging too. It was older, so Rack read it. Staging couldn't decrypt it with its own secret, so the session was empty, and the CSRF check failed. Giving each environment its own cookie name and domain list keeps them apart:

```ruby
domains = Rails.env.production? ? %w[.example.com .example.net] : %w[.staging.example.com .staging.example.net]

Rails.application.config.session_store :cookie_store,
  key: Rails.env.production? ? "_my_app_session" : "_my_app_session_#{Rails.env}",
  domain: domains
```

Production cookies still travel to staging with this, and the new name keeps staging from reading them. Putting staging on a separate domain stops them from being sent at all.

Each rename signs out every user once, so plan it for a time when that's acceptable.
