---
title: Packer's env() only works in a variable default
date: 2024-09-28
summary: 'After I converted an old JSON Packer template to HCL2, env() in the source block failed. Packer allows it only as a variable default.'
topics: [AWS]
---

I build the machine image for my game server with Packer, so a new instance starts with the OS, users and packages already in place. The template was from 2022, still on Ubuntu 20.04, and still in Packer's old JSON format. I converted it to HCL2 on Packer 1.11 and moved the old environment lookups into the source block:

```hcl
source "amazon-ebs" "ubuntu" {
  region = env("AWS_REGION")
  # ...
}
```

```
Error: Call to unknown function

There is no function named "env".
```

Packer has `env()`, but it allows it only as a variable's default value:

```hcl
variable "aws_region" {
  type    = string
  default = env("AWS_REGION")
}

source "amazon-ebs" "ubuntu" {
  region = var.aws_region
  # ...
}
```

Do the same for every value you read from the environment.

Two cleanups from the old template while I was in there. I dropped the `access_key` and `secret_key` variables. The amazon plugin uses the normal AWS credential chain, so a profile or an SSO session works. And to load a `.env` file into the shell before a build, use this:

```sh
set -a; . ./.env; set +a
```

`export $(cat .env | xargs)` breaks on spaces, quotes and comments.
