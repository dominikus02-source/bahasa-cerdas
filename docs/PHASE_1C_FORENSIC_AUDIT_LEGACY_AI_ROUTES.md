# Phase 1C: Forensic Audit — 3 Remaining Legacy-Only AI Routes

**Date**: August 20, 2026  
**Status**: READ-ONLY AUDIT COMPLETE — No code changes  
**Author**: opencode  
**Scope**: `app/api/ai/rpp/route.ts`, `app/api/ai/soal/route.ts`, `app/api/guru/latihan/route.ts`

---

## Executive Summary

Three legacy-only AI routes remain after Phase 1B cleaned up 4 dual-system routes. All three use the legacy billing system (`checkAIQuota` / `recordAIUsage` from `lib/premium.ts`) exclusively — no modern AI Gateway imports.

**Critical finding**: All three routes have **unlimited quota for all plan types** in the legacy system (`AI_QUOTA.FREE.soal = -1`, `AI_QUOTA.FREE.rpp = -1`, `-1 = unlimited`). Migrating them to the modern credit system would **introduce billing where none existed before** — GURU_FREE would lose unlimited RPP/Soal access, and all users would consume credits (rpp=3, soal=3 per call). This is a **behavioral regression** that requires founder decision.

Additionally, the admin dashboard at `/api/guru/dashboard/route.ts` directly queries `AIUsage` rows by legacy feature strings (`"rpp_generator"`, `"soal_generator"`) — this dashboard will show zero counts after migration unless the logging bridge (`logLegacyUsage`) is wired.

---

## 1. Complete Import Map

### Legacy imports (`lib/premium.ts`): 3 remaining callers

| Route | Import | Functions Used |
|-------|--------|---------------|
| `app/api/ai/rpp/route.ts` | `checkAIQuota, recordAIUsage` | Quota check + usage logging |
| `app/api/ai/soal/route.ts` | `checkAIQuota, recordAIUsage` | Quota check + usage logging |
| `app/api/guru/latihan/route.ts` | `checkAIQuota, recordAIUsage` | Quota check + usage logging |

### Modern gateway imports (`lib/ai-gateway/quota-checker.ts`): 0 from these 3 routes

None of the 3 legacy routes import any modern gateway functions.

---

## 2. Per-Route Forensic Analysis

### 2A. `app/api/ai/rpp/route.ts` — Deprecated RPP Generator

| Property | Value |
|----------|-------|
| **Lines** | 187 |
| **Status** | DEPRECATED (comment: "endpoint dipertahankan sementara untuk kompatibilitas") |
| **Role gate** | `user.role === "GURU"` (GURU-only) |
| **Execution** | Job-based (`createJob` / `completeJob` / `failJob` via `lib/ai-queue.ts`) |
| **Provider chain** | Gemini → DeepSeek → Groq |
| **Modern gateway** | NONE imported |
| **Legacy quota** | `checkAIQuota(user, "rpp")` → `AI_QUOTA.FREE.rpp = -1` (unlimited) |
| **Legacy logging** | `recordAIUsage(body.userId, "rpp_generator", tokens, costUSD)` |
| **logLegacyUsage** | NOT wired (no analytics bridge) |
| **Rate limit** | `rateLimitRoute(req, { maxRequests: 2, windowSeconds: 60 })` |

**Unique characteristics:**
- Uses `AIJob` model for async processing (unique among the 3 routes)
- Returns `jobId` for polling via `/api/ai/rpp/status?jobId=`
- Gemini-first provider chain (others are DeepSeek-first)
- No MURID access

**Migration complexity**: LOW — deprecated, can be deleted entirely (Phase 1D). If kept for backward compat, needs modern gateway + job architecture preserved.

### 2B. `app/api/ai/soal/route.ts` — Deprecated Soal Generator

| Property | Value |
|----------|-------|
| **Lines** | 212 |
| **Status** | DEPRECATED (no explicit comment, but superseded by `/api/guru/latihan`) |
| **Role gate** | `getUser()` OR `supabaseId` body param (MURID fallback) |
| **Execution** | Sync (no job queue) |
| **Provider chain** | DeepSeek → Groq → Gemini |
| **Modern gateway** | NONE imported |
| **Legacy quota** | `checkAIQuota(user, "soal")` → `AI_QUOTA.FREE.soal = -1` (unlimited) |
| **Legacy logging** | `recordAIUsage(user.id, "soal_generator", tokens, costUSD)` |
| **logLegacyUsage** | NOT wired |
| **Rate limit** | `rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60 })` |

