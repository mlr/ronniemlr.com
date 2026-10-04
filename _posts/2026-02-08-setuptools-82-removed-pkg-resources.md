---
title: setuptools 82 removed pkg_resources
date: 2026-02-08
summary: 'An infrastructure deploy in GitHub Actions broke with no code change. The job installed the newest setuptools, which no longer has pkg_resources, and an old Pulumi AWS provider still imports it.'
topics: [Python and data, Docker and CI]
---

A GitHub Actions job deploys AWS infrastructure with Pulumi's Python SDK. Each run makes a new virtualenv and installs `infra/requirements.txt`. One morning the staging deploy failed, and nothing in the repo had changed:

```
ModuleNotFoundError: No module named 'pkg_resources'
```

The traceback ended in `pulumi_aws/_utilities.py`, at `import pkg_resources`. `pkg_resources` came with setuptools, and setuptools 82.0.0 removed it. The requirements file didn't pin setuptools, so the fresh virtualenv got 82, and the pinned `pulumi-aws==5.41.0` still imports the module.

Pinning setuptools below the release that removed it fixed the deploy:

```
# infra/requirements.txt
setuptools<81
pulumi-aws==5.41.0
```

The pin keeps deploys working with the provider version already in use. Newer provider versions don't import `pkg_resources`, so upgrading the provider removes the need for it. A lock file for the infra dependencies, from uv or pip-tools, keeps a new setuptools from showing up on its own.
