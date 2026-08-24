# Phase 1A: Forensic Audit — Legacy AI Billing → Modern AI Gateway

**Date**: August 20, 2026  
**Status**: READ-ONLY AUDIT COMPLETE — No code changes  
**Author**: opencode

---

## Executive Summary

Two AI billing systems coexist in the codebase:

1. **Legacy** (`checkAIQuota` / `recordAIUsage` → `AIUsage` table) — count-based, per-feature limits
2. **Modern** (`checkAndPrepareDeduction` / `deductCreditsAtomic` → `AiCreditLedger` table) — credit-based, per-agent costs

**7 routes** still import legacy. **10 routes** import modern. **4 routes** import BOTH (dual-system). **3 routes** are legacy-only. The dual-system creates **redundant quota checks** and **double logging** on every successful call.

---

## 1. Complete Import Map

### Legacy (`lib/premium.ts`): 7 importers

| Route | System | Notes |
|-------|--------|-------|
| `app/api/ai/rpp/route.ts` | LEGACY-ONLY | Deprecated, job queue, Gemini→DeepSeek→Groq fallback |
| `app/api/ai/soal/route.ts` | LEGACY-ONLY | Deprecated, sync execution, DeepSeek→Groq→Gemini |
| `app/api/guru/latihan/route.ts` | LEGACY-ONLY | Active (bank soal), sync execution, DeepSeek→Groq→Gemini |
| `app/api/ai/eyd/route.ts` | DUAL | Legacy check + modern check |
| `app/api/ai/feedback/route.ts` | DUAL | Legacy check + modern check |
| `app/api/ai/grading/route.ts` | DUAL | Legacy check + modern check |
| `app/api/ai/text-analysis/route.ts` | DUAL | Legacy check + modern check |

### Modern (`lib/ai-gateway/quota-checker.ts`): 10 importers

| Route | System | Notes |
|-------|--------|-------|
| `app/api/ai/agents/run/route.ts` | MODERN-ONLY | Universal agent runner |
| `app/api/ai/agents/stream/route.ts` | MODERN-ONLY | Streaming agent runner |
| `app/api/ai/agents/export/docx/route.ts` | MODERN-ONLY | DOCX export |
| `app/api/ai/agents/export/pptx/route.ts` | MODERN-ONLY | PPTX export |
| `app/api/ai/agents/export/pdf/route.ts` | MODERN-ONLY | PDF export |
| `app/api/ai/quota/status/route.ts` | MODERN-ONLY | Quota status API |
| `app/api/ai/eyd/route.ts` | DUAL | Legacy + modern |
| `app/api/ai/feedback/route.ts` | DUAL | Legacy + modern |
| `app/api/ai/grading/route.ts` | DUAL | Legacy + modern |
| `app/api/ai/text-analysis/route.ts` | DUAL | Legacy + modern |

### No importers (in lib/ only):
- `lib/premium.ts` — 0 lib-internal importers (only app/ routes)
- `lib/ai-gateway/quota-checker.ts` — 0 lib-internal importers

---

## 2. Per-Route Forensic Analysis

### 2A. DUAL-SYSTEM ROUTES (eyd, feedback, grading, text-analysis)

All 4 routes follow an **identical pattern**:

```
1. rateLimitRoute()                          — shared rate limiter
2. getUser()                                 — auth
3. checkAIQuota(user, feature)               — LEGACY count-based check
   → if !allowed: return 429 (QUOTA_EXCEEDED)
4. ensureMonthlyLedger(user)                 — MODERN ledger init
5. checkAndPrepareDeduction(user, agentId)   — MODERN credit check
   → if blocked: return 402 (QUOTA_EXCEEDED with credit details)
6. AI provider call (DeepSeek → Groq → Gemini)
   → on FAILURE: logLegacyUsage(... success:false ), return 500
   → on SUCCESS:
7.   deductCreditsAtomic(user.id, planInfo, credits)  — MODERN deduction
8.   recordAIUsage(user.id, feature, tokens, costUSD)  — LEGACY logging
9.   logLegacyUsage(... success:true )                  — MODERN logging
```

**Problems identified:**

| # | Problem | Severity | Impact |
|---|---------|----------|--------|
| 1 | **Double quota check**: legacy count-based AND modern credit-based both gate the same request. A user could pass legacy (unlimited PRO) but fail modern (credits exhausted), or vice versa. Two different 429/402 error shapes returned. | HIGH | Confusing UX — two different error messages for same resource |
| 2 | **Double logging**: `recordAIUsage()` writes to `AIUsage` (legacy), `logLegacyUsage()` ALSO writes to `AIUsage` (same table, different feature prefix). Every success = 2 DB rows. | MEDIUM | 2× rows in AIUsage, inflated usage stats |
| 3 | **Feature name mismatch**: legacy `checkAIQuota` uses feature `"koreksi"` for EYD, but `recordAIUsage` uses `"eyd_checker"`. Modern uses agentId `"eyd"`. Three different names for same operation. | LOW | Analytics confusion |
| 4 | **Legacy fallback dead code**: if legacy check fails (429), the modern check never runs. The modern credit system is bypassed entirely. | HIGH | Modern gateway partially disabled |

