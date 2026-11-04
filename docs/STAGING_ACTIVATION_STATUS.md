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

Additional checks: Node 22 syntax checks and YAML parsing passed; an isolated npm invocation probe passed for both projects and verified project/staging cache paths from a different working directory. Probe timings are synthetic and are not build/deploy benchmarks. CI Docker builds explicitly use a CI cache scope; only npm content-addressed downloads (_cacache), excluding npm logs, are persisted.

## CI diagnosis and review corrections
The GitHub run annotation reports: Unrecognized named-value: 'runner'. Located at position 1 within expression: runner.temp. It occurs at workflow-level env (BahasaCerdas line 12; Book Studio line 10), before jobs are created. This is a workflow validation error, not evidence of quota/billing/runner exhaustion or a failing application test.
Set npm_config_cache in a runner step via RUNNER_TEMP/GITHUB_ENV; runner is not available in workflow-level or job-level env expressions. Validate workflow expressions using pinned actionlint 1.7.12 with an official-release SHA-256 check; YAML parsing alone is insufficient. Align the BahasaCerdas smoke job with Node 22. Cache keys additionally include platform/architecture and relevant config inputs. staging:build now requires BC_BUILD_ENV=staging explicitly.
Access recheck: VPS online as bcagent; PC offline; Docker access still denied. No staging service/image/configuration has been changed during this follow-up. The host identity and permissions match the earlier verified VPS. Deployment, rollback baseline capture, login/media/CRUD tests and staging timing measurements remain blocked until an existing deploy account is connected.
