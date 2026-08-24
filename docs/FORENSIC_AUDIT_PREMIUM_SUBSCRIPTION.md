# FORENSIC AUDIT: Premium/Subscription + Midtrans System

**Date:** Aug 24, 2026 | **Mode:** READ-ONLY | **Scope:** Full-stack payment, entitlement, and subscription audit

---

## 1. Executive Verdict

**The premium/subscription system is well-architected with strong server-side enforcement.** All critical gates (plan resolution, credit deduction, webhook verification, checkout validation) are server-side. Client components are purely display and cannot bypass any restrictions.

**System Health: 7/10**

| Category | Score | Notes |
|----------|-------|-------|
| Security | 9/10 | Webhook signature, idempotency, server-side checks all correct |
| Architecture | 5/10 | 3 plan resolver engines, 5 plan type representations, dead code |
| Entitlement Enforcement | 8/10 | Strong server-side, but `canUseAI()` bypass exists |
| Payment Integrity | 8/10 | Atomic claim-first pattern, but DB write failures swallowed |
| UX | 7/10 | Clear flows, but dual checkout paths confuse maintenance |
| Code Quality | 4/10 | ~70% dead code in `lib/premium.ts`, 3 duplicate `UserLike` interfaces |

---

## 2. What Already Exists

### Files Audited (19 files)

| # | File | Status | Purpose |
|---|------|--------|---------|
| 1 | `lib/premium.ts` | **70% DEAD** | Legacy premium/quota system |
| 2 | `lib/ai-gateway/plan-resolver.ts` | **ACTIVE** | AI credit plan resolution |
| 3 | `lib/ai-gateway/quota-checker.ts` | **ACTIVE** | Atomic credit deduction |
| 4 | `lib/premium-economy/plans.ts` | **ACTIVE** | Entitlement/subscription resolution |
| 5 | `lib/billing/plans.ts` | **ACTIVE** | Billing plan catalog |
| 6 | `lib/billing/limits.ts` | **ACTIVE** | Daily export limits |
| 7 | `lib/billing/kupon.ts` | **ACTIVE** | Coupon validation |
| 8 | `lib/payments/midtrans-server.ts` | **ACTIVE** | Server-side Midtrans Snap API |
| 9 | `lib/midtrans.ts` | **PARTIALLY DEAD** | Legacy Midtrans helper |
| 10 | `lib/midtrans-client.ts` | **ACTIVE** | Client-side Snap.js loader |
| 11 | `app/api/billing/checkout/route.ts` | **ACTIVE** | New checkout endpoint |
| 12 | `app/api/payment/webhook/route.ts` | **ACTIVE** | Midtrans webhook handler |
| 13 | `app/(dashboard)/guru/berlangganan/page.tsx` | **ACTIVE** | Subscription page |
| 14 | `components/premium/PremiumTrialCard.tsx` | **ACTIVE** | Trial activation card |
| 15 | `components/guru/AiCreditBalance.tsx` | **ACTIVE** | Credit balance display |
| 16 | `components/guru/SidebarPremiumBadge.tsx` | **ACTIVE** | Sidebar premium badge |
| 17 | `components/guru/TeacherCommandCenter.tsx` | **ACTIVE** | Command center hero |
| 18 | `components/shared/upgrade-modal.tsx` | **ACTIVE** | Upgrade modal |
| 19 | `prisma/schema.prisma` | **ACTIVE** | Database schema |

---

## 3. Midtrans Architecture

### Payment Flow (End-to-End)

```
Client → POST /api/billing/checkout { planId, couponCode? }
  → Auth check (getUser)
  → Role check (GURU/ADMIN or founder)
  → Plan validation (getPlan from server catalog)
  → Coupon validation (validasiKupon)
  → Midtrans config validation
  → Founder/Admin bypass → direct premium activation (NO PAYMENT)
  → Midtrans Snap transaction creation
  → Transaksi record created (PENDING)
  → Coupon usage recorded (best-effort)
  → Token + redirect URL returned to client
  → Client opens Midtrans Snap popup
  → User pays via Midtrans
  → Midtrans server → POST /api/payment/webhook
    → Signature verification (SHA512)
    → Idempotent claim (atomic updateMany)
    → premiumUntil calculated + stacked
    → User.isPremium=true, premiumPlan="PRO"
    → AI credit ledger synced
    → Notification created
```

### Webhook Security