**Feature name mapping per dual route:**

| Route | `checkAIQuota` feature | `recordAIUsage` feature | `logLegacyUsage` feature | Modern agentId |
|-------|----------------------|------------------------|-------------------------|----------------|
| eyd | `"koreksi"` | `"eyd_checker"` | `"legacy:eyd"` | `"eyd"` |
| feedback | `"feedback"` | `"student_feedback"` | `"legacy:feedback"` | `"feedback"` |
| grading | `"koreksi"` | `"auto_grading"` | `"legacy:grading"` | `"grading"` |
| text-analysis | `"ringkasan"` | `"text_analysis"` | `"legacy:text-analysis"` | `"text-analysis"` |

### 2B. LEGACY-ONLY ROUTES (rpp, soal, guru/latihan)

**`app/api/ai/rpp/route.ts`** (187 lines, deprecated)
- `checkAIQuota(user, "rpp")` → count-based check (PRO = unlimited, FREE = -1 unlimited)
- `recordAIUsage(userId, "rpp_generator", tokens, costUSD)` on success
- Uses job queue (`createJob`/`completeJob`/`failJob`)
- Provider chain: Gemini → DeepSeek → Groq
- No modern gateway import at all

**`app/api/ai/soal/route.ts`** (212 lines, deprecated)
- `checkAIQuota(user, "soal")` → count-based check
- `recordAIUsage(user.id, "soal_generator", tokens, costUSD)` on success
- Sync execution (no job queue)
- Provider chain: DeepSeek → Groq → Gemini
- Saves generated soal to DB (`db.soal.createMany`)

**`app/api/guru/latihan/route.ts`** (432 lines, active)
- `checkAIQuota(user, "soal")` → count-based check
- `recordAIUsage(dbUser.id, "soal_generator", tokens, costUSD)` on success
- Sync execution, saves soal + creates Quiz + QuizQuestion
- Provider chain: DeepSeek → Groq → Gemini
- This is the active bank-soal generation endpoint

### 2C. MODERN-ONLY ROUTES (agents/run, agents/stream, exports, quota/status)

Clean modern pattern:
```
1. getUser() → auth
2. ensureMonthlyLedger(user) → ledger init
3. checkAndPrepareDeduction(user, agentId, input) → credit check
4. AI provider call via agent runner
5. deductCreditsAtomic(user.id, planInfo, credits) → deduction
6. logUsage(log) → single DB write to AIUsage (feature: "agent:<agentId>")
```

No legacy imports. No double logging. Single quota system.

---

## 3. Data Model Comparison

### `AIUsage` (legacy)
```
id            String
userId        String
feature       String          ← "rpp_generator", "soal_generator", "eyd_checker", etc.
provider      String?         ← "deepseek", "groq", "gemini"
model         String?         ← "deepseek-chat", "openai/gpt-oss-20b", etc.
status        String?         ← "success", "error", "unknown"
errorCode     String?         ← mapped error codes
tokens        Int             ← content.length (NOT token count)
costUSD       Float           ← (tokens / 1_000_000) * 0.5
latencyMs     Int?
bulan         String          ← "2026-08" (YYYY-MM)
createdAt     DateTime
```
Indexed on `[userId, feature, bulan]`.

**Used by**: Legacy `checkAIQuota` (counts rows), `recordAIUsage` (creates rows), `logUsage` (creates rows), `logLegacyUsage` (creates rows), `logExportEvent` (creates rows), admin analytics.

### `AiCreditLedger` (modern)
```
id              String
userId          String
period          String          ← "2026-08" (YYYY-MM)
plan            String          ← "GURU_FREE", "GURU_PRO", etc.
creditsTotal    Int             ← 30 (FREE), 500 (PRO), etc.
creditsUsed     Int             ← running total of consumed credits
creditsReserved Int             ← reserved (for streaming, etc.)
source          String          ← "monthly_allocation", "trial_grant", etc.
startsAt        DateTime
endsAt          DateTime
createdAt       DateTime
updatedAt       DateTime
```
Unique on `[userId, period, plan]`.

**Used by**: Modern `ensureMonthlyLedger`, `checkAndPrepareDeduction`, `deductCreditsAtomic`, `getRemainingCredits`, `getLedgerInfo`.

