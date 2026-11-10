---
title: AWS WAF blocked MCP sign-in from desktop apps
date: 2026-10-26
summary: 'An MCP server in a Rails app signed in fine from claude.ai, but desktop clients got a 403 from the load balancer. A managed WAF rule read the loopback redirect URL in the OAuth request as an SSRF attempt.'
topics: [AWS, AI and agents]
---

I built an MCP server into a client's Rails app, so AI clients like claude.ai and Claude Code can use the app's tools. Clients sign in with OAuth, and they register themselves first with dynamic client registration. The app runs on AWS behind a load balancer with AWS WAF. The claude.ai connector worked on the first try. Claude Code couldn't sign in at all. The block came from a rule in AWS's Common Rule Set, so any MCP server behind that rule set can hit the same wall.

The registration request came back as a tiny HTML page:

```
HTTP/2 403
server: awselb/2.0
content-type: text/html
content-length: 118

<html>
<head><title>403 Forbidden</title></head>
```

`server: awselb/2.0` meant the request never got to nginx or Rails. A probe script that sent the same requests with different redirect URLs showed the pattern:

```
claude.ai redirect   POST /oauth/register  -> 201 (nginx)
127.0.0.1 redirect   POST /oauth/register  -> 403 (awselb/2.0)
localhost redirect   GET  /oauth/authorize -> 403 (awselb/2.0)
claude.ai redirect   GET  /oauth/authorize -> 302 (nginx)
```

A desktop client signs in through a callback on the local machine, so every one of its requests carries `http://127.0.0.1:<port>/callback` or a `localhost` URL in the body or query string. Any request like that got blocked, on any path.

At first I was fine with that. Claude Code loads claude.ai connectors anyway, so I cut the app's redirect allow-list down to the claude.ai and ChatGPT callbacks. Two days later a Grok connector failed with the same 403, and I changed my mind. Real clients were getting turned away.

Claude's first guess was the Common Rule Set's remote file inclusion rules. The WAF's CloudWatch log named the real one:

```
AWS-AWSManagedRulesCommonRuleSet ['EC2MetaDataSSRF_BODY']  POST /oauth/register  UA=Cursor...
```

`EC2MetaDataSSRF_BODY` and `EC2MetaDataSSRF_QUERYARGUMENTS` treat a loopback URL in a body or query string as an attempt to reach the instance metadata service. An OAuth registration from a desktop app looks exactly like that.

I added one custom Allow rule to the web ACL. It sits after the bad-IP and scanner blocks and before the managed rule groups, and it matches `/mcp`, paths that start with `/oauth/`, and paths that start with `/.well-known/oauth-`. Those paths still need a token, and Rack::Attack still limits registrations per IP. A narrower option is to set only the two SSRF rules to Count and block their labels outside `/oauth/`.

Applying it with `aws wafv2 update-web-acl --cli-input-json file://acl.json` failed first:

```
aws: [ERROR]: Invalid base64: "/oauth/"
```

AWS CLI v2 expects blob fields like a byte match `SearchString` to be base64 in JSON input. `--cli-binary-format raw-in-base64-out` makes it take plain text.

The app's own allow-list was the second block. I replaced the list of vendors with a policy. An `https` URL with a host is fine. Plain `http` is fine only for `127.0.0.1`, `localhost`, and `::1`. Custom app schemes are fine, except `javascript:`, `data:`, `file:` and the like.

```ruby
def allowed?(value)
  uri = parse(value)
  return false if uri.nil? || uri.fragment || uri.userinfo

  case uri.scheme.to_s.downcase
  when "https" then uri.host.present?
  when "http"  then LOOPBACK_HOSTS.include?(uri.host.to_s.delete("[]").downcase)
  else scheme_ok?(uri.scheme)
  end
end
```

The consent page now says where the token goes, like "an app on this computer" with the port, or "the Cursor app".

After the change, the same probe got the app's own 400 instead of the WAF's 403. 103 OAuth and MCP specs passed, including one for a desktop client on a random local port, and the Grok connector signed in.
