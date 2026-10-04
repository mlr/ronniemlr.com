---
title: ECS Exec is not a shell
date: 2026-06-11
summary: 'A command with an environment variable in front of it failed in ECS Exec with "executable file not found". ECS Exec runs the command directly, without a shell.'
topics: [AWS, Docker and CI]
---

I needed to run a Rake task with a dry-run flag inside a staging container on ECS Fargate. A small wrapper script calls `aws ecs execute-command --interactive --command "<string>"`. Plain `bundle exec rake ...` commands worked through it. This one didn't:

```sh
--command "DRY_RUN=true bundle exec rake my:task[3,42]"
```

```
Unable to start command: Failed to start pty: exec: "DRY_RUN=true": executable file not found in $PATH
```

`VAR=value command` is shell syntax, and ECS Exec doesn't run the string through a shell. It splits it into words and runs the first word as the program, so it looked for a program named `DRY_RUN=true`. Pipes, `&&`, and globs don't work there either.

There are two general fixes. `env` sets the variable and runs the program, and `sh -c` gives you a real shell:

```sh
--command "env DRY_RUN=true bundle exec rake my:task[3,42]"
--command "sh -c 'DRY_RUN=true bundle exec rake my:task[3,42]'"
```

The image is Alpine, so `sh` is there but `bash` may not be.

For Rake there's a third way. The task's usage line showed it, and Rake reads `KEY=value` arguments after the task name into `ENV`:

```sh
--command "bundle exec rake my:task[3,42] DRY_RUN=true"
```

This is the second ECS Exec surprise I've written down, after finding that [ECS Exec always runs as root](/2025/08/16/ecs-exec-always-runs-as-root/).