**Unique characteristics:**
- **MURID fallback**: accepts `supabaseId` in request body → resolves user via `db.user.findUnique({ where: { supabaseId } })` → uses that user's ID for quota/logging. This is the ONLY legacy route with this pattern.
- Saves generated soal to DB (`db.soal.createMany`)
- No job queue — synchronous response

**Migration complexity**: MEDIUM — MURID fallback via `supabaseId` needs careful handling. The modern gateway's `getUser()` only returns the session user, so the `supabaseId` resolution must be preserved.

### 2C. `app/api/guru/latihan/route.ts` — Active Guru Latihan Generator

| Property | Value |
|----------|-------|
| **Lines** | 432 |
| **Status** | ACTIVE (primary bank-soal generation endpoint) |
| **Role gate** | `isTeacherOrStudent()` — dual GURU + MURID |
| **Execution** | Sync (no job queue) |
| **Provider chain** | DeepSeek → Groq → Gemini |
| **Modern gateway** | NONE imported |
| **Legacy quota** | `checkAIQuota(dbUser, "soal")` → `AI_QUOTA.FREE.soal = -1` (unlimited) |
| **Legacy logging** | `recordAIUsage(dbUser.id, "soal_generator", tokens, costUSD)` |
| **logLegacyUsage** | NOT wired |
| **Rate limit** | `rateLimitRoute(req, { maxRequests: user.role === "GURU" ? 15 : 5, windowSeconds: 60 })` |

**Unique characteristics:**
- **Dual-role access**: `isTeacherOrStudent()` from `lib/teacher/students.ts` allows both GURU and MURID
- Creates `Quiz` + `QuizQuestion` records (full workflow, not just generation)
- Uses `getTeacherStudents()` for MURID student list resolution
- Different rate limits per role (GURU: 15/min, MURID: 5/min)
- This is the **only actively used** endpoint among the 3 — `/guru/bank-soal` UI calls this

**Migration complexity**: MEDIUM — active endpoint, dual-role, needs modern gateway + `logLegacyUsage` bridge for admin analytics.

---

## 3. Legacy Quota Analysis — Unlimited for All Plans

### `checkAIQuota` limits (from `lib/premium.ts`)

```typescript
const AI_QUOTA = {
  FREE: { rpp: -1, soal: -1, ... },  // -1 = unlimited
  PRO:  { rpp: -1, soal: -1, ... },  // -1 = unlimited
};
```

**All three routes use `"rpp"` or `"soal"` as feature string → both are -1 (unlimited) for ALL plan types.**

### Modern credit costs (from `lib/ai-gateway/agent-cost-policy.ts`)

```typescript
// "rpp" and "soal" are in KNOWN_AGENTS:
rpp: { credits: 3, weight: "heavy" },
soal: { credits: 3, weight: "heavy" },
```

### Impact of migration

| Plan | Legacy (current) | Modern (after migration) | Delta |
|------|-----------------|-------------------------|-------|
| FOUNDER | ∞ (unlimited) | ∞ (unlimited) | No change |
| MURID_FREE | ∞ (unlimited) | ∞ (unlimited) | No change |
| GURU_PRO | ∞ (unlimited) | 500 credits/mo, 3 per call | **REGRESSION** — was unlimited, now capped |
| GURU_PRO_TRIAL | ∞ (unlimited) | 200 credits/mo, 3 per call | **REGRESSION** — was unlimited, now capped |
| GURU_FREE | ∞ (unlimited) | 30 credits/mo, 3 per call | **REGRESSION** — was unlimited, now 10 calls/mo |

**⚠️ BLOCKER**: Migration introduces billing where none existed. GURU_FREE users who currently generate unlimited RPP/Soal would be limited to ~10 calls/month. This requires explicit founder approval.

---

## 4. Hidden Dependencies — Admin Analytics

### 4A. `/api/guru/dashboard/route.ts` — Guru Dashboard AI Usage Widget

