---
title: SSM stopped working when I removed the public IP
date: 2025-05-15
summary: 'Session Manager needs an instance role and an outbound path to the SSM endpoints. Removing the public IP took away the path.'
topics: [AWS]
---

I had a small Ubuntu instance with a public IP, and I wanted to reach it only through AWS Systems Manager, with no SSH port open to the internet.

First, the SSM agent couldn't register. Its log said:

```
Failed to connect to Systems Manager with instance profile role ... status code: 400
```

The instance had no role with SSM permissions. Attaching an instance profile with the AWS managed policy `AmazonSSMManagedInstanceCore` fixed that, and SSH over Session Manager worked with this in `~/.ssh/config`:

```
Host i-* mi-*
  ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

Then I removed the Elastic IP, since the point was not to need it, and SSM stopped working.

Session Manager connections are outbound. The agent on the instance calls the SSM endpoints over HTTPS. The instance was in a subnet whose default route goes to an internet gateway, and an instance without a public IP can't reach the internet through an internet gateway. It had no way out.

There are three ways to fix that:

- Keep a public IP and allow no inbound traffic in the security group. SSM still works, and nothing can connect in.
- Move the instance to a private subnet with a NAT gateway. You can't change an instance's subnet, so this means launching a new one from an AMI of the old one.
- Add VPC interface endpoints for `ssm`, `ssmmessages` and `ec2messages`, so the agent reaches SSM without leaving the VPC.

A NAT gateway, or three interface endpoints, can cost more than the public IPv4 address. For one small instance, the first option is a reasonable choice.
