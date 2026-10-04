---
title: Where the email link 404s came from
date: 2026-08-16
summary: 'Customers got 404s from links in emails, and the error tracker showed only part of it. The server logs showed three causes: Base64 tokens with slashes, a link scanner''s tail on the path, and a single-page app URL with no server route.'
topics: [Ruby and Rails, JavaScript]
---

A Rails app emails customers links to confirm, cancel, or reschedule an appointment. Each link has an encrypted record ID as a path segment, like `/booking/cancel/<token>`, and the reschedule page is a React single-page app. Customers kept landing on 404 pages from those links.

In April I fixed the first cause. The tokens were standard Base64, which uses `+` and `/`. In a sample of 2,000 tokens, 76.5% had one of them. A `/` splits the token into two path segments, so the route doesn't match, and some link rewriters change a `+` too. URL-safe Base64 uses `-` and `_`, and without padding there's no `=` either:

```ruby
token = Base64.urlsafe_encode64(encryptor.encrypt_and_sign(id), padding: false)
```

The decrypt side falls back to the old format, so links already sent still work.

In August the 404s were still there. The error tracker showed some `ActiveRecord::RecordNotFound` errors, but it filtered out routing errors, which turned out to be most of the problem. Twenty-four hours of nginx logs had 28 404s on these links, mostly from real phones and computers:

- 16 were `/booking/reschedule/<token>/review`. That's a URL the React app pushes with the history API, and Rails had no route for it. Refreshing the page, going back, or opening a bookmark sent it to the server and got a 404.
- About 5 had a link scanner's tail on the path. Microsoft Safe Links had added `&data=...&sdata=...` to the end of the token.
- 1 was an old token that split at a `/`.

The fixes were a route for the app's sub-path, which lets the existing client-side redirect run, and a controller that cuts the token at the first character that can't be in a token and redirects when no record matches:

```ruby
get "booking/reschedule/:token/review" => "portal#reschedule"

clean = params[:token].to_s[%r{\A[A-Za-z0-9_+/=-]+}]
event = Event.find_by(id: UrlEncryption.decrypt(clean)) if clean
```

Specs covering all three cases failed before and passed after, and the review URL now redirects instead of returning a 404.

Every URL a single-page app pushes needs a server route, and the server logs show what an error tracker leaves out.