```typescript
// Lines 29-38: Reads AIUsage by legacy feature strings
const aiThisMonth = { rpp: 0, soal: 0 };
for (const u of aiUsage.filter(a => a.bulan === bulanIni)) {
  if (u.feature === "rpp_generator") aiThisMonth.rpp++;
  if (u.feature === "soal_generator") aiThisMonth.soal++;
}
```

**Dependency**: Filters `AIUsage` rows by `feature === "rpp_generator"` and `feature === "soal_generator"`. After migration, these rows would only exist if `logLegacyUsage` is wired (writes `legacy:rpp` / `legacy:soal` feature strings — NOT `"rpp_generator"` / `"soal_generator"`).

**Impact**: Guru dashboard AI usage widget would show 0/0 for RPP and Soal after migration.

**Fix required**: Either:
1. Wire `logLegacyUsage` in migrated routes with feature `"rpp_generator"` / `"soal_generator"` (backward compat), OR
2. Update dashboard to also check `"agent:rpp"` and `"agent:soal"` features, OR
3. Accept the widget shows zero (deprecated routes shouldn't contribute to dashboard)

### 4B. `/api/admin/analytics/dashboard/route.ts` — Admin Analytics

```typescript
// Lines 663-664: Bucket by substring match
const rpp = sum(bucket(["rpp"]));   // matches "rpp", "rpp_generator", "agent:rpp", "legacy:rpp"
const soal = sum(bucket(["soal"])); // matches "soal", "soal_generator", "agent:soal", "legacy:soal"
```

**Impact**: Uses substring matching (`feature.toLowerCase().includes(k)`) — would match BOTH legacy `"rpp_generator"` AND modern `"agent:rpp"` AND bridge `"legacy:rpp"`. **No fix needed** — this dashboard is resilient to feature string changes.

### 4C. `/api/admin/ai-analytics/route.ts` — Admin AI Analytics

```typescript
// Lines 5-15: AGENT_LABELS maps agent IDs
const AGENT_LABELS = { rpp: "Rencana Pembelajaran", soal: "Soal", ... };

// Lines 17-22: LEGACY_FEATURES for legacy route tracking
const LEGACY_FEATURES = [
  { feature: "legacy:eyd", label: "EYD (Lama)" },
  // ... no rpp or soal legacy features listed
];
```

**Impact**: The admin AI analytics currently tracks `agent:rpp` and `agent:soal` (modern) AND `legacy:eyd/feedback/grading/text-analysis` (bridge). After migration, if `logLegacyUsage` is wired with `legacy:rpp` / `legacy:soal`, these would appear in the legacy usage section. If not wired, they'd only appear in agent usage (via `logUsage` in the agent runner — but these routes don't use the agent runner).

**Fix required**: Add `{ feature: "legacy:rpp", label: "RPP (Lama)" }` and `{ feature: "legacy:soal", label: "Soal (Lama)" }` to `LEGACY_FEATURES` array IF `logLegacyUsage` is wired.

---

## 5. Data Flow Comparison

### Legacy flow (current)

```
Request → rateLimitRoute → getUser/getSupabaseIdUser
  → checkAIQuota(user, "rpp"|"soal")     [COUNT AIUsage rows → always allowed (-1)]
  → AI provider call
  → recordAIUsage(userId, "rpp_generator"|"soal_generator", tokens, costUSD)
  → [RPP only: createJob/completeJob]
  → Response
```

### Modern flow (after migration)

```
Request → rateLimitRoute → getUser
  → ensureMonthlyLedger(user)             [Create/update AiCreditLedger]
  → checkAndPrepareDeduction(user, "rpp"|"soal", input)
    → resolveUserAiPlan(user)             [6 outcomes]
    → calculateAgentCost("rpp"|"soal")    [3 credits]
    → checkQuota(user, agentId)           [creditsUsed vs creditsTotal]
  → AI provider call
  → deductCreditsAtomic(user.id, planInfo, 3)  [Atomic UPDATE WHERE creditsUsed + 3 <= creditsTotal]
  → logLegacyUsage(...) OR logUsage(...)  [Analytics bridge]
  → Response
```

### Key differences

