# BahasaCerdas staging Auth rollout (2026-11-01)

## Scope and safety
This rollout is staging-only. It must not change `main`, production `web.env`, production database, production Supabase Auth, production JWT keys, or production Caddy routes. The VPS evidence showed the existing `supabase-auth` container belongs to `supabase_default` and targets production Auth/DB. Never reuse it.

## Phase 1 — compatibility bridge: isolated GoTrue
Staging-only GoTrue is configured with email auto-confirm enabled to let isolated test accounts sign in immediately; production email confirmation behavior is not changed. Recovery mail still uses the isolated SMTP configuration. GoTrue is the Auth component formerly shipped as Supabase Auth. This phase preserves the current `@supabase/ssr`/Supabase JS protocol while removing staging's dependency on the production Auth service. It is **not** a claim that the codebase is already fully Supabase-free.

1. Merge/deploy this staging-only branch to the staging baseline only after review.
2. On the VPS, place the checkout's `ops/staging-auth/docker-compose.yml` and `setup-staging-auth.sh` in the staging checkout. Run once as root:
   `bash ops/staging-auth/setup-staging-auth.sh`
3. The script discovers the staging Docker network from `jumpa-web-staging`, creates a dedicated PostgreSQL 16 volume and GoTrue container, generates unique DB/JWT secrets, prompts once for the Resend SMTP key (hidden input), and attaches GoTrue to the network discovered from `jumpa-web-staging` plus a private DB network. It writes secrets under `/opt/bahasacerdas/staging/auth/`, never into Git.
4. Configure a **staging-only** reverse proxy route: `https://auth-staging.bahasacerdas.com/auth/v1/*` → `http://auth-staging:9999/*` (strip `/auth/v1` before proxying); also proxy `/health` to `/health`. Do not add this host to production Caddy. If staging has no independent proxy/DNS/TLS path, stop and establish one before configuring the browser.
5. **STOP before wiring the app:** the current repository uses `NEXT_PUBLIC_SUPABASE_URL` for both Auth and Storage. Setting it to a GoTrue-only host would break Storage uploads and could misroute storage traffic. The bootstrap emits `NEXT_PUBLIC_SUPABASE_AUTH_URL` and `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY` as future split-client settings only; current code does not consume them yet. First complete issue #208: split Auth and Storage clients, provision staging-only Storage (or a fully isolated Supabase Storage stack), and prove no staging upload targets production. Only then wire the Auth URL into Auth-only clients. Never set production keys in staging.
6. Verify actual container env and issuer/URL. Do not rely on host env file status alone.

## Phase 1 acceptance
- `GET https://auth-staging.bahasacerdas.com/health` returns 200 and `GET https://auth-staging.bahasacerdas.com/auth/v1/health` returns 200 through the proxy.
- `jumpa-auth-db-staging` and `jumpa-auth-staging` are healthy and only staging network is used for app connectivity.
- Auth client and Storage client have separate base URLs; staging Storage is isolated and no upload can reach production.
- DB volume is dedicated: `jumpa_auth_staging_db`.
- Two separate dummy accounts pass `node scripts/staging-auth-e2e.mjs`.
- Recovery requests accepted and both actual mailboxes receive the recovery message.
- Existing production Auth remains unchanged.

### API E2E
Set these variables only in the staging shell/secret store:
- `STAGING_AUTH_URL=https://auth-staging.bahasacerdas.com`
- `STAGING_ANON_KEY=<generated STAGING_ANON_KEY>`
- `STAGING_TEST_USER_A_EMAIL/PASSWORD`
- `STAGING_TEST_USER_B_EMAIL/PASSWORD`

Run: `node scripts/staging-auth-e2e.mjs`. The script refuses a URL unless it is HTTPS and hostname begins `auth-staging.`. It creates/reuses the two supplied users, tests password login, user identity, refresh, logout, cross-user isolation, and password recovery request. Inbox delivery must be checked separately.

## Phase 2 — full Supabase Auth replacement: Better Auth
Do not implement a second identity system alongside GoTrue. After phase 1 passes, migrate the application in a separate PR:
1. Inventory all Supabase Auth usage: middleware/proxy, browser/server clients, login/register, OAuth callback, email confirmation, reset-password, logout, game-server JWT verification, API guards, admin provisioning, and Storage signed URLs.
2. Add Better Auth backed by the existing staging PostgreSQL database (separate auth tables/schema and Prisma migrations). Preserve the domain `User.id` and all relations; map legacy `supabaseId` through a reversible nullable migration. Never rewrite historical user IDs or delete legacy columns during cutover.
3. Implement email/password, Google OAuth, verification, password reset via Resend, secure HttpOnly cookies, CSRF/origin checks, rate limits, session revocation, role mapping, and admin account provisioning.
4. Build dual-read/controlled migration only for staging test accounts. Do not dual-write production sessions. Existing Supabase sessions are not automatically portable; require safe reauthentication or an explicitly tested migration plan.
5. Replace game-server Supabase token validation with a documented issuer/JWKS or signed internal token contract. Keep old verification path available until all game clients are migrated.
6. Remove Supabase Auth SDK and environment requirements only after code search, build, and E2E prove zero runtime references. Supabase Storage and database dependencies are separate projects and must not be removed by this Auth migration.

## Phase 2 acceptance
- All Phase 1 user journeys pass using Better Auth, not GoTrue.
- Google OAuth callback and email reset/verification work end-to-end.
- Role-based access, session expiry/revocation, CSRF, rate limits and cross-user isolation pass.
- Game server and JUMPA token validation pass.
- No runtime import or network request to Supabase Auth remains.
- Production cutover has a separate approved plan, backup, rollback and maintenance window.

## Redis note
The staging Redis container returning PONG proves only that Redis is alive. Current `lib/redis.ts` uses `@upstash/redis` REST and will not use a raw Redis URL. Keep the isolated Upstash staging credentials until a separate adapter change to a Node Redis client (with TLS/auth, timeouts, error fallback and tests) is reviewed. Do not silently point it at local Redis.
