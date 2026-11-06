# BahasaCerdas Mobile UI — Tahap 1 (Android & iOS)

Status: implementation branch, not production release.

## Existing architecture verified
- Next.js App Router; shared authentication at `app/(auth)/login/page.tsx`.
- Supabase Auth, role-based redirect via `resolvePostAuthDestinationForUser`.
- Existing landing `app/page.tsx` and role dashboards remain the source of truth.
- Existing Android TWA/Arena configuration must be inventoried before modifying launch behavior.

## Non-negotiable compatibility
1. Preserve all API contracts, existing routes, auth sessions, RBAC, founder privileges, and invitation `next` handling.
2. No changes to database, schema, migrations, or production containers in phase 1.
3. Never show role picker as an authorization mechanism; role is resolved server-side.
4. Do not redirect all users to Arena: retain UMUM, MURID, GURU, ADMIN, and founder destination logic.
5. Preserve JUMPA device permissions and external OAuth return flows.

## Mobile experience specification
- Launch: native/TWA splash with BC brand, then existing session resolution.
- Valid session: navigate directly to the authorized dashboard.
- No session: existing login route; optional first-install introduction must be skippable and shown once.
- Login: single-column, accessible labels, password visibility, Google sign-in, forgot password, error states and registration.
- Dashboard: responsive cards, concise headings, tap targets >=44px, no feature removal.
- Navigation: keep existing role-specific menu access; do not collapse privileged actions into unauthorized shortcuts.

## Implementation gates
- Gate A: inspect Android source, manifest/start URL, branch divergence and current login/dashboard components.
- Gate B: implement visual-only mobile changes behind an isolated branch.
- Gate C: typecheck, lint changed files, auth/role regression, mobile viewport checks.
- Gate D: Android build + device smoke test; iOS feasibility after confirming actual mobile framework.
- Gate E: PR review and explicit release approval. Never auto-deploy from this document.

## Acceptance criteria
- Existing web desktop appearance and routes unaffected.
- Logged-in user reaches correct role dashboard; logged-out user reaches login.
- Registration, password recovery, Google OAuth, invited JUMPA links continue working.
- No lost access to NARA, TKA, JUMPA, or existing dashboard features.
- Verified Android artifacts and smoke-test evidence before distribution.