| Check | Status | Implementation |
|-------|--------|---------------|
| Signature verification | ✅ PASS | SHA512(order_id + status_code + gross_amount + serverKey) |
| Idempotency | ✅ PASS | Atomic `updateMany` with `status: { not: "SUCCESS" }` |
| Downgrade protection | ✅ PASS | SUCCESS cannot be overwritten by non-SUCCESS |
| Premium stacking | ✅ PASS | `durationDays` added to existing `premiumUntil` inside transaction |
| Unknown orderId | ✅ PASS | Returns 200 (required by Midtrans) |

### Midtrans Integration Details

| Item | Value |
|------|-------|
| SDK | NOT installed (raw `fetch()` to Snap API) |
| Endpoint | `https://app.midtrans.com/snap/v1/transactions` (prod) / `https://app.sandbox.midtrans.com/snap/v1/transactions` (sandbox) |
| Auth | Basic Auth (`serverKey:`) |
| Client library | `lib/midtrans-client.ts` loads Snap.js script from `app.midtrans.com/snap/snap.js` |
| Server key location | `MIDTRANS_SERVER_KEY` env var (never exposed to client) |
| Client key location | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` env var (exposed to client — correct) |

---

## 4. Subscription Architecture

### 3 Plan Resolver Engines

| Engine | File | Returns | Used By |
|--------|------|---------|---------|
| **A** Legacy | `lib/premium.ts:10` | `"PRO" \| "FREE"` | 0 external (DEAD) |
| **B** AI Gateway | `lib/ai-gateway/plan-resolver.ts:17` | `AiPlan` (6 values) | 7 files (AI credit system) |
| **C** Premium Economy | `lib/premium-economy/plans.ts:37` | `PlanCode` (3 values) | 3 routes (entitlement system) |

### Plan Taxonomy Conflict

| User State | Engine A | Engine B | Engine C |
|------------|----------|----------|----------|
| Founder | `"PRO"` | `FOUNDER` | `FOUNDER` |
| Guru Pro (paid) | `"PRO"` | `GURU_PRO` | `PRO` |
| Guru Trial | `"PRO"` | `GURU_PRO_TRIAL` | `PRO` |
| Guru Free | `"FREE"` | `GURU_FREE` | `FREE` |
| Murid | `"FREE"` | `MURID_FREE` | `FREE` |
| ADMIN | `"PRO"` | `FOUNDER` | `FOUNDER` |

**Three different strings for the same user state.** No shared type definitions.

### Trial System

| Rule | Implementation |
|------|---------------|
| One-time only | ✅ `trialStartedAt !== null` → ineligible |
| 30-day duration | ✅ `trialEndsAt = now + 30 days` |
| 200 credits | ✅ `trialCreditsTotal = 200` |
| Does NOT set `isPremium` | ✅ Only `trialStartedAt`/`trialEndsAt`/`trialPlan` |
| Auto-renew | ❌ Trial expiry → `GURU_FREE` (no auto-upgrade to Pro) |

---

## 5. Database Architecture

### Relevant Models (10)

| Model | Purpose | FK Relationships |
|-------|---------|-----------------|
| **User** | Denormalized premium flags | Standalone |
| **Subscription** | Midtrans recurring billing | `userId` → User (implicit) |
| **Plan** | Premium tier definitions | Standalone |
| **Entitlement** | Feature limits per plan | `planCode` → Plan.code (NO @relation) |
| **PremiumUsage** | Periodic feature consumption | No FK to Plan/Entitlement |
| **Transaksi** | Individual payment transactions | `userId` → User |
| **Pembelian** | Marketplace purchase | `buyerId`/`sellerId` → User |
| **Kupon** / **KuponPemakaian** | Discount coupons | Standalone |
| **AiCreditLedger** | AI credit allocation | `userId` → User |
| **AdminPaymentAuditLog** | Admin action audit trail | `adminId` → User |

### Critical Schema Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **Dual plan enums** | HIGH | `PremiumPlan` (User) ≠ `SubscriptionPlan` (Subscription) ≠ `Plan.code` |
| **isPremium not derived** | HIGH | Denormalized boolean, not computed from Subscription |
| **No FK Subscription→Transaksi** | LOW | `lastTransactionId` is orphaned reference |
| **No FK Entitlement→Plan** | LOW | Logical FK enforced by app code only |
| **No FK PremiumUsage→Entitlement** | LOW | Feature matching is string-based at runtime |
| **premiumUntil vs currentPeriodEnd** | MEDIUM | Two expiry concepts that could diverge |
| **trialPlan is free-text** | LOW | `"GURU_PRO_TRIAL"` not validated by enum |
| **Multiple ACTIVE subscriptions possible** | MEDIUM | No unique constraint on `(userId, status)` |

---

## 6. Premium Source of Truth

### Current State: Hybrid Architecture

```
┌─────────────────────────────────────────────────────┐
│                  RUNTIME RESOLVER                     │
│  lib/ai-gateway/plan-resolver.ts                     │
│  lib/premium-economy/plans.ts                        │
│  (bridges gap between legacy flags + subscription)   │
└─────────────────────────────────────────────────────┘
         ↑ reads from                    ↑ reads from
