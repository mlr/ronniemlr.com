---
title: ECS stopped tasks that were still booting
date: 2026-09-02
summary: 'Deploys failed at random, and ECS stopped tasks that were about to pass their health checks. The health check grace period was 15 seconds, and a task needed about 70 seconds to boot.'
topics: [AWS, Docker and CI]
---

Last year I set up a Rails app on ECS Fargate to [run migrations in the entrypoint](/2025/03/24/rails-migrations-on-an-ecs-deploy/) before Puma starts. This year deploys started failing at random. The first attempt or two would fail health checks, and ECS logged a task as unhealthy and stopped it.

The same day I had changed the app's database user, so I looked there first. The logs had no database errors at all. The task's own timeline showed the problem:

```
19:05:33  task started
19:06:04  migrations run
19:06:14  registered with the target group
19:06:29  health check grace period ends
19:06:44  Puma listening
19:07:14  /healthz returns 200
19:07:25  task stopped
```

The service's `health_check_grace_period_seconds` was 15. During the grace period, ECS ignores failed load balancer health checks. After it, a failed check counts. The task needed about 70 seconds before Puma was even listening, and the target group checks every 30 seconds and needs two passes in a row. So the task was marked unhealthy while it was still booting, and ECS replaced it just after it started to pass.

The fix was a grace period longer than boot time plus two health check intervals, with some margin:

```python
aws.ecs.Service("app",
    health_check_grace_period_seconds=180,  # was 15
    ...)
```

There was one more catch. The CI deploy only updates the image and forces a new deployment, so service settings like this one never got applied. A separate script now runs `pulumi up` for the services and task definitions when infrastructure settings change. After it ran, all four services showed 180, and the deploy that had failed on the old setting went through on staging.

Migrations in the entrypoint add to that boot time on every task. Running them once in a one-off task before the deploy shortens the boot as well.
