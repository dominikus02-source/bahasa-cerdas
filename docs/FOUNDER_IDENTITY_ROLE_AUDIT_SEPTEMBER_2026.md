# FOUNDER IDENTITY & ROLE SEPARATION AUDIT

**BahasaCerdas — September 2026**  
**READ-ONLY / NO PRODUCTION MUTATION**

---

## Executive Summary

We discovered that Dominikus Wahyu (and 2 other founders) currently have `role = ADMIN` + `isFounder = true`, but Dominikus also functions as a GURU teacher with 9 classes and 136 students. This role collision caused confusion in the Guru Cerdas Sejahtera commission system.

**Key Finding:** The commission system correctly excludes founders via `isFounder` flag (not via `role`). Changing `role = ADMIN` → `role = GURU` would NOT affect commission eligibility, admin access, premium status, or class ownership. The migration is safe and low-risk.

**Total Founders:** 3  
**Migration Complexity:** LOW  
**Production Mutation:** NONE (this is audit only)

---

## 1. Founder Inventory

| # | Email | Name | Prisma Role | isFounder | Classes | Students | Premium | Commission | Last Active |
|---|-------|------|-------------|-----------|---------|----------|---------|------------|-------------|
| 1 | dominikus.02@gmail.com | Dominikus Wahyu | ADMIN | true | 9 | 136 | PRO | 0 | 2026-09-02 |
| 2 | hdsastra47@gmail.com | Washadi | ADMIN | true | 3 | 90 | PRO | 0 | 2026-08-02 |
| 3 | alexsurya1968@gmail.com | 31. Alexander Suryanta | ADMIN | true | 6 | 188 | PRO | 0 | 2026-09-02 |

**Total:** 18 classes, 414 students, 0 commissions

### Obahmamah Account

| Email | Name | Role | isFounder | Classes | Students |
|-------|------|------|-----------|---------|----------|
| obahmamah.indonesia@gmail.com | Super Admin BC | GURU | false | 1 | 0 |

**Verdict:** NOT a founder. Regular GURU account. 1 class, 0 students. Used as test/operator account.

---

## 2. Role Conflict Analysis

### Current State

```
┌─────────────────────────────────────────────┐
│            ROLE COLLISION DETECTED           │
├─────────────────────────────────────────────┤
│  Dominikus: role=ADMIN, isFounder=true      │
│  Functions as: GURU (teacher), ADMIN, FOUNDER│
│  Commission: BLOCKED (isFounder=true)       │
│  Admin access: YES (role=ADMIN + isFounder)  │
│  Teacher access: YES (isFounder bypass)      │
└─────────────────────────────────────────────┘
```

### Prisma Schema

```prisma
enum Role {
  GURU    // Teacher
  MURID   // Student
  ADMIN   // Administrator
}

model User {
  role       Role     @default(MURID)
  isFounder  Boolean  @default(false)
  // ...
}
```

**Critical:** There is no `FOUNDER` role. Founder is a boolean flag, not a role. The `Role` enum only has `GURU | MURID | ADMIN`.

### Role Sources

| Source | Dominikus | Washadi | Alexander |
|--------|-----------|---------|-----------|
| Prisma `User.role` | ADMIN | ADMIN | ADMIN |
| Prisma `User.isFounder` | true | true | true |
| Supabase `auth.users.raw_user_meta_data.role` | (null) | GURU | (null) |
| Commission eligibility | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| Plan resolver | FOUNDER (unlimited) | FOUNDER (unlimited) | FOUNDER (unlimited) |

**Inconsistency found:** Washadi's Supabase auth metadata says `role: "GURU"` but Prisma says `role: "ADMIN"`. This is a pre-existing data inconsistency.

---

## 3. Founder Privileges Map

### Permission Categories

| Permission | Source | Founder Gets It? | Admin Gets It? | Guru Gets It? |
|-----------|--------|-------------------|----------------|---------------|
| Admin panel access | `admin/layout.tsx:13` | ✅ (isFounder bypass) | ✅ | ❌ |
| Guru dashboard | `guru/layout.tsx` | ✅ (isFounder bypass) | ❌ | ✅ |
| Student preview | `murid/layout.tsx` | ✅ (isFounder bypass) | ❌ | ✅ |
| AI credits (unlimited) | `plan-resolver.ts:13` | ✅ (FOUNDER plan) | ✅ | ❌ |
| XP/coin admin | `player/xp/route.ts:25` | ✅ (isFounder) | ✅ | ❌ |
| Commission earnings | `commission/config.ts:61` | ❌ (excluded) | ❌ | ✅ |
| Moderation | `karya-comment` | ✅ (isFounder) | ✅ | ❌ |
| Billing bypass | `billing/checkout:77` | ✅ (isFounder) | ✅ | ❌ |
| Comment deletion | `chat/[groupId]` | ✅ (isFounder) | ✅ | ❌ |
| Content verification | `bank-soal/ukbi:107` | ✅ (auto-verify) | ✅ | ❌ |