| Aspect | Legacy | Modern |
|--------|--------|--------|
| Quota check | COUNT rows (always -1/unlimited) | SUM creditsUsed vs creditsTotal |
| Cost model | Uniform (all unlimited) | Per-agent (3 credits) |
| Plan awareness | None (FREE/PRO only) | 6 outcomes (FOUNDER/MURID_FREE/GURU_PRO/GURU_PRO_TRIAL/GURU_FREE/SCHOOL) |
| Deduction | None (just logging) | Atomic UPDATE with guard |
| Error shape | 429 QUOTA_EXCEEDED (simple) | 402 QUOTA_EXCEEDED (with credit breakdown) |
| Logging | `recordAIUsage` → AIUsage | `logLegacyUsage` → AIUsage OR `logUsage` → AIUsage |

---

## 6. MURID Safety Analysis

### RPP route — MURID blocked at auth
```typescript
const user = await getUser();
if (!user || user.role !== "GURU") {
  return err(ERR.FORBIDDEN.error, ERR.FORBIDDEN.code, ERR.FORBIDDEN.status);
}
```
**MURID impact**: NONE — MURID never reaches quota check.

### Soal route — MURID fallback via supabaseId
```typescript
let user = await getUser();
if (!user && body.supabaseId) {
  const dbUser = await db.user.findUnique({ where: { supabaseId: body.supabaseId } });
  if (dbUser) user = dbUser as any;
}
```
**MURID impact**: MURID can access via `supabaseId` body param. With modern gateway, `resolveUserAiPlan(murid)` → `MURU_FREE` (∞ credits). **No billing impact** — MURID_FREE is unlimited.

### Guru Latihan route — MURID via isTeacherOrStudent
```typescript
const auth = await isTeacherOrStudent();
if (!auth) return err(ERR.FORBIDDEN...);
const dbUser = await db.user.findUnique({ where: { id: auth.userId } });
```
**MURID impact**: MURID can access. Modern gateway: `MURID_FREE` (∞ credits). **No billing impact**.

---

## 7. Rate Limit Comparison

| Route | Legacy | Modern (proposed) |
|-------|--------|-------------------|
| RPP | 2/60s | 2/60s (keep) |
| Soal | 10/60s | 10/60s (keep) |
| Guru Latihan (GURU) | 15/60s | 15/60s (keep) |
| Guru Latihan (MURID) | 5/60s | 5/60s (keep) |

Rate limits are independent of billing — no change needed.

---

## 8. Feature String Mapping

| Route | `checkAIQuota` feature | `recordAIUsage` feature | `logLegacyUsage` feature (proposed) | Modern agentId |
|-------|----------------------|------------------------|-------------------------------------|----------------|
| rpp | `"rpp"` | `"rpp_generator"` | `"legacy:rpp"` | `"rpp"` |
| soal | `"soal"` | `"soal_generator"` | `"legacy:soal"` | `"soal"` |
| guru/latihan | `"soal"` | `"soal_generator"` | `"legacy:latihan"` | `"soal"` |

---

## 9. Migration Risk Assessment

### Route-by-route risk

| Route | Risk | Reason |
|-------|------|--------|
| `rpp` | LOW (delete) | Deprecated, 0 active callers, job queue dead code. Safest to delete in Phase 1D. |
| `soal` | MEDIUM | Deprecated but has MURID fallback pattern. Need to preserve supabaseId resolution. |
| `guru/latihan` | MEDIUM-HIGH | Active endpoint, dual-role, admin analytics dependency. Highest-impact migration. |

### Behavioral risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Quota regression**: Unlimited → 30-500 credits/mo | HIGH | Founder approval required. Consider keeping unlimited for RPP/Soal via special policy. |
| **Admin dashboard shows zero**: `rpp_generator`/`soal_generator` rows stop | MEDIUM | Wire `logLegacyUsage` with legacy feature strings. |
| **MURID supabaseId resolution lost**: soal route's MURID fallback | LOW | Preserve in migration (use `db.user.findUnique` before `getUser`). |
| **Job queue orphaned**: RPP job-based architecture | LOW | Delete RPP entirely (Phase 1D) or preserve job logic. |
| **Double logging eliminated**: Positive side effect | POSITIVE | Single logging path reduces DB writes by 50% per call. |

---

## 10. Migration Specification (Pending Founder Approval)

### Phase 1C.1 — Soal Route Migration (MEDIUM risk)

**Pre-requisite**: Founder decision on billing regression (Section 3).

