# Founder Role Separation — Production Migration Plan

**Date**: September 2, 2026  
**Status**: READY FOR APPLY  
**Risk**: LOW (additive role change + email array removal; authorization preserved via `isFounder`)

---

## Summary

Remove all 5 hardcoded email arrays (`FOUNDER_EMAILS`, `ALLOWED_ADMIN_EMAILS`) from route files.  
Change 3 founder users from `role=ADMIN` to `role=GURU`. The `isFounder=true` flag is preserved — authorization via `isFounder` bypass is unaffected.

---

## What Changes

### 1. Database Mutation (3 rows)

| ID | Email | role (BEFORE) | role (AFTER) | isFounder | isPremium |
|----|-------|--------------|-------------|-----------|-----------|
| cmqxema6a000013z9kefn4jm1 | dominikus.02@gmail.com | ADMIN | GURU | true | true |
| cmqy1g9v50000zag780ik6mrg | hdsastra47@gmail.com | ADMIN | GURU | true | true |
| cmqy1ga9r0003zag7fbmqhsq4 | alexsurya1968@gmail.com | ADMIN | GURU | true | true |

**SQL**:
```sql
UPDATE "User" SET role = 'GURU', "updatedAt" = NOW()
WHERE id IN (
  'cmqxema6a000013z9kefn4jm1',
  'cmqy1g9v50000zag780ik6mrg',
  'cmqy1ga9r0003zag7fbmqhsq4'
);
```

### 2. Code Refactoring (5 files)

| File | Before | After |
|------|--------|-------|
| `app/api/user/me/route.ts` | `FOUNDER_EMAILS` array + `.includes()` check | Remove array, trust `dbUser.isFounder` only |
| `app/api/user/simple-upsert/route.ts` | Same as above | Same as above |
| `app/auth/callback/route.ts` | Hardcoded inline array `["hdsastra47@gmail.com", ...]` | Remove check; new OAuth users get `isFounder=false` |
| `app/api/admin/upload-materi/route.ts` | `ALLOWED_ADMIN_EMAILS` array + 3-way OR check | Simplify to `role === "ADMIN" \|\| isFounder` |
| `app/api/admin/generate-ppt/route.ts` | Same as above | Same as above |

### 3. Optional: Registration Fallback (kept, not changed)

`app/actions/register.ts:26-28` and `app/api/auth/register/route.ts:15-18` use `process.env.FOUNDER_EMAILS` to set `isFounder` on first registration. This env var check is a SAFETY NET — if `isFounder` is accidentally false in DB, login sync restores it. Keeping it is conservative; removing it requires DB-only trust. **Decision: keep for now, document as tech debt for future cleanup.**

---

## Why This Is Safe

### Authorization is NOT affected

All 3 founder IDs already have `isFounder=true` in the database. Every admin/authority guard in the codebase checks BOTH `role === "ADMIN"` AND `isFounder` via OR logic:

```
role !== "ADMIN" && !user.isFounder  →  admin layout
role !== "GURU" && !user.isFounder   →  guru layout, komisi page
```

After migration: founders have `role="GURU"`, `isFounder=true` → ALL guards pass via the `isFounder` branch. No authorization is lost.

### Commission system is NOT affected

Founder exclusion from commission is controlled by `isEligibleForCommission()` in `lib/commission/config.ts:60-62`:
```ts
export function isEligibleForCommission(user: { role: string; isFounder: boolean }): boolean {
  return user.role === "GURU" && !user.isFounder;
}
```

After migration: `role="GURU"`, `isFounder=true` → returns `false`. Founder remains excluded. No commission change.

### Onboarding routing is unaffected

`onboarding/page.tsx:65` routes by `role === "ADMIN" ? "/admin" : role === "GURU" ? "/guru/beranda" : "/arena"`. After migration, founders hit `role === "GURU"` → `/guru/beranda`. This is the **correct** behavior (founders are teachers first).

### PageNavbar dashboard link is unaffected

`PageNavbar.tsx:81`: `role === "ADMIN" ? "/admin"`. After migration, founders hit the default return (`/guru/beranda`). Founders can access admin via `Akses Founder` sidebar link instead.

### Guru simulation pages are unaffected

Both `guru/simulasi/ukbi/page.tsx:17` and `guru/simulasi/tka/page.tsx:17` check:
```
role !== "GURU" && role !== "ADMIN"
```
After migration: `role === "GURU"` → passes. ✅

### AI BC and Arena Chat are unaffected

Both pages check `role === "GURU" || role === "ADMIN" || isFounder` → founders pass via `role === "GURU"` OR `isFounder`.

---

## Rollback

If anything breaks:
```sql
UPDATE "User" SET role = 'ADMIN'
WHERE id IN (
  'cmqxema6a000013z9kefn4jm1',
  'cmqy1g9v50000zag780ik6mrg',
  'cmqy1ga9r0003zag7fbmqhsq4'
);
```

Revert code changes via `git checkout -- <files>`.

---

## Verification Checklist

- [ ] `npx prisma validate` passes
- [ ] `npx tsc --noEmit` passes (0 errors)
- [ ] `npm run build` passes
- [ ] `npm run test:founder-role-migration` passes (new post-migration audit)
- [ ] Commission tests still pass (no changes)
- [ ] Manual login test: founder → redirected to `/guru/beranda`
- [ ] Manual test: founder can access `/admin` via "Akses Founder" link
- [ ] Manual test: founder commission page shows founder-aware empty state

---

## Known Issues After Migration

1. `/guru/komisi` page will render empty commission data for founder (no commissions because `isEligibleForCommission` correctly returns `false`). Need UI update to show founder-aware empty state.
2. `getDashboardHref()` in `PageNavbar` no longer routes founders to `/admin` on dashboard click — founders use sidebar "Akses Founder" instead. Acceptable.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Keep `process.env.FOUNDER_EMAILS` in register.ts | Safety net: re-syncs `isFounder` if DB flag accidentally false |
| Remove hardcoded arrays from me/route.ts and simple-upsert | DB is source of truth; arrays stale if new founder added |
| Remove admin email check from upload-materi/generate-ppt | `isFounder` flag already checked; email list redundant |
| Role GURU not ADMIN for founders | PRIMARY ROLE = operational identity; FOUNDER = organizational privilege |
| No schema change needed | `isFounder` boolean already exists; `Role` enum unchanged |