### Key Differences

| Aspect | AIUsage (legacy) | AiCreditLedger (modern) |
|--------|-----------------|------------------------|
| **Granularity** | Per-call row | Monthly ledger row |
| **Limit check** | COUNT rows in period | SUM creditsUsed vs creditsTotal |
| **Cost model** | Uniform (tokens-based) | Per-agent (eyd=1, rpp=3-5, etc.) |
| **Plan awareness** | None (uses `getUserPlan` separately) | Embedded (`plan` column) |
| **Deduction** | None (just logging) | Atomic (`updateMany` with WHERE guard) |
| **Analytics** | Rich (per-call: provider, model, status, latency) | Aggregate only (credits used) |

---

## 4. Plan Resolution Conflict

### Legacy `getUserPlan()` (lib/premium.ts, internal)
```
isFounder → PRO
isPremium && premiumUntil > now → PRO
premiumPlan || "FREE" → FREE | PRO
```
Returns `PremiumPlan` (FREE | PRO). Only 2 outcomes.

### Modern `resolveUserAiPlan()` (lib/ai-gateway/plan-resolver.ts)
```
isFounder → FOUNDER (∞ credits)
MURID role → MURID_FREE (∞ credits)
GURU + isPremium + premiumUntil > now → GURU_PRO (500 credits/mo)
GURU + trialEndsAt > now → GURU_PRO_TRIAL (200 credits total)
GURU + !premium → GURU_FREE (30 credits/mo)
SCHOOL role → SCHOOL (∞ credits)
```
Returns `PlanResolverResult` with 6 outcomes + `creditsTotal`.

### Conflict in dual-system routes:
- Legacy allows ALL PRO users unlimited usage (count = -1)
- Modern limits PRO to 500 credits/month
- A GURU_PRO user with 0 remaining credits would:
  - PASS legacy check (unlimited) → hit modern check → **blocked with 402**
  - But if legacy check fails first (e.g., FREE user at limit), modern check never runs

---

## 5. Migration Risk Assessment

### Route-by-route risk

| Route | Risk | Reason |
|-------|------|--------|
| `eyd` | LOW | Dual-system, modern already active. Remove legacy = simple. |
| `feedback` | LOW | Dual-system, modern already active. Remove legacy = simple. |
| `grading` | LOW | Dual-system, modern already active. Remove legacy = simple. |
| `text-analysis` | LOW | Dual-system, modern already active. Remove legacy = simple. |
| `soal` | MEDIUM | Legacy-only, needs modern import + credit cost registration |
| `guru/latihan` | MEDIUM | Legacy-only, active endpoint, needs modern import + credit cost |
| `rpp` | LOW | Deprecated, 0 callers, can delete entirely |

### Data migration risk

| Aspect | Risk | Mitigation |
|--------|------|------------|
| AIUsage rows | LOW | Keep table for analytics. New rows via `logUsage` continue. |
| AiCreditLedger rows | NONE | Already active. No schema change. |
| `checkAIQuota` removal | LOW | Only 7 callers. Each can be replaced with `checkAndPrepareDeduction`. |
| `recordAIUsage` removal | LOW | Only 7 callers. Each can be replaced with `logLegacyUsage` or removed. |

### User-facing risk

| Scenario | Current behavior | After migration |
|----------|-----------------|-----------------|
| GURU_PRO uses eyd | Passes legacy (unlimited) + passes modern (500 credits) | Passes modern only (500 credits) |
| GURU_FREE uses eyd | Passes legacy (3 free) + passes modern (30 credits) | Passes modern only (30 credits) |
| GURU_PRO with 0 credits | Passes legacy (unlimited) + FAILS modern (402) | FAILS modern (402) |
| GURU_FREE at 3 uses | FAILS legacy (429) → modern never checked | FAILS modern (402 with credit details) |

**Net effect**: Migration makes behavior MORE restrictive for PRO users (credits vs unlimited), and MORE informative for FREE users (402 with credit breakdown vs raw 429).

---

## 6. Recommended Migration Order

### Phase 1B: Dual-system cleanup (LOW risk, HIGH value)
1. **eyd** — remove `checkAIQuota` + `recordAIUsage` imports, keep `logLegacyUsage` for analytics
2. **feedback** — same
3. **grading** — same
4. **text-analysis** — same

This eliminates 4 dual-system routes → 4 modern-only routes. Halves AIUsage writes. No behavior change (modern check already gates).

### Phase 1C: Legacy-only route migration (MEDIUM risk)
5. **soal** — add modern imports, register credit cost, remove legacy
6. **guru/latihan** — same

