# Staging activation follow-up — 4 November 2026

Status: BLOCKED before deployment. This document does not certify staging activation.

Access rechecked via Desktop Commander: VPS 103.242.10.81 / bc-prod-01 is online as bcagent, groups bcagent/users. Docker socket is root:docker mode 0660; Docker API returns permission denied. Book Studio application directory is bcstudio-owned mode 0750. Existing staging subdirectories are inaccessible. PC DESKTOP-2NM1AUE is offline. SSH agent has no identities, and no deploy private keys were found in the authorized account's SSH directory or bounded home search. The Desktop Commander command policy rejects sudo. No permission changes were attempted.
Host public ED25519 fingerprint read directly on the authorized VPS: SHA256:KZBAinXldycnW2tfHs19dU/tLVtwFa6IxpuJ+8vQGsQ.

Review fixes:
- npm runner now namespaces cache by project/staging/Node 22, resolves the checkout root, enforces Node 22, rejects a non-staging build environment, and labels install/build/combined durations.
- Docker BUILD_CACHE_SCOPE defaults to bahasacerdas-production; staging MUST pass --build-arg BUILD_CACHE_SCOPE=bahasacerdas-staging to its dedicated builder. Compiler-only cache mounts exclude fetch-cache. Do not put private environment files in cache mounts.
- CI npm/compiler cache keys explicitly include project and CI environment. Only compiler directories are persisted. These are build caches, not application response caches.

Outstanding deployment gates:
1. Connect Desktop Commander as an existing authorized deploy account with Docker and staging-directory access; do not grant broad access to bcagent.
2. Read actual staging Compose project, env paths and public URLs. Prove separate DB/Auth/Redis/LiveKit/storage targets before any deployment.
3. Record previous git SHA, immutable image IDs/tags and private configuration checksums (never print config values). Save a staging-only rollback command.
4. Build from this PR SHA in the staging builder, without migrations or volume deletion. Capture plain BuildKit logs and install/build durations. Repeat exactly the same SHA, build args and environment, measuring total deploy separately. For fully cached RUN steps record zero execution / layer reused, not a fabricated install/build duration.
5. Verify health, login and the main application/JUMPA or book workflow in the browser. Roll back staging on regression and verify recovery.
6. Keep the PR Draft until CI and deployed staging both pass.

No new staging commit/image/configuration was installed, no rollback was needed, and no new staging timing measurements or URLs were verified during this access-blocked follow-up. Historical local timings in STAGING_ACCELERATION.md are not staging deploy benchmarks.
