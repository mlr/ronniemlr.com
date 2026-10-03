---
title: ECS Exec always runs as root
date: 2025-08-16
summary: 'The app in my container ran as a non-root user, but every ECS Exec shell came up as uid 0. That is how ECS Exec works, so the controls belong in IAM and session logging.'
topics: [AWS, Docker and CI]
---

In March I changed a Rails app's Docker image to run as a non-root user, which is a standard hardening step:

```dockerfile
RUN addgroup -S app && adduser -S app -G app -h /app -s /bin/sh
USER app
```

Puma ran as `app`. In August, during a security review, I checked which user you get when you open a shell into a running task with ECS Exec:

```sh
aws ecs execute-command --cluster my-cluster --task <task-id> \
  --container app --interactive --command "sh"
id
# uid=0(root) gid=0(root)
```

The shell was root. Setting `user` in the task definition didn't change it either. AWS documents this behavior. ECS Exec works through the SSM agent, which runs as root, and the commands it starts run as root no matter which user the container is set to.

So the `USER` line protects the app process, not the sessions people open. The controls that matter are these:

- Restrict who can call `ecs:ExecuteCommand` in IAM.
- Log every session.

Session logging is a cluster setting, and you can add it to an existing cluster with an in-place update, despite advice I got that said otherwise. If you send the logs to CloudWatch with encryption turned on, the log group needs a KMS key, or sessions fail with `encryption is not set up on the selected CloudWatch Logs log group`.

My first sessions after I turned logging on produced no logs. These are the things to check:

- `aws ecs describe-clusters` leaves the exec configuration out unless you pass `--include CONFIGURATIONS`, so it can look like nothing is set.
- Logging only applies to tasks started after the change.
- The task role needs `logs:DescribeLogGroups` as well as the write permissions.
- The image needs `script` and `cat`, which the session logging uses.

If you want to land in the app user's shell, you can pass `su -s /bin/sh app` as the command. That helps day to day, but it isn't a security control.