### Code Pattern: Admin Route Guard

```typescript
// Most admin routes
if (!user.isFounder && user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**This means:** Changing `role = ADMIN` → `role = GURU` would NOT break admin access, because `isFounder = true` still passes the check.

---

## 4. Route Access Matrix

### Admin Routes (`/admin/*`, `/api/admin/*`)

| Route | Guard | Founder Bypass | Impact if role→GURU |
|-------|-------|----------------|---------------------|
| `/admin` (layout) | `role !== "ADMIN" && !isFounder` | ✅ | NONE |
| `/api/admin/users` | `!isFounder` | ✅ | NONE |
| `/api/admin/analytics/*` | `!isFounder` | ✅ | NONE |
| `/api/admin/payments` | `!isFounder` | ✅ | NONE |
| `/api/admin/ai-quota/*` | `!isFounder` | ✅ | NONE |
| `/api/admin/teacher-commissions/*` | `!isFounder` | ✅ | NONE |
| `/api/admin/data-center` | `!isFounder && role !== "ADMIN"` | ✅ | NONE |
| `/api/admin/settings/*` | `isFounder \|\| role === "ADMIN"` | ✅ | NONE |

**Verdict:** ALL admin routes use `isFounder` as primary check. Changing role does NOT affect access.

### Guru Routes (`/guru/*`, `/api/guru/*`)

| Route | Guard | Founder Bypass | Impact if role→GURU |
|-------|-------|----------------|---------------------|
| `/guru` (layout) | `role !== "GURU" && !isFounder` | ✅ | NONE |
| `/api/guru/kelasku/*` | `teacherId !== user.id && !isFounder` | ✅ | NONE |
| `/api/guru/penugasan/*` | Same | ✅ | NONE |
| `/api/guru/tinjau-konstruktif` | `role === "ADMIN" \|\| isFounder` | ✅ | NONE |

### Commission Routes (`/api/teacher/commissions/*`)

| Route | Guard | Founder Access | Founder Earning |
|-------|-------|----------------|-----------------|
| `/api/teacher/commissions` | `role !== "GURU" && !isFounder` | ✅ Access | ❌ Not earning |
| All commission sub-routes | Same pattern | ✅ Access | ❌ Not earning |

**Critical:** Commission earning is blocked by `isFounder` flag, NOT by role. Even if Dominikus changes to `role = GURU`, commission earning remains blocked because `isFounder = true`.

---

## 5. Commission Impact

### Current Behavior

```typescript
// lib/commission/config.ts:60-62
export function isEligibleForCommission(role: string, isFounder: boolean): boolean {
  return role === "GURU" && !isFounder;
}
```

### Impact Analysis

| Scenario | role | isFounder | Eligible? |
|----------|------|-----------|-----------|
| Dominikus NOW | ADMIN | true | ❌ No |
| Dominikus PROPOSED | GURU | true | ❌ No |
| Regular teacher | GURU | false | ✅ Yes |
| Admin (non-founder) | ADMIN | false | ❌ No |

**Result:** Changing Dominikus from ADMIN to GURU does NOT change commission eligibility. The `isFounder` flag is the gate, not the role.

---

## 6. Class / Teacher Impact

### Dominikus's Classes

| Class | Students | Premium | Created |
|-------|----------|---------|---------|
| 7 | 1 | 1 | 2026-07-28 |
| 7A | 26 | 0 | 2026-07-08 |
| 7B | 23 | 0 | 2026-07-08 |
| 8A | 22 | 0 | 2026-07-20 |
| 8B | 22 | 0 | 2026-07-20 |
| 9A | 20 | 1 | 2026-07-21 |
| 9B | 20 | 0 | 2026-07-14 |
| 9B (dup) | 1 | 0 | 2026-07-14 |
| Test Kelas | 1 | 1 | 2026-07-29 |

**Total:** 136 students, 3 premium

### Migration Impact on Classes

**NONE.** All `Group.teacherId` references use `User.id` (CUID), not `User.role`. Changing `role` from ADMIN to GURU does not break any foreign key or ownership relationship.

---

## 7. Premium / Billing Impact

| Founder | isPremium | Plan | Premium Until | Transactions |
|---------|-----------|------|---------------|--------------|
| Dominikus | true | PRO | 2026-08-30 | 0 |
| Washadi | true | PRO | (null) | 0 |
| Alexander | true | PRO | (null) | 0 |

**Plan Resolution:** `lib/ai-gateway/plan-resolver.ts:13` — `role === "ADMIN" || isFounder` → `FOUNDER` plan (unlimited credits).

**Impact:** Changing role does NOT affect plan. `isFounder = true` still resolves to FOUNDER plan.

---

## 8. Hardcoded Identity Dependencies

### Critical (Authorization Logic)

| File | Line | Hardcoded | Severity |
|------|------|-----------|----------|
| `app/api/user/me/route.ts` | 9 | `FOUNDER_EMAILS = ["hdsastra47@gmail.com", "dominikus.02@gmail.com", "alexsurya1968@gmail.com"]` | CRITICAL |
| `app/api/user/simple-upsert/route.ts` | 5 | Same FOUNDER_EMAILS array | CRITICAL |
| `app/auth/callback/route.ts` | 12 | Same 3 emails in isFounder check | CRITICAL |

### High (Admin Logic)

| File | Line | Hardcoded | Severity |
|------|------|-----------|----------|
| `app/api/admin/upload-materi/route.ts` | 33-35 | 3 founder emails in isAdmin array | HIGH |
| `app/api/admin/generate-ppt/route.ts` | 8-10 | Same 3 emails in isAdmin array | HIGH |

### Environment Variable

`FOUNDER_EMAILS` env var is used in:
- `app/actions/upload-materi.ts` (reads from env)
- `app/actions/register.ts` (reads from env)
- `app/api/auth/register/route.ts` (reads from env)

**But the env var is NOT SET locally** — the hardcoded arrays in the 5 files above are the actual source of truth.

### Recommendation

Replace all hardcoded email arrays with `user.isFounder` DB flag. The 5 files should be refactored to:
```typescript
// Instead of:
const isAdmin = FOUNDER_EMAILS.includes(email) || role === "ADMIN";

// Use:
const isAdmin = user.isFounder || user.role === "ADMIN";
```

---

## 9. Database Model Audit

### Current Model

```
User {
  id          String   @id
  email       String   @unique
  role        Role     @default(MURID)    // GURU | MURID | ADMIN
  isFounder   Boolean  @default(false)
  fullName    String?
  isPremium   Boolean  @default(false)
  // ...
}
```

### Model Analysis

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Role enum | GURU, MURID, ADMIN | Add FOUNDER (optional) |
| Founder flag | Boolean `isFounder` | Keep as-is OR convert to role |
| One user = one role | Yes (enum) | Yes |
| Multiple representations | No (flag supplements role) | No |

### Architecture Options

| Model | Description | Security | Simplicity | Scalability |
|-------|-------------|----------|------------|-------------|
| **A: ADMIN + isFounder** | Current state | ⚠️ Confusing | ❌ Role collision | ✅ Works |
| **B: GURU + isFounder** | Proposed target | ✅ Clean | ✅ Clear separation | ✅ Works |
| **C: FOUNDER role** | New enum value | ✅ Cleanest | ⚠️ Breaking change | ✅ Best long-term |
| **D: Role + privilege model** | RBAC system | ✅ Best | ❌ Over-engineered | ✅ Best |

---

## 10. Founder vs Admin Architecture

### Evaluation

| Factor | MODEL A (current) | MODEL B (proposed) | MODEL C (FOUNDER role) | MODEL D (RBAC) |
|--------|-------------------|--------------------|-----------------------|----------------|
| Security | ⚠️ | ✅ | ✅ | ✅✅ |
| Simplicity | ❌ | ✅ | ✅ | ❌ |
| Scalability | ✅ | ✅ | ✅ | ✅✅ |
| Auditability | ⚠️ | ✅ | ✅✅ | ✅✅ |
| Commission | ✅ | ✅ | ✅ | ✅ |
| Migration effort | — | LOW | HIGH | CRITICAL |
| Breaking changes | — | None | Schema + all code | Everything |

### Recommendation: MODEL B

**Target:** `role = GURU` + `isFounder = true` for all founders.

Rationale:
1. **No schema change required** — `isFounder` flag already exists
2. **No breaking changes** — all admin routes use `isFounder` bypass
3. **Clean separation** — GURU = teacher identity, isFounder = elevated privileges
4. **Commission unchanged** — `isFounder` blocks commission regardless of role
5. **Low risk** — all foreign keys use userId, not role

---

## 11. Dominikus Case Study

### Current Identity

| Attribute | Value |
|-----------|-------|
| userId | cmqxema6a000013z9kefn4jm1 |
| email | dominikus.02@gmail.com |
| role | ADMIN |
| isFounder | true |
| Classes | 9 |
| Students | 136 |
| Premium students | 3 |
| Commission | 0 |
| AI usage | 92 |
| Last active | 2026-09-02 |

### Proposed Identity

| Attribute | Current | Proposed | Change |
|-----------|---------|----------|--------|
| role | ADMIN | GURU | ✅ Changed |
| isFounder | true | true | — No change |
| Classes | 9 | 9 | — No change |
| Students | 136 | 136 | — No change |
| Admin access | ✅ | ✅ | — No change (isFounder bypass) |
| Commission | ❌ | ❌ | — No change (isFounder blocks) |
| Plan | FOUNDER | FOUNDER | — No change (isFounder resolves) |
| XP/coin admin | ✅ | ✅ | — No change (isFounder bypass) |

### Features That Would Change

1. **Onboarding destination:** ADMIN → `/admin`, GURU → `/guru/beranda`. After role change, Dominikus would land on `/guru/beranda` after login.
2. **Auth callback routing:** `app/auth/callback/route.ts:36` — `dbUser.role === "ADMIN" ? "/admin" : ...` — Dominikus would go to guru dashboard instead of admin.
3. **PageNavbar:** `components/public/PageNavbar.tsx:81` — `if (role === "ADMIN") return "/admin"` — would return guru link instead.
4. **Admin sidebar visibility:** Would still appear (via RoleSections + isFounder).

**Impact:** MINOR — onboarding/landing page destination changes, but all functionality preserved.

---

## 12. Obahmamah Case

| Attribute | Value |
|-----------|-------|
| userId | cmqxh3uor000dy3w3l1l4m2th |
| email | obahmamah.indonesia@gmail.com |
| role | GURU |
| isFounder | false |
| Classes | 1 |
| Students | 0 |
| Notes | NOT a founder. Regular teacher account. |

**Verdict:** No migration needed. Already has clean role=GURU, isFounder=false.

---

## 13. All-Founder Migration Plan

### Dominikus Wahyu

| Step | Action | Risk |
|------|--------|------|
| 1 | Update `User.role` from `ADMIN` to `GURU` | LOW |
| 2 | Verify admin panel still accessible (via isFounder) | NONE |
| 3 | Verify guru dashboard accessible | NONE |
| 4 | Verify commission still blocked | NONE |
| 5 | Update onboarding destination if needed | LOW |

**Complexity:** LOW

### Washadi

| Step | Action | Risk |
|------|--------|------|
| 1 | Update `User.role` from `ADMIN` to `GURU` | LOW |
| 2 | Verify all features | NONE |

**Complexity:** LOW

### Alexander Suryanta

| Step | Action | Risk |
|------|--------|------|
| 1 | Update `User.role` from `ADMIN` to GURU | LOW |
| 2 | Verify all features | NONE |

**Complexity:** LOW

### Pre-Migration Checklist

- [ ] Backup database
- [ ] Run audit script: `npx tsx scripts/audit-founder-identity-role.ts`
- [ ] Verify all 3 founders have `isFounder = true`
- [ ] Test admin panel access after role change
- [ ] Test guru dashboard access after role change
- [ ] Test commission system unchanged
- [ ] Deploy code changes (if any hardcoded ADMIN checks need updating)

---

## 14. Security Check

### GURU Accessing Admin Routes

| Route | Current Guard | If role=GURU + isFounder=true |
|-------|---------------|-------------------------------|
| `/admin` | `role !== "ADMIN" && !isFounder` | ✅ Access (isFounder passes) |
| `/api/admin/users` | `!isFounder` | ✅ Access |
| `/api/admin/analytics` | `!isFounder` | ✅ Access |
| `/api/admin/payments` | `!isFounder` | ✅ Access |

**Finding:** GURU with `isFounder=true` CAN access all admin routes. This is by design — isFounder is the master bypass.

### ADMIN Accessing Commission Routes

| Route | Guard | Effect |
|-------|-------|--------|
| `/api/teacher/commissions` | `role !== "GURU" && !isFounder` | ✅ Access (ADMIN passes) |
| Commission earning | `isEligibleForCommission()` | ❌ Not earning (ADMIN or isFounder blocks) |

**Finding:** ADMIN can access commission routes but cannot earn commissions. This is correct.

### Founder Privilege Escalation

**No risk.** Founder privileges are implemented server-side via `getUser()` + `isFounder` check. Client-side state is never trusted for authorization.

---

## 15. Investor / Governance Impact

### Why Role Separation Matters

| Category | Impact | Classification |
|----------|--------|----------------|
| Financial controls | Founder should not be both ADMIN and GURU — unclear accountability | GOVERNANCE |
| Segregation of duties | ADMIN manages system, GURU teaches — different responsibilities | GOVERNANCE |
| Audit trail | role=ADMIN + teaching = confusing audit logs | PRODUCT |
| Investor due diligence | Clean role separation shows professional governance | GOVERNANCE |
| Future employees | New ADMIN should not automatically be founder | ARCHITECTURE |
| Payout operations | Commission system must correctly identify eligible teachers | SECURITY |

### Recommendations

| Priority | Recommendation | Classification |
|----------|---------------|----------------|
| HIGH | Change all founders from role=ADMIN to role=GURU | ARCHITECTURE |
| HIGH | Remove hardcoded FOUNDER_EMAILS from code | SECURITY |
| MEDIUM | Add audit logging for role changes | GOVERNANCE |
| LOW | Consider adding FOUNDER role to enum (future) | ARCHITECTURE |

---

## 16. Recommended Target State

```
┌─────────────────────────────────────────────────┐
│              TARGET ARCHITECTURE                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  FOUNDER / CEO:                                 │
│    role = GURU                                  │
│    isFounder = true                             │
│    Privileges: Full system access               │
│    Commission: NOT eligible (by design)         │
│    Plan: FOUNDER (unlimited)                    │
│                                                 │
│  OPERATIONAL ADMIN:                             │
│    role = ADMIN                                 │
│    isFounder = false                            │
│    Privileges: Admin panel, user management     │
│    Commission: NOT eligible                     │
│    Plan: PRO or custom                          │
│                                                 │
│  TEACHER:                                       │
│    role = GURU                                  │
│    isFounder = false                            │
│    Privileges: Guru dashboard, class management │
│    Commission: ELIGIBLE (if conditions met)     │
│    Plan: FREE / PRO / Trial                     │
│                                                 │
│  STUDENT:                                       │
│    role = MURID                                 │
│    isFounder = false                            │
│    Privileges: Student dashboard, learning      │
│    Commission: N/A                              │
│    Plan: FREE / PRO (Murid)                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 17. Output Files

| File | Purpose |
|------|---------|
| `docs/FOUNDER_IDENTITY_ROLE_AUDIT_SEPTEMBER_2026.md` | This document |
| `data/founder-identity-role-audit-september-2026.json` | Structured audit data |
| `scripts/audit-founder-identity-role.ts` | Re-runnable audit script |

---

## Final Report

### Founder Identity Audit Complete

| Metric | Value |
|--------|-------|
| Total Founders | 3 |
| Role Conflicts | 3 (all ADMIN instead of GURU) |
| Commission Impact | ZERO (isFounder blocks, not role) |
| Admin Access Impact | NONE (isFounder bypass preserved) |
| Hardcoded Identity Dependencies | 5 files, CRITICAL severity |
| Migration Complexity | LOW |
| Production Mutation | NONE |
| Blocking Issues | NONE |

### Dominikus

**Current:** role=ADMIN, isFounder=true  
**Proposed:** role=GURU, isFounder=true  
**Migration Risk:** LOW  
**Changes:** Onboarding destination only. All functionality preserved via isFounder bypass.

### Obahmamah

**Current:** role=GURU, isFounder=false  
**Proposed:** No change needed  
**Status:** NOT a founder. Regular teacher account.

### Other Founders

| Founder | Current | Proposed | Risk |
|---------|---------|----------|------|
| Washadi | ADMIN + isFounder | GURU + isFounder | LOW |
| Alexander | ADMIN + isFounder | GURU + isFounder | LOW |

### Recommended Architecture

**MODEL B: GURU + isFounder flag**

- No schema change
- No breaking changes
- Clean separation of concerns
- Commission system unchanged
- Admin access preserved via isFounder bypass

### Recommended Target State

All 3 founders: `role = GURU, isFounder = true`

### Production Mutation

NONE — this is a read-only audit.

---

*Audit completed: September 2, 2026*  
*Audit type: READ-ONLY — NO PRODUCTION MUTATION*