These routes need credit cost added to `agent-cost-policy.ts` first.

### Phase 1D: Legacy cleanup (LOW risk)
7. **rpp** — delete entire file (deprecated, 0 callers, job queue dead code)
8. Remove `checkAIQuota` and `recordAIUsage` from `lib/premium.ts` (0 callers after 1–7)
9. Remove `AIUsage` feature constants from `lib/premium.ts`

### Phase 1E: Analytics migration (LOW risk, deferred)
10. `logLegacyUsage` → rename to `logUsage` or consolidate with existing `logUsage` in `usage-logger.ts`
11. Admin analytics routes that read `AIUsage` → no change needed (table stays)

---

## 7. What Stays

| Component | Stays? | Reason |
|-----------|--------|--------|
| `AIUsage` table | YES | Analytics, admin dashboard, audit trail |
| `logUsage` (usage-logger.ts) | YES | Modern agent runner writes here |
| `logLegacyUsage` (usage-logger.ts) | YES→RENAME | Rename to `logLegacyRouteUsage` or consolidate |
| `logExportEvent` (usage-logger.ts) | YES | Export events tracked here |
| `lib/premium.ts` (checkAIQuota, recordAIUsage) | DELETE | After all 7 callers migrated |
| `lib/ai-gateway/quota-checker.ts` | YES | Credit ledger operations |
| `lib/ai-gateway/plan-resolver.ts` | YES | Plan resolution (6 outcomes) |
| `lib/ai-gateway/quota-policy.ts` | YES | Credit limits per plan |
| `lib/ai-gateway/agent-cost-policy.ts` | YES | Credit costs per agent |

---

## 8. Metrics to Track During Migration

| Metric | Before | Target after 1B | Target after 1C |
|--------|--------|-----------------|-----------------|
| Routes importing `lib/premium.ts` | 7 | 3 (rpp, soal, latihan) | 1 (rpp only) |
| Routes importing `quota-checker.ts` | 10 | 14 | 16 |
| Dual-system routes | 4 | 0 | 0 |
| AIUsage rows per success | 2 | 1 | 1 |
| `checkAIQuota` callers | 7 | 3 | 1 |
| `recordAIUsage` callers | 7 | 3 | 1 |

---

## 9. Appendix: Feature String Inventory

### Legacy `checkAIQuota` feature strings (count-based limits)
- `"rpp"` → limit: -1 (unlimited for all)
- `"soal"` → limit: -1 (unlimited for all)
- `"koreksi"` → FREE: 3, PRO: -1
- `"chat"` → FREE: 5, PRO: -1
- `"grading"` → FREE: 5, PRO: -1
- `"ringkasan"` → FREE: 5, PRO: -1 (used by text-analysis route)
- `"feedback"` → FREE: 5, PRO: -1

### Legacy `recordAIUsage` feature strings
- `"rpp_generator"` — used by rpp route
- `"soal_generator"` — used by soal + guru/latihan routes
- `"eyd_checker"` — used by eyd route
- `"student_feedback"` — used by feedback route
- `"auto_grading"` — used by grading route
- `"text_analysis"` — used by text-analysis route

### Modern `logLegacyUsage` feature strings
- `"legacy:eyd"` — used by eyd route
- `"legacy:feedback"` — used by feedback route
- `"legacy:grading"` — used by grading route
- `"legacy:text-analysis"` — used by text-analysis route

### Modern `logUsage` feature strings (agent runner)
- `"agent:<agentId>"` — used by agents/run route

### Modern `logExportEvent` feature strings
- `"ai_export_docx"`, `"ai_export_pdf"`, `"ai_export_pptx"` — used by export routes

---

## 10. Appendix: Provider Chains

| Route | Provider Order |
|-------|---------------|
| rpp | Gemini → DeepSeek → Groq |
| soal | DeepSeek → Groq → Gemini |
| guru/latihan | DeepSeek → Groq → Gemini |
| eyd | DeepSeek → Groq → Gemini |
| feedback | DeepSeek → Groq → Gemini |
| grading | DeepSeek → Groq → Gemini |
| text-analysis | DeepSeek → Groq → Gemini |
| agents/run | via agent runner (provider per agent) |
| agents/stream | via agent runner (provider per agent) |

---

## 11. Appendix: Cost Calculation

All legacy routes use the same formula:
```typescript
const costUSD = (tokens / 1_000_000) * 0.5;
```
Where `tokens = content.length` (string length, NOT actual token count).

Modern routes use actual token counts from provider response (`json.usage.total_tokens`) where available, or `content.length` as fallback.

**This is a cosmetic difference only** — costUSD is logged but never used for billing decisions. The actual billing is count-based (legacy) or credit-based (modern).
