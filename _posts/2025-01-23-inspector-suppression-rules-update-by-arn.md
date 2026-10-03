---
title: Inspector suppression rules update by ARN, not by name
date: 2025-01-23
summary: 'A CSV of reviewed CVEs drives Amazon Inspector suppression rules. Creating them is easy. Updating them means looking up each rule ARN first.'
topics: [AWS]
---

Amazon Inspector scans our container images, and the same CVEs kept showing up after we had already reviewed them. I wanted a CSV of reviewed vulnerabilities, with an id, a reason and a description on each row, to be the source of truth, and a script that turns each row into a suppression rule.

Creating a rule works the way you'd expect:

```sh
aws inspector2 create-filter --action SUPPRESS \
  --name "SUPPRESS-CVE-2023-1234" \
  --reason "Patched version in use" \
  --filter-criteria '{"vulnerabilityId":[{"comparison":"EQUALS","value":"CVE-2023-1234"}]}'
```

My first version matched on the finding title with `PREFIX`. That works, but a prefix of `CVE-2023-1234` also matches `CVE-2023-12345`. `vulnerabilityId` with `EQUALS` is exact.

The second run of the script is where it got awkward, because some rules already existed and needed updating. The CLI kept refusing:

- `list-filters` has no option to look up a rule by name.
- `update-filter --name` fails with `the following arguments are required: --filter-arn`.

Rules are updated by ARN, and the only way to get from a name to an ARN is to list all of them. So the script has to pull the whole list once, build a map from name to ARN, and then decide for each row whether to create or update:

```sh
aws inspector2 list-filters --query 'filters[].[name,arn]' --output text
aws inspector2 update-filter --filter-arn "$arn" --action SUPPRESS \
  --reason "Patched version in use" --filter-criteria '...'
```

The CLI pages through `list-filters` on its own. If the script grows past a handful of rules, boto3 is nicer than printing shell commands, because a description with an apostrophe in it breaks the quoting.
