# Staging cache activation — current verified state

Date: 4 November 2026. Do not infer deployment success from this source document; inspect the final CI staging_activation result and running image revision.

## Access and target
Desktop Commander reaches bc-prod-01 as bcagent, without Docker or protected-directory access; PC is offline. The existing GitHub Actions VPS_SSH_KEY successfully authenticates as bcadmin with a pinned ED25519 host key. Read-only preflights passed. No new credential or broad permission was created.

Verified ingress: staging.bahasacerdas.com → existing shared Caddy route → jumpa-web-staging:3000 on jumpa-staging-net. The shared Caddy configuration is not changed by deployment. Auth/storage use auth-staging.bahasacerdas.com (Cloudflare origin rule port 8443) and dedicated staging containers/volumes. Media uses jumpa-livekit-staging; production media is a different container.

Baseline app image: sha256:8b9e333de5483684e2857815484f420a92c1d258e2e3ee433042d21539e09ba2. Baseline image has no usable source revision metadata; do not invent one. The actual DATABASE_URL selects jumpa_staging on jumpa-db-staging, with 163 public application tables. Resource identities differ from production. WritingProject, WritingChapter and CurriculumProgress are pre-existing optional schema gaps and remain untested; this task does not migrate them. Core User/Profile/JUMPA tables are required.

## CI correction and cache implementation
GitHub annotations on the failed run said: Unrecognized named-value: 'runner'. Located at position 1 within expression: runner.temp. This was workflow validation, before jobs; not a billing or application-code failure. CI now configures npm cache in a runner step using RUNNER_TEMP/GITHUB_ENV. Pinned/checksummed actionlint validates workflow semantics.

Node 22 is used by build and smoke jobs. Cache scopes include project, environment, OS/architecture and relevant build inputs. npm logs and Next fetch-response caches are excluded. staging:build requires BC_BUILD_ENV=staging explicitly. Next 16.2.6 defaults build filesystem caching to false, so the flag is enabled only for staging/CI. Production defaults remain unchanged.

## Guarded deployment
The staging_activation CI job waits for build/smoke PASS and runs only for same-repository PR #235 on the requested branch. tools/staging-activate.py verifies target/image lineage, isolated DB/Auth/media identities, required tables, disk/RAM, and production baseline before building. It clones the exact PR SHA into a separate bcadmin work directory.

Build-time input contains public client settings and fake DB URLs; private runtime credentials remain on the VPS in mode-0600 files outside the context. A dedicated, memory/CPU-limited BuildKit builder is used. No migrations, volume removal, global pruning, production restart or shared ingress changes occur.

Cold/existing-cache and identical-input warm builds are timed separately. BuildKit RUN install/build times and image-build wall time are recorded. The warm pipeline verifies the unchanged healthy image without an unnecessary restart. Report that as a healthy no-op, not as a second container replacement.

Before replacement, preserve the complete private container configuration on the VPS and pin the old image. Start/health-check a candidate first. Only jumpa-web-staging is replaced; retain the previous container/image for rollback. On failure after replacement, restore the original container by immutable ID and verify recovery. Private snapshots are never uploaded to CI logs/artifacts. Later revisions may replace only a staging image whose OCI revision is an ancestor on this PR branch.

## Remaining acceptance
Inspect final CI status/metrics and running OCI revision. Browser login/session/logout and teacher/student/media/reconnect/attendance checks must be performed with authorized staging accounts. Read-only homepage/login checks alone are insufficient. No physical-device media test has been certified. Keep Draft until the requested staging acceptance checks pass.
