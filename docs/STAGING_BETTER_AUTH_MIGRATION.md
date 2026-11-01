# Phase 2 design: Better Auth migration

Decision: Better Auth is the target for removing the Supabase Auth runtime dependency. This is intentionally a design artifact; no runtime auth code is switched in this phase.

## Why staged
The application currently uses `@supabase/ssr` in middleware, server/browser session helpers, login, and OAuth callback. The Prisma `User` model still has a unique `supabaseId`. The game server and Storage have separate Supabase dependencies. Replacing only the login page would create split identity and authorization behavior.

## Target architecture
- Better Auth server mounted in Next.js.
- Existing PostgreSQL/Prisma staging DB, with Better Auth tables isolated from domain tables.
- Domain `User.id` remains the stable primary key; legacy mapping retained until migration sign-off.
- Resend SMTP for verification and reset.
- Google OAuth with exact staging callback URLs.
- HttpOnly secure cookie sessions, origin/CSRF validation, rate limiting and session revocation.
- Explicit token contract for game server; no blind acceptance of Better Auth cookies or Supabase JWTs.

## Migration sequence
1. Inventory all auth imports and server-to-server token verification.
2. Add schema and adapter in staging; no production schema changes.
3. Implement server session helper and middleware authorization in parallel with existing Supabase path, behind a staging-only feature flag.
4. Migrate two dummy users and all role classes; verify permissions and ownership.
5. Test signup, email verification, login, refresh, logout, reset, OAuth, expiry, revocation, CSRF, rate limiting, and multi-browser isolation.
6. Migrate game-server auth and verify JUMPA session creation and media authorization.
7. Search repository for `@supabase/ssr`, `supabase.auth`, Auth URLs, and old token verification; remaining references must be documented as Storage/DB or removed.
8. Remove old auth integration only after zero legacy auth traffic and a rollback rehearsal.

## Data safety
- Never drop `supabaseId` in the first migration.
- Never mutate user IDs or relation foreign keys.
- Export/backup test accounts before each migration.
- No production cutover in this PR.
- Supabase Storage, database, and realtime are not implicitly removed by replacing Auth.