1. Add imports from `lib/ai-gateway/quota-checker.ts`: `ensureMonthlyLedger`, `checkAndPrepareDeduction`, `deductCreditsAtomic`
2. Add import from `src/ai/core/usage-logger.ts`: `logLegacyUsage`
3. Remove import from `lib/premium.ts`: `checkAIQuota`, `recordAIUsage`
4. Replace `checkAIQuota(user, "soal")` with `ensureMonthlyLedger(user)` + `checkAndPrepareDeduction(user, "soal", input)`
5. Replace `recordAIUsage(...)` with `logLegacyUsage({ userId, feature: "legacy:soal", ... })` + `deductCreditsAtomic(...)`
6. Preserve MURID `supabaseId` fallback (resolve user before quota check)
7. Keep existing rate limit unchanged

**Files changed**: `app/api/ai/soal/route.ts`

### Phase 1C.2 — Guru Latihan Route Migration (MEDIUM-HIGH risk)

**Pre-requisite**: Founder decision on billing regression (Section 3).

1. Same import changes as 1C.1
2. Replace `checkAIQuota(dbUser, "soal")` with `ensureMonthlyLedger(dbUser)` + `checkAndPrepareDeduction(dbUser, "soal", input)`
3. Replace `recordAIUsage(dbUser.id, "soal_generator", ...)` with `logLegacyUsage({ userId: dbUser.id, feature: "legacy:latihan", ... })` + `deductCreditsAtomic(...)`
4. Preserve dual-role `isTeacherOrStudent()` access
5. Keep existing rate limits (GURU: 15/min, MURID: 5/min)
6. Wire `logLegacyUsage` to maintain admin dashboard analytics

**Files changed**: `app/api/guru/latihan/route.ts`

### Phase 1C.3 — Admin Dashboard Fix (LOW risk)

1. Update `/api/guru/dashboard/route.ts` to also check `"agent:rpp"` and `"agent:soal"` features (or `"legacy:rpp"` / `"legacy:latihan"`)
2. Add `"legacy:rpp"` and `"legacy:latihan"` to `LEGACY_FEATURES` in `/api/admin/ai-analytics/route.ts`

**Files changed**: `app/api/guru/dashboard/route.ts`, `app/api/admin/ai-analytics/route.ts`

### Phase 1C.4 — RPP Route (DEFERRED to Phase 1D)

RPP is deprecated with 0 active callers. Recommend deletion in Phase 1D rather than migration. If kept:
- Same migration pattern as 1C.1
- Preserve job queue architecture (`createJob`/`completeJob`/`failJob`)
- Preserve Gemini-first provider chain

---

## 11. Founder Decision Required

### Decision 1: Billing Regression

**Question**: Should RPP/Soal/Latihan remain unlimited for all plans, or adopt credit-based billing?

| Option | Impact |
|--------|--------|
| **A. Keep unlimited** | Add special policy in `agent-cost-policy.ts`: `rpp: { credits: 0 }` and `soal: { credits: 0 }` for all plans. No billing change. |
| **B. Adopt credits** | GURU_FREE limited to ~10 calls/mo (30 credits ÷ 3). GURU_PRO limited to ~166 calls/mo. May frustrate users. |
| **C. Hybrid** | Unlimited for GURU_PRO+, credits only for GURU_FREE. Requires policy change in `calculateAgentCost`. |

**Recommendation**: Option A (keep unlimited) for now. These are deprecated/legacy routes. Introduce billing only when new versions are built.

### Decision 2: RPP Route

**Question**: Delete RPP route (Phase 1D) or migrate it?

| Option | Impact |
|--------|--------|
| **A. Delete** | Clean break. 0 active callers. Job queue code removed. |
| **B. Migrate** | Preserve backward compat. Job queue preserved. |

**Recommendation**: Delete (Option A). Comment says "dipertahankan sementara untuk kompatibilitas" — sementara has been long enough.

### Decision 3: Soal Route

**Question**: Delete soal route or migrate it?

| Option | Impact |
|--------|--------|
| **A. Delete** | MURID fallback lost. `/api/ai/soal` becomes 404. |
| **B. Migrate** | Preserve MURID supabaseId pattern. |

**Recommendation**: Migrate (Option B) if any MURID clients still use it. Delete if not.

---

## 12. Verification Checklist (Post-Migration)

