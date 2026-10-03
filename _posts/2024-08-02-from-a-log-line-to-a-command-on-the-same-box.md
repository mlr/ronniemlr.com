---
title: From a log line to a command on the same box
date: 2024-08-02
summary: 'Version one used CloudWatch Logs, two Lambdas, SNS and SSM Run Command. Version two is a bash script under systemd that tails the log, with no AWS in the loop.'
topics: [AWS, Command line and Git]
---

I run a 7 Days to Die server for friends on EC2. It writes everything to a log: players joining, players dying, chat. I wanted some of those lines to trigger things on the same box. The first one was a welcome message when someone joins.

## Version one: through AWS

The old version of this ran on a paid serverless framework, and I rebuilt it in CDK. A CloudWatch Logs subscription filter sends matching lines to a Lambda. That Lambda publishes to SNS. A second Lambda calls `ssm:SendCommand` with the `AWS-RunShellScript` document, which runs a script on the instance.

Two things broke on the way.

### The filter pattern rejected my term

The line I care about has spaces and parentheses in it. `FilterPattern.literal()` failed the deploy:

```
Invalid character(s) in term '('
```

A backslash escape failed too. CloudWatch Logs wants any term with characters other than letters, numbers and underscores inside double quotes. The old code had the quotes, and my port dropped them. In CDK, `allTerms()` adds them for you:

```ts
filterPattern: logs.FilterPattern.allTerms('PlayerSpawnedInWorld (reason: JoinMultiplayer'),
```

### SendCommand needs the instance too

The second Lambda failed with `AccessDeniedException` on `ssm:SendCommand`. The policy listed only the document. SendCommand checks the document and the target instance, so both go in the policy:

```ts
role.addToPolicy(new iam.PolicyStatement({
  actions: ['ssm:SendCommand'],
  resources: [
    `arn:aws:ssm:${this.region}::document/AWS-RunShellScript`,
    `arn:aws:ec2:${this.region}:${this.account}:instance/${instanceId}`,
  ],
}));
```

The document ARN has an empty account field, because AWS-owned documents don't have one.

To test the first Lambda from the console, remember that subscription events arrive gzipped and base64-encoded in `event.awslogs.data`:

```sh
echo '{"logEvents":[{"id":"1","timestamp":0,"message":"PlayerSpawnedInWorld (reason: JoinMultiplayer, ...)"}]}' \
  | gzip | base64 | tr -d '\n'
```

Paste the output into `{"awslogs":{"data":"..."}}`.

That version worked, but it took five AWS services to watch a text file on a machine I already had a shell on.

## Version two: tail and systemd

A few weeks later I replaced all of it with a bash script on the server that tails the log, and systemd keeps it running. It works on any Linux box, and it made more triggers easy to add, including chat commands like `/bloodmoon`.

The triggers live in a config file, one per line. Each line has a regex for the log line, the command to run, and an optional regex whose capture groups become the command's arguments:

```
INF GMSG: Player .* joined the game|/home/game/scripts/say-welcome.sh|Player '(.*)' joined
INF GMSG: Player .* died|/home/game/scripts/rip.sh --say|Player '(.*)' died
/bloodmoon|/home/game/scripts/bloodmoon.sh --say
/vehicles$|/home/game/scripts/say-vehicles.sh
```

The watcher reads that file, then checks every new line against each pattern:

```bash
while IFS='|' read -r pattern command capture; do
  patterns+=("$pattern"); commands+=("$command"); captures+=("$capture")
done < /home/game/scripts/log_monitor.conf

tail -F -n0 "$log_file" | while read -r line; do
  for i in "${!patterns[@]}"; do
    if [[ $line =~ ${patterns[i]} ]]; then
      args=()
      if [[ -n ${captures[i]} && $line =~ ${captures[i]} ]]; then
        args=("${BASH_REMATCH[@]:1}")
      fi
      ${commands[i]} "${args[@]}"
      break
    fi
  done
done
```

`tail -F -n0` starts at the end of the file, so a restart doesn't replay old lines. The first matching pattern wins. Before this loop, the script waits until the server process is running and picks the newest log file.

The script on my server builds the command as a string and runs it with `eval`, with the captured values in single quotes. A player name with a quote in it can break out of those quotes. The version above passes the captures as separate arguments and doesn't need `eval`.

The scripts talk to the game through its telnet console on localhost, with a small `expect` script. The systemd unit:

```ini
[Unit]
Description=Game log monitor
After=network.target

[Service]
ExecStart=/home/game/scripts/log_monitor.sh
Restart=always
RuntimeMaxSec=600
User=game

[Install]
WantedBy=multi-user.target
```

`Restart=always` brings the watcher back if it dies. The server starts a new log file each time it restarts, and the watcher picks a log file only when it starts, so `RuntimeMaxSec=600` restarts it every ten minutes to move on to the newest file. An Ansible role copies the scripts and the unit file to the server.
