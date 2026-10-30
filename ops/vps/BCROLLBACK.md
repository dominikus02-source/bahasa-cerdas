# BahasaCerdas emergency rollback

This script is **image-based**, not Git-based. It never resets the working tree, touches database migrations, or deletes volumes.

## Install on VPS (operator, once)

From a trusted, reviewed checkout containing this script:

```bash
sudo install -m 755 ops/vps/bcrollback.sh /usr/local/bin/bcrollback
```

The command remains available even if the checked-out repository later changes.

## Register the last known good release

After confirming the running container is from the intended commit and **manually** verifying homepage, login, password recovery, and critical routes:

```bash
sudo bcrollback --mark-stable
```

This creates a local immutable Docker tag `bahasacerdas/web:stable-<commit>` and records it in `/opt/bahasacerdas/rollback/stable`. Keep this tagged image; do not prune it. The commit suffix is taken from the checkout, so the operator must confirm the deployed image corresponds to that commit before promotion. This marker is not proof of E2E success.

## Emergency

```bash
sudo bcrollback
```

It acquires the same deployment lock as `ops/vps/deploy.sh`, saves the current image under a rescue tag, recreates **web only** with the recorded stable image, then checks Docker health, local `/api/health`, and the homepage. On failed checks, it attempts to restore the prior image.

## Limitations

- A new VPS or a pruned stable image cannot roll back until a verified image is registered or restored.
- This checks basic availability, **not** login, password reset, DB correctness, or all pages.
- It cannot fix DB schema incompatibility, external service outages, or reverse-proxy failures.
- Auto-deploy may overwrite the rollback later. Pause any deployment automation before an emergency rollback.
- Do not use `--mark-stable` during an incident or without completing manual smoke tests.
