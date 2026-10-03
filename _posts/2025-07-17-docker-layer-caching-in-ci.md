---
title: Docker layer caching in CI, and the tag I overwrote
date: 2025-07-17
summary: 'CI image builds took 14 minutes because no layers were reused. A BuildKit registry cache fixed that, until I pointed the cache at the tag that ECS deploys.'
topics: [Docker and CI, AWS]
---

Pulumi builds a Rails app's Docker image and pushes it to ECR during deploys, and in GitHub Actions that build took about 14 minutes. Every run rebuilt every layer, so I'd been building locally to save time.

The build already passed `--cache-from` with the `:latest` tag. That flag only reads cache that was written into the image itself, the inline cache, and the old Docker provider couldn't write a registry cache at all. Adding the cache export flags failed:

```
Cache export is not supported for the docker driver
```

The fix was to switch to Pulumi's `docker-build` provider, which runs a BuildKit builder and can read and write a cache stored in ECR:

```python
auth = aws.ecr.get_authorization_token()
cache_ref = repo.url.apply(lambda u: f"{u}:cache")

docker_build.Image("app-image",
    tags=[repo.url.apply(lambda u: f"{u}:latest")],
    push=True,
    context=docker_build.BuildContextArgs(location="../app"),
    platforms=[docker_build.Platform.LINUX_AMD64],
    registries=[docker_build.RegistryArgs(
        address=repo.url, username=auth.user_name, password=auth.password)],
    cache_from=[docker_build.CacheFromArgs(
        registry=docker_build.CacheFromRegistryArgs(ref=cache_ref))],
    cache_to=[docker_build.CacheToArgs(
        registry=docker_build.CacheToRegistryArgs(
            ref=cache_ref, mode=docker_build.CacheMode.MAX,
            image_manifest=True, oci_media_types=True))],
)
```

`image_manifest=True` and `oci_media_types=True` are what let ECR store the cache. Local builds went from about 11 and a half minutes to about 4. In CI the image build dropped to about 5 and a half minutes, and to a minute and a half on a re-run.

### The outage

My first version wrote the cache to `:latest`, because I didn't want another tag in the repository. That's the tag ECS deploys, and the next deploy failed:

```
CannotPullContainerError ... mismatched image rootfs and manifest layers
```

`:latest` now pointed at a cache manifest instead of an image. Moving the cache to its own `:cache` tag fixed it.

Installing the Pulumi provider had a few snags of its own. pip put it in a different virtualenv than the one Pulumi used. A fresh virtualenv then failed with `No module named 'pkg_resources'` until I added setuptools. Newer setuptools releases drop `pkg_resources`, so either pin setuptools below 81 or upgrade the older Pulumi providers. And the runtime in `Pulumi.yaml` is `python`, not `python3`.