After any migration, verify:

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `grep -r "checkAIQuota" app/` — 0 matches
- [ ] `grep -r "recordAIUsage" app/` — 0 matches
- [ ] `grep -r "lib/premium" app/` — 0 matches in AI routes
- [ ] Guru dashboard AI usage widget shows correct counts
- [ ] Admin AI analytics shows legacy route usage
- [ ] MURID can still access soal via supabaseId
- [ ] MURID can still access guru/latihan via isTeacherOrStudent
- [ ] Rate limits unchanged
- [ ] All QA tests pass

---

## 13. Appendix: File Inventory

### Files to modify (Phase 1C)

| File | Changes |
|------|---------|
| `app/api/ai/soal/route.ts` | Replace legacy with modern gateway |
| `app/api/guru/latihan/route.ts` | Replace legacy with modern gateway |
| `app/api/guru/dashboard/route.ts` | Update feature string matching |
| `app/api/admin/ai-analytics/route.ts` | Add legacy feature entries |

### Files to delete (Phase 1D, recommended)

| File | Reason |
|------|--------|
| `app/api/ai/rpp/route.ts` | Deprecated, 0 callers |
| `app/api/ai/rpp/status/route.ts` | Job status endpoint for deleted RPP |

### Files unchanged

| File | Reason |
|------|--------|
| `lib/premium.ts` | Keep until all 7 callers migrated (Phase 1D after 1C) |
| `lib/ai-queue.ts` | Keep until RPP deleted (Phase 1D) |
| `lib/ai-gateway/agent-cost-policy.ts` | No change needed (rpp/soal already registered) |
| `lib/ai-gateway/plan-resolver.ts` | No change needed |
| `lib/ai-gateway/quota-checker.ts` | No change needed |

---

## 14. Metrics (Post-Migration Targets)

| Metric | Before 1C | After 1C | After 1D |
|--------|-----------|----------|----------|
| Routes importing `lib/premium.ts` | 3 | 1 (rpp only) | 0 |
| Routes importing `quota-checker.ts` | 10 | 12 | 12 |
| `checkAIQuota` callers | 3 | 0 | 0 |
| `recordAIUsage` callers | 3 | 0 | 0 |
| AIUsage rows per success | 1 | 1 | 1 |
| `logLegacyUsage` callers | 4 | 6 | 6 |
| Dual-system routes | 0 | 0 | 0 |

---

## 15. Appendix: Provider Chains (Unchanged)

| Route | Provider Order | Notes |
|-------|---------------|-------|
| rpp | Gemini → DeepSeek → Groq | Gemini-first (unique) |
| soal | DeepSeek → Groq → Gemini | Standard |
| guru/latihan | DeepSeek → Groq → Gemini | Standard |

Provider chains are independent of billing migration — no change needed.

---

## 16. Appendix: Cost Calculation (Unchanged)

All legacy routes use:
```typescript
const tokens = content.length;  // string length, NOT token count
const costUSD = (tokens / 1_000_000) * 0.5;
```

Modern routes use actual token counts where available. **This is cosmetic only** — `costUSD` is logged but never used for billing decisions. The actual billing is count-based (legacy) or credit-based (modern).

After migration, `costUSD` would still be logged via `logLegacyUsage` for analytics compatibility.

---

## 17. Audit Trail

| Step | Status | Notes |
|------|--------|-------|
| 1. Read all 3 legacy route files | ✅ | rpp (187L), soal (212L), latihan (432L) |
| 2. Read modern gateway files | ✅ | plan-resolver, quota-checker, agent-cost-policy, quota-policy, gateway-types |
| 3. Read premium-economy files | ✅ | plans, entitlement, usage |
| 4. Read billing/limits | ✅ | DAILY_EXPORT_LIMITS |
| 5. Read admin analytics | ✅ | dashboard, ai-analytics |
| 6. Search for hidden deps | ✅ | recordAIUsage (8 matches), checkAIQuota (10 matches), feature strings (7 matches) |
| 7. Read existing audit doc | ✅ | Phase 1A (368 lines) |
| 8. Analyze billing regression | ✅ | All 3 routes unlimited in legacy |
| 9. Analyze admin dashboard deps | ✅ | 2 routes depend on legacy feature strings |
| 10. Write audit document | ✅ | This document |
