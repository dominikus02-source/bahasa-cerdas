# Self-hosted Authentication Migration

Status: discovery and migration design only. This branch does not change production behavior, database contents, secrets, or deployed services.

## Goal

Remove the application's runtime dependency on Supabase Auth and Supabase-hosted services while retaining the existing PostgreSQL/Prisma application data, account roles, founder privileges, onboarding state, premium entitlements, and JUMPA/arena access.

Target:
- PostgreSQL owned and operated with the BahasaCerdas VPS stack.
- Prisma for application data and the Better Auth Prisma adapter (or a compatible self-hosted auth implementation) for credentials, sessions, OAuth, and verification.
- Secure, HTTP-only, same-site session cookies.
- Resend SMTP for verification and password-reset mail.
- Existing local Redis service in Docker Compose for cache/rate-limit/session-adjacent workloads where appropriate.
- LiveKit remains the media SFU; it is not an identity provider.

## Repository facts verified on 2026-11-01

1. `prisma/schema.prisma` uses PostgreSQL with `DATABASE_URL` and `DIRECT_URL`. The existing application `User` model has a unique `supabaseId`, unique `email`, `fullName`, `emailConfirmed`, role, founder, premium, and many domain relations. This is the application identity record and must not be replaced or destructively reshaped as part of the first auth cutover.
2. `lib/supabase/server.ts` creates a Supabase SSR server client, validates JWT claims via `auth.getClaims()`, then resolves the application row by `supabaseId`. Role and founder authorization come from PostgreSQL, not JWT metadata.
3. `lib/supabase/client.ts` creates the browser Supabase client. `lib/supabase/proxy.ts` owns session refresh and middleware auth decisions; `middleware.ts` calls it on requests.
4. Login uses `loginWithBrowserPassword()` in `lib/auth/browser-password-login.ts`, which calls `signInWithPassword()`; Google login in the login page uses `signInWithOAuth()`.
5. Registration profile enrichment in `app/actions/register.ts` reads the Supabase session and finds the app row by `supabaseId`. Google callback in `app/api/auth/callback/route.ts` exchanges the OAuth code and provisions/looks up application users.
6. `ops/vps/prepare-runtime-envs.sh` currently copies `NEXT_PUBLIC_SUPABASE_URL` and Supabase publishable/anon keys into `game.env`, and explicitly fails if they are missing. This is a deployment blocker for a fully Supabase-free game-server auth path.
7. Redis is already self-hosted as a `redis:7.4-alpine` service in `ops/vps/docker-compose.yml`, and `REDIS_URL` is injected into web/worker containers. However, `lib/redis.ts` currently imports `@upstash/redis` and only accepts Upstash REST URL/token variables. The application cache/rate-limit adapter therefore still needs to move to the existing local Redis service.
8. The repository's current README still documents Supabase Auth and Supabase Storage. Storage migration is a separate workstream from identity migration and must be inventoried before removing any storage configuration or data.

## Critical compatibility decisions

### Preserve application users

Do not rename or drop `User.supabaseId` in the first release. Add a separate auth identity layer and a nullable, unique link from the application user to the self-hosted auth user (or use an explicit mapping table). This avoids breaking the large number of existing `db.user` consumers and keeps authorization based on the current application row.

The Better Auth Prisma models should be separate from the domain `User` model (for example `AuthUser`, `AuthSession`, `AuthAccount`, and `AuthVerification`) unless a fully tested field-mapping design proves safe. Do not force Better Auth's required fields onto the existing domain model without checking all constraints and relations.

### Legacy passwords and identity linking

Do not assume Supabase password hashes are directly compatible with Better Auth's default password hashing. Before choosing a migration path, determine whether the former Auth database/export and password hashes are available, what password hashing algorithm/version was used, and whether the new auth implementation can verify those hashes safely.

If compatible hashes are unavailable, use a controlled password-reset/re-enrolment flow. Link an existing application account only after a verified email challenge (or another approved proof of ownership); never auto-link solely on an unverified email. Preserve role, founder, premium, and all domain data during linking.

### OAuth

Google OAuth must be reconfigured against the self-hosted callback URL and tested for existing-account linking, first-time registration, role-intent cookies, and safe `next` redirects. Do not silently create a default MURID account where the current role-selection flow requires explicit selection.

### JUMPA and game server

JUMPA should consume the same first-party BahasaCerdas session/identity and continue to obtain LiveKit access tokens only from server-side authorization checks. LiveKit API secrets must never reach browsers. The game server's signed-auth bridge must be reviewed separately; remove Supabase env requirements only after its token issuer and verifier have a tested replacement.

### Redis

Use the existing authenticated Docker Redis service over `REDIS_URL`. Replace the Upstash-specific client behind the existing cache interface, preserving TTL semantics, atomic rate-limit behavior, and failure behavior. The current `rateLimit()` implementation performs read-then-write and is not atomic; use a Lua script or Redis INCR + EXPIRE transaction for the replacement.

## Work plan and release gates

1. **Inventory and baseline (this branch):** enumerate every Supabase Auth, Storage, Realtime, and REST use; map all session consumers, OAuth/email flows, and game-server token boundaries. Capture CI baseline.
2. **Auth schema:** add separate auth tables and a reversible, additive Prisma migration. Test migration on an isolated PostgreSQL staging database with a restorable backup.
3. **Auth service:** configure Better Auth (or the approved self-hosted equivalent) with Prisma, secure cookies, rate limits, email verification, password reset, and Google OAuth. Add server-only helpers and test session invalidation/expiry.
4. **Compatibility adapter:** implement a single `getUser()` boundary returning the existing domain user shape; preserve role/founder/entitlement checks. Migrate middleware and API/page guards to this boundary.
5. **Flows:** migrate login, registration, Google callback, email verification, password reset, and account linking. Test existing and new accounts, role intent, redirect safety, lockout/rate limit, logout, and password reset.
6. **JUMPA/Arena:** migrate game-server token issuance/verification and staging browser tests. Confirm participant isolation and server-side role checks.
7. **Redis:** switch the cache/rate-limit implementation to local Redis and verify atomic limits, TTL, outage fallback, and load.
8. **Remove Supabase dependencies:** only after a repository-wide search proves no runtime Auth/Storage/Realtime/API imports remain, remove packages/env propagation/CSP allowances/docs as applicable. Storage is removed only after its separate migration is complete.
9. **Staging acceptance:** run typecheck, lint, full unit/regression suites, production build, auth browser E2E, OAuth E2E, password-reset E2E, role/RBAC matrix, JUMPA two-user isolation tests, game-server auth tests, and backup/restore validation.
10. **Production cutover:** separate approved release with a verified database backup, maintenance window, rollback plan, and post-deploy smoke tests. Never apply migrations or change production secrets as part of discovery work.

## Acceptance criteria

- No Supabase Auth SDK or Supabase Auth endpoint is used at runtime.
- No route relies on Supabase JWT claims or Supabase refresh-token cookies.
- Existing app users retain their IDs, email, role, founder status, entitlements, profile, and domain relations.
- Verified account linking prevents takeover and duplicate-account creation.
- Login, logout, verification, password reset, and Google OAuth work on staging.
- JUMPA and game server authorize users from the new first-party identity boundary; LiveKit secrets remain server-side.
- Redis cache and rate limits use the self-hosted Redis service.
- Storage migration is explicitly complete before Supabase Storage is removed.
- CI and staging acceptance are green before production cutover.

## Explicit non-actions in this discovery commit

- No production database access or schema change.
- No production environment or secret changes.
- No deploy/restart.
- No Supabase project deletion.
- No destructive rename/drop of `supabaseId` or user records.