┌────────────────┐              ┌────────────────────┐
│  User Model     │              │  Subscription Model │
│  (legacy flags) │              │  (Midtrans records)  │
│  isPremium      │              │  status              │
│  premiumPlan    │              │  currentPeriodEnd    │
│  premiumUntil   │              │  midtransSubId       │
└────────────────┘              └────────────────────┘
```

### Source of Truth Hierarchy

| Priority | Source | Used By |
|----------|--------|---------|
| 1 | `User.isFounder` | All resolvers (highest priority) |
| 2 | `User.isPremium && premiumUntil > now` | Engines A, B, C |
| 3 | `Subscription.status === ACTIVE` | Engine C only (`resolvePlan()`) |
| 4 | `User.trialEndsAt > now` | Engines B, C |
| 5 | `User.premiumPlan` | Engine A fallback (stale) |

**Key insight:** `isPremium` is a denormalized flag, NOT derived from the Subscription table. A user could have `isPremium=true` with no Subscription record (manual activation) or an ACTIVE Subscription with `isPremium=false` (stale flag).

---

## 7. Entitlement Map

### Plan Benefits (Server-Side)

| Feature | GURU_FREE | GURU_PRO_TRIAL | GURU_PRO | FOUNDER | MURID_FREE |
|---------|-----------|----------------|----------|---------|------------|
| AI Credits/month | 30 | 200 (total) | 500 | 999,999 | 999,999 |
| Daily Export Limit | 1 | 10 | 10 | ∞ | ∞ |
| Simulation Limit/month | 3 | 10 | 10 | ∞ | ∞ |
| Premium Features | ❌ | ✅ | ✅ | ✅ | N/A |
| Sell on Marketplace | Limited | ✅ | ✅ | ✅ | N/A |
| Commission Rate | 80% | 85% | 85% | 100% | N/A |

### Enforcement Layers

| Layer | Component | Server/Client | Status |
|-------|-----------|---------------|--------|
| Plan Resolution | `plan-resolver.ts` | Server | ✅ Active |
| Credit Quota | `quota-checker.ts` | Server | ✅ Atomic |
| Daily Export Limits | `limits.ts` | Server | ✅ Active |
| Checkout + Webhook | `checkout/` + `webhook/` | Server | ✅ Active |
| Client Display | `SidebarPremiumBadge`, `AiCreditBalance` | Client | Display-only |

---

## 8. Security Findings

### 🔴 CRITICAL (2)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| C1 | `canUseAI()` always returns `true` — bypasses all quota checks | `lib/premium.ts:22` | Any user can use unlimited AI if this function is called instead of `checkAIQuota()` |
| C2 | Founder/Admin checkout bypass swallows DB errors — returns "success" when premium not activated | `app/api/billing/checkout/route.ts:112` | User believes premium is active but isn't; no retry mechanism |

### 🟡 MODERATE (5)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| M1 | Checkout continues to Midtrans if local `Transaksi.create` fails — payment possible with no local record | `checkout/route.ts:198-200` | Payment taken, webhook hits "unknown orderId", no premium activated |
| M2 | Coupon usage recording failure = coupon not consumed — reusable | `checkout/route.ts:220-222` | Coupon abuse via DB write failure |
| M3 | MURID gets 999,999 AI credits (unlimited) — may be intentional but undocumented | `plan-resolver.ts:39` | Students bypass all AI quotas |
| M4 | No rate limiting on coupon validation attempts | `kupon.ts` | Brute-force coupon codes possible |
| M5 | No subscription table synchronization between checkout (Transaksi) and plan-resolver (subscriptions query) | Multiple | If `subscriptions` table is not populated by webhook, DB resolver always falls back to legacy flags |

### 🟢 POSITIVE (7)

| # | Finding | Location |
|---|---------|----------|
| P1 | Atomic claim-first idempotency in webhook — handles concurrent/duplicate correctly | `webhook/route.ts:201-206` |
| P2 | Downgrade protection — SUCCESS cannot be overwritten by non-SUCCESS | `webhook/route.ts:191-193` |
| P3 | Premium stacking inside same transaction — no double-extend race | `webhook/route.ts:253-257` |
| P4 | Trial is one-time only, cannot restart | `trial-service.ts:27-28` |
| P5 | All premium checks are server-side, no client-trusted gates | All files |
| P6 | Coupon price floor enforces Midtrans minimum (Rp 1,000) | `kupon.ts:14,27,33` |
| P7 | Founder/Admin bypass checks `isFounder` first in all resolvers — cannot be spoofed via subscription state | `plan-resolver.ts:22`, `plans.ts:41` |

---

## 9. Legacy/Duplication

### Dead Code in `lib/premium.ts` (10 functions)

| Function | Status | Replacement |
|----------|--------|-------------|
| `getUserPlan()` | DEAD | `resolveUserAiPlan()` in `ai-gateway/plan-resolver.ts` |
| `canUseAI()` | DEAD (always returns true) | `checkAIQuota()` in same file |
| `getAIUsageCount()` | DEAD | `getUsageCount()` in `ai-gateway/quota-checker.ts` |
| `checkAIQuota()` | DEAD-ISH | `checkAndPrepareDeduction()` in `quota-checker.ts` |
| `getLeagueFromXP()` | DEAD | `rankFromLevel()` in `gamification/ranks.ts` |
| `getLevelFromXP()` | DEAD | `levelFromXp()` in `gamification/levels.ts` |
| `getPredikatUKBI()` | DEAD | Inline in `submit/route.ts:86` |
| `getPredikatColor()` | DEAD | Inline in `dokumen-latihan/page.tsx:35` |
| `getUKBIPassingStatus()` | DEAD | Never imported |
| `getTKAPredikat()` | DEAD | Inline in `submit/route.ts:86` |

**Keep only:** `formatCurrency()`, `recordAIUsage()`, `getGelarFromLevel()`

### Duplicate `UserLike` Interface (3 definitions)

| File | Fields |
|------|--------|
| `lib/ai-gateway/plan-resolver.ts:3` | role, isFounder, isPremium, premiumUntil, trialEndsAt, trialStartedAt, premiumPlan |
| `lib/premium-economy/plans.ts:19` | role, isFounder, isPremium, premiumUntil, trialEndsAt |
| `lib/ai-gateway/quota-checker.ts:8` | id, role, isFounder, isPremium, premiumUntil, trialEndsAt, trialStartedAt, premiumPlan |

### Duplicate Midtrans Transaction Creation (2 implementations)

| File | Function | Error Handling |
|------|----------|---------------|
| `lib/midtrans.ts:43` | `createSnap()` | Raw `Error` |
| `lib/payments/midtrans-server.ts:100` | `createMidtransSnapTransaction()` | `MidtransError` class |

Same HTTP call, different error handling, different validation.

### Credit Constants (hardcoded in 2 places)

| File | Value |
|------|-------|
| `lib/billing/plans.ts:17` | `aiCreditsMonthly: 500` |
| `lib/ai-gateway/plan-resolver.ts:52` | `creditsTotal: 500` |

Same number, no shared constant. If one changes, the other must be updated manually.

---

## 10. UX Audit

### Subscription Page (`/guru/berlangganan`)

| Step | What User Sees | What Happens Server-Side |
|------|----------------|--------------------------|
| **New Guru Login** | "Guru Pro Trial 30 hari" badge | `startGuruTrialIfEligible()` — one-time, 200 credits |
| **Trial Active** | Violet badge + countdown | Plan = `GURU_PRO_TRIAL`, 200 credits/month |
| **Trial Expired** | "Guru Free" gray badge | Plan = `GURU_FREE`, 30 credits/month |
| **Click "Langganan"** | Plan comparison page | Fetches user info + quota status |
| **Select Plan + Coupon** | Price updates in real-time | Coupon validated server-side |
| **Pay via Midtrans** | Snap popup | Midtrans creates transaction |
| **Payment Success** | "PRO Aktif!" golden banner | Webhook → `isPremium=true`, `premiumUntil` set |
| **Pro Active** | Amber badge + expiry date | 500 credits/month, 10 exports/day |
| **Pro Expiring (≤7 days)** | Amber warning card | Renewal prompt |
| **Pro Expired** | Red card → falls to Guru Free | `premiumUntil < now` → plan resolver returns `GURU_FREE` |

### Dual Checkout Paths

| Path | Route | Plan Selection | Coupon Support |
|------|-------|---------------|----------------|
| **New** | `/api/billing/checkout` | `PlanId` (server catalog) | ✅ Yes |
| **Legacy** | `/api/payment/create-invoice` | `"monthly"\|"yearly"` (hardcoded) | ❌ No |

Both are server-validated. No bypass possible. But increases maintenance surface.

---

## 11. Gap Analysis

### What's Missing

| Gap | Impact | Priority |
|-----|--------|----------|
| No subscription table sync with checkout | `resolvePlan()` DB resolver always falls back to legacy flags | HIGH |
| No rate limiting on coupon validation | Brute-force coupon codes possible | MEDIUM |
| No audit log for failed coupon attempts | Failed validations not recorded | LOW |
| Soft mode quota default | If `isHardMode()` returns false, credit limits are advisory | HIGH |
| No unique constraint on `(userId, status)` in Subscription | Multiple ACTIVE subscriptions possible | MEDIUM |
| No FK between Entitlement and Plan | Logical FK enforced by app code only | LOW |
| `premiumUntil` vs `currentPeriodEnd` could diverge | Two expiry concepts | MEDIUM |

### What's Good

| Strength | Implementation |
|----------|---------------|
| Server-side enforcement | All premium checks server-side, no client-trusted gates |
| Webhook idempotency | Atomic claim-first pattern handles concurrent/duplicate |
| Premium stacking | `durationDays` added inside transaction — no race |
| Trial one-time only | Cannot restart after expiry |
| Founder/Admin bypass | Checks `isFounder` first — cannot be spoofed |
| Coupon price floor | Enforces Midtrans minimum (Rp 1,000) |

---

## 12. Recommendations

### Immediate (no schema migration)

1. **Delete dead code from `lib/premium.ts`** — Keep only `formatCurrency`, `recordAIUsage`, `getGelarFromLevel`
2. **Delete dead code from `lib/midtrans.ts`** — Remove `createKaryaTransaction`, `getMidtransApiUrl`, `createSnap`, `createTransaction`
3. **Consolidate `UserLike`** — One shared type in `lib/types/user.ts`
4. **Extract shared credit constant** — `CREDITS_GURU_PRO = 500` in `lib/billing/plans.ts`

### Medium-term (requires route changes)

5. **Migrate legacy AI routes** — 7 routes importing from `lib/premium.ts` should migrate to `lib/ai-gateway/quota-checker.ts`
6. **Unify plan resolution** — Merge `resolveUserAiPlan` (AI gateway) and `resolvePlan` (premium-economy) into single resolver
7. **Add rate limiting on coupon validation** — Per IP/user
8. **Fix founder bypass error handling** — Return error if DB write fails instead of fake success

### Long-term (schema changes)

9. **Unify plan type enums** — `PremiumPlan`, `AiPlan`, `PlanCode` → one canonical enum
10. **Complete premium-economy migration** — Remove graceful fallback once `PremiumUsage` table is live
11. **Add unique constraint** on `Subscription(userId, status)` where status = ACTIVE
12. **Add FK Entitlement→Plan** — Enforce referential integrity at DB level

---

## 13. Next Phase Roadmap

### Phase 1: Cleanup (1-2 days)
- Delete dead code from `lib/premium.ts` (10 functions)
- Delete dead code from `lib/midtrans.ts`
- Consolidate `UserLike` interface
- Extract shared credit constant

### Phase 2: Hardening (2-3 days)
- Add rate limiting on coupon validation
- Fix founder bypass error handling
- Add idempotency check before Midtrans call
- Audit `subscriptions` table population

### Phase 3: Unification (3-5 days)
- Merge plan resolvers into single canonical resolver
- Migrate legacy AI routes to modern gateway
- Unify plan type enums

### Phase 4: Schema Migration (5-7 days)
- Add FK Entitlement→Plan
- Add unique constraint on Subscription(userId, status)
- Remove `isPremium` denormalized flag (compute from Subscription)

---

## 14. Founder Decisions Required

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Delete dead code from `lib/premium.ts`? | Yes/No | Yes — 10 functions are dead, keep 3 |
| 2 | Consolidate plan resolvers? | Yes/No | Yes — merge into single canonical resolver |
| 3 | Add rate limiting on coupon validation? | Yes/No | Yes — prevent brute-force |
| 4 | Fix founder bypass error handling? | Yes/No | Yes — return error instead of fake success |
| 5 | Migrate legacy AI routes? | Yes/No | Yes — 7 routes use outdated quota system |
| 6 | Unify plan type enums? | Yes/No | Yes — 5 representations is too many |
| 7 | Complete premium-economy migration? | Yes/No | Yes — remove graceful fallback |
| 8 | Add unique constraint on Subscription? | Yes/No | Yes — prevent multiple ACTIVE subscriptions |

---

**Audit completed:** Aug 24, 2026 | **Files audited:** 19 | **Lines reviewed:** ~3,500 | **Findings:** 2 critical, 5 moderate, 7 positive
