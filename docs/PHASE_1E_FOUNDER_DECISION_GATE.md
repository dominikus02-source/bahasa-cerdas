# Phase 1E: Founder Decision & Final Architecture Gate

**Date**: August 24, 2026
**Status**: READ-ONLY — Decision Preparation
**Author**: opencode (Senior Full-Stack Engineer)
**Scope**: Convert Phase 1A–1D forensic findings into a concise Founder Decision Matrix and recommended architecture for MURID PREMIUM.

---

## 1. Forensic Foundation Summary

Phase 1A–1D established:

| Phase | Finding | Status |
|-------|---------|--------|
| 1A | Dual billing system (AI Gateway credits + Premium Economy features) | Migrated |
| 1B | 4 dual-system routes cleaned (eyd, feedback, grading, text-analysis) | Migrated |
| 1C | 3 legacy routes have unlimited quota — migration = billing regression | BLOCKED |
| 1D | Full architecture design + 14 founder decisions | Documented |

**Critical insight**: The two billing systems (AI Gateway and Premium Economy) operate independently. They don't share plan codes, tables, or resolution logic. This is functional but creates maintenance overhead. For MURID PREMIUM, we can leverage Premium Economy (feature-tiered) without touching AI Gateway (credit-based for Guru).

---

## 2. Current System Reality (Verified from Code)

### Point 1: AI Gateway uses credit-based plans
**Verified**: `resolveUserAiPlan()` returns 6 outcomes: FOUNDER, MURID_FREE, GURU_PRO, GURU_PRO_TRIAL, GURU_FREE, SCHOOL. Each has `creditsTotal`.

### Point 2: Premium Economy uses feature-limit plans
**Verified**: `resolvePlan()` returns 3 outcomes: FREE, PRO, FOUNDER. Entitlements: 7 keys (SIMULATION_MONTHLY_LIMIT, AI_MENTOR_DAILY_LIMIT, AI_PRACTICE_MONTHLY_LIMIT, PREMIUM_PROFILE, PREMIUM_COSMETICS, ADVANCED_STATS, STREAK_FREEZE_MONTHLY).

### Point 3: They currently operate independently
**Verified**: AI Gateway reads `User.isFounder/isPremium/premiumUntil/trialEndsAt`. Premium Economy reads same fields via `resolvePlan()` → `getEntitlements()`. Different plan codes (GURU_PRO vs PRO), different tables (AiCreditLedger vs Entitlement/PremiumUsage).

### Point 4: Only GURU currently has purchasable plans
**Verified**: `lib/billing/plans.ts` has only `GURU_PRO_MONTHLY` and `GURU_PRO_YEARLY`. Checkout route checks `["GURU", "ADMIN"].includes(user.role)` → 403 for MURID.

### Point 5: Current Guru pricing
**Verified**: Monthly = Rp 49,000 (30 days, 500 credits). Yearly = Rp 399,000 (365 days, 500 credits).

### Point 6: MURID has no real subscription plan yet
**Verified**: `MURID_FREE` in AI Gateway = unlimited credits. No checkout flow for MURID. No murid trial.

### Point 7: Subscription model exists but is not wired
**Verified**: `model Subscription` in Prisma has `midtransSubscriptionId`, `status`, `currentPeriodStart/End`, `willRenew`, `cancelledAt`. But current flow uses one-time `Transaksi` records. `resolvePlan()` reads `subscriptions` table but current payment flow doesn't create Subscription records.

### Point 8: Midtrans Snap is currently one-time payment
**Verified**: `createTransaction()` in `lib/midtrans.ts` creates Snap token (one-time). Webhook activates premium. No recurring subscription API wired.

### Point 9: Legacy routes have unlimited quota
**Verified**: `AI_QUOTA.FREE.rpp = -1`, `AI_QUOTA.FREE.soal = -1`. Phase 1C confirmed: migrating to credits = GURU_FREE loses unlimited access.

### Point 10: Trial is one-shot
**Verified**: `shouldStartGuruTrial()` checks `trialStartedAt !== null` → skip. Never restarts. 30 days, 200 credits.

### Point 11: Production quota enforcement is hard-blocking
**Verified**: `isHardMode()` returns true in production. Insufficient credits = 402 error.

### Point 12: PremiumUsage migration not yet run
**Verified**: `usage.ts` catches P2021/P2022 errors gracefully (migration not run → quota not enforced). Console warning emitted.

---

## 3. Founder Decision Matrix

Extracted from Phase 1D Section 15 (14 decisions), combined where appropriate, prioritized:

### Decision #1: Murid Monetization Strategy
**Question**: Should BahasaCerdas monetize murid?
**Current State**: MURID_FREE = unlimited AI, no paid plan, no checkout, no trial.
**Options**:
- (A) No murid premium — keep everything free for students
- (B) Product experience premium — better learning, not more AI
- (C) Credit-based premium — more AI credits for murid
**Recommended**: (B) Product experience premium
**Why**: Murid don't generate expensive AI output. They consume content and practice. Premium = better learning experience (adaptive practice, AI mentor, progress insights), not more AI credits. Follows Duolingo Super/Max model.
**Risk if wrong**: (A) = no revenue from 1340 students. (C) = parents don't understand "credits," complex UX.
**Dependency**: P0 — must decide before any implementation.

### Decision #2: Legacy Route Migration
**Question**: What to do with RPP, Soal, Guru/Latihan routes?
**Current State**: All 3 routes have unlimited quota. RPP deprecated, Soal deprecated, Latihan active.
**Options**:
- (A) Keep unlimited for GURU_FREE — no change
- (B) Migrate to credit billing — GURU_FREE loses unlimited
- (C) Delete RPP + Soal, keep Latihan unlimited
- (D) Hybrid — Latihan uses modern gateway, others stay legacy
**Recommended**: (C) Delete RPP + Soal, keep Latihan unlimited
**Why**: RPP has 0 callers, deprecated. Soal has 0 direct callers (superseded by latihan). Latihan is active and used by `/guru/bank-soal`. Keep it unlimited (it's a legacy exception). Clean break on dead code.
**Risk if wrong**: (B) = GURU_FREE regression (unlimited → 6-10 calls/mo). (A) = dead code stays forever.
**Dependency**: None — can be done independently.

### Decision #3: Pricing for Murid Premium
**Question**: What should MURID PREMIUM cost?
**Current State**: No murid pricing exists. Guru Pro = Rp 49,000/month.
**Options**:
- (A) Rp 19,000/month + Rp 199,000/yearly
- (B) Rp 19,000/month + Rp 180,000/yearly
- (C) Rp 39,000/month + Rp 349,000/yearly
**Recommended**: (B) Rp 19,000/month + Rp 180,000/yearly
**Why**: Below Rp 20K psychological barrier ("under 20rb"). 21% annual discount (Rp 15,000/month effective). 21× cheaper than Ruangguru (Rp 400K). 46% cheaper than Duolingo Super (Rp 35K). Margin >89%.
**Risk if wrong**: Too high = low conversion. Too low = insufficient margin.
**Dependency**: Decision #1 (must decide murid premium exists first).

### Decision #4: Trial Design for Murid
**Question**: What trial should murid get?
**Current State**: No murid trial. Guru gets 30-day, 200-credit trial.
**Options**:
- (A) 7-day trial, limited features
- (B) 14-day trial, full features
- (C) 30-day trial, full features
- (D) No trial — direct payment only
**Recommended**: (A) 7-day trial, limited features (3 adaptive sessions + 10 mentor explanations + 5 simulations)
**Why**: Short trial = faster conversion decision. Students don't need 30 days to see value. Limited = enough to see value, not enough to be satisfied. Sweet spot for conversion.
**Risk if wrong**: Too short = no time to see value. Too long = no urgency to upgrade.
**Dependency**: Decision #1 + #3.

### Decision #5: Auto-Renewal vs Manual Renewal
**Question**: Should murid premium auto-renew?
**Current State**: No auto-renewal. One-time payment, manual renewal required.
**Options**:
- (A) One-time payment only (manual renewal)
- (B) Midtrans recurring subscription (auto-renew)
- (C) Both — start with one-time, add subscription later
**Recommended**: (C) Both — start with one-time, add subscription later
**Why**: Current Midtrans integration is one-time. Recurring requires Midtrans recurring API (not wired). Start with one-time monthly/yearly, add subscription renewal in later phase. Lower risk, faster launch.
**Risk if wrong**: (B) = complex implementation delays launch. (A) = higher churn from manual renewal friction.
**Dependency**: Decision #1 + #3.

### Decision #6: AI Strategy for Murid
**Question**: How should murid premium handle AI?
**Current State**: MURID_FREE = unlimited AI credits. AI Mentor and Adaptive Practice = COMING_SOON.
**Options**:
- (A) Unlimited AI for all murid
- (B) Credit-based AI for murid
- (C) Feature-tiered AI (caps per feature)
- (D) Hybrid (unlimited basic + capped premium)
**Recommended**: (C) Feature-tiered AI
**Why**: Simplest UX for teenagers. "Adaptive Practice tersedia" not "50 credits of adaptive." Caps: 30 mentor explanations/day, 50 adaptive sessions/month. COGS: ~Rp 2,000/murid/month at scale. Margin: >89% at Rp 19,000.
**Risk if wrong**: (A) = abuse risk, unpredictable COGS. (B) = parents don't understand credits.
**Dependency**: Decision #1.

### Decision #7: Plan Resolution Architecture
**Question**: Should we unify AI Gateway and Premium Economy plan resolution?
**Current State**: Two independent systems (AI Gateway: 6 outcomes, Premium Economy: 3 outcomes). Different plan codes, different tables.
**Options**:
- (A) Keep dual systems — they work independently
- (B) Unify into single resolution
- (C) Bridge — shared resolution, separate enforcement
**Recommended**: (A) Keep dual systems for now
**Why**: They solve different problems (credits vs features). Unifying = high risk, high effort, no immediate benefit. For MURID PREMIUM, we only need Premium Economy (feature-tiered). AI Gateway stays Guru-only. Future unification can happen when both systems mature.
**Risk if wrong**: (B) = massive refactor, potential regressions. (C) = complex bridge layer.
**Dependency**: None.

### Decision #8: Entitlement System for Murid
**Question**: What entitlement keys should MURID PREMIUM have?
**Current State**: 7 entitlement keys (SIMULATION, AI_MENTOR, AI_PRACTICE, PREMIUM_PROFILE, PREMIUM_COSMETICS, ADVANCED_STATS, STREAK_FREEZE). Matrix: FREE/PRO/FOUNDER.
**Options**:
- (A) Reuse existing PRO entitlements for murid
- (B) Create MURID-specific entitlements
- (C) Extend existing keys with murid-specific values
**Recommended**: (C) Extend existing keys with murid-specific values
**Why**: Entitlement keys are generic enough. MURID FREE = existing FREE values. MURID PREMIUM = new row in matrix with murid-specific limits. No new keys needed. Add `MURID_PREMIUM` to `PlanCode` type.
**Risk if wrong**: (B) = duplicated entitlement logic. (A) = wrong limits (Guru PRO limits too high for murid).
**Dependency**: Decision #1 + #6.

### Decision #9: Subscription Model Wiring
**Question**: Should we wire the Subscription model for auto-renewal?
**Current State**: `model Subscription` exists in Prisma but is not actively used. Current flow uses one-time `Transaksi` records.
**Options**:
- (A) Wire Subscription now (Midtrans recurring API)
- (B) Defer Subscription wiring (use one-time payments)
- (C) Wire Subscription for murid only (Guru stays one-time)
**Recommended**: (B) Defer Subscription wiring
**Why**: Midtrans recurring API adds complexity (webhook handling for renewal, cancellation, failed payment). One-time payments work today. Subscription can be added later when revenue justifies it.
**Risk if wrong**: (A) = delayed launch. (B) = manual renewal friction.
**Dependency**: Decision #5.

### Decision #10: Kupon Strategy for Murid
**Question**: Should murid premium support coupons?
**Current State**: Kupon system exists (Guru Pro only, Rp 1,000 promo).
**Options**:
- (A) No coupons for murid initially
- (B) Support same coupons as guru
- (C) Murid-specific coupons (referral codes)
**Recommended**: (A) No coupons for murid initially
**Why**: Avoid complexity at launch. Coupons can be added later for referrals or seasonal promos. Focus on core premium experience first.
**Risk if wrong**: Missed acquisition opportunity.
**Dependency**: Decision #1 + #3.

### Decision #11: Trial Scope
**Question**: What features should murid trial include?
**Current State**: No murid trial.
**Options**:
- (A) Full premium features
- (B) Limited (3 adaptive + 10 mentor + 5 simulation)
- (C) Single feature (adaptive only)
**Recommended**: (B) Limited (3 adaptive + 10 mentor + 5 simulation)
**Why**: Full trial = no reason to upgrade after. Limited = enough to see value, not enough to be satisfied. Sweet spot for conversion.
**Risk if wrong**: Too limited = no value perceived. Too full = no conversion.
**Dependency**: Decision #4.

### Decision #12: Murid Premium Features
**Question**: What features should MURID PREMIUM include?
**Current State**: No murid premium features defined.
**Options**:
- (A) Minimal (just adaptive practice)
- (B) Standard (adaptive + mentor + insights + re-assessment)
- (C) Full (standard + cosmetics + advanced stats + streak freeze)
**Recommended**: (B) Standard (adaptive + mentor + insights + re-assessment)
**Why**: Core value = personalized learning. Cosmetics and stats are nice-to-have but not conversion drivers. Keep scope manageable for first launch.
**Risk if wrong**: Too thin = no value. Too thick = delayed launch.
**Dependency**: Decision #1 + #6.

### Decision #13: Pricing Methodology
**Question**: How to set final murid premium price?
**Current State**: No methodology defined.
**Options**:
- (A) Cost-plus (COGS + margin target)
- (B) Value-based (what parents will pay)
- (C) Competitive (match/beat competitors)
**Recommended**: (B) Value-based with competitive check
**Why**: Parents pay for learning value, not cost. Price based on "less than daily snacks" psychology, checked against competitor pricing (Ruangguru, Zenius).
**Risk if wrong**: Price too high = low conversion. Too low = insufficient margin.
**Dependency**: Decision #3.

### Decision #14: Analytics Approach
**Question**: How to track murid premium analytics?
**Current State**: AIUsage + PremiumUsage tables exist. Admin dashboard reads both.
**Options**:
- (A) AIUsage only (existing)
- (B) PremiumUsage only (new)
- (C) Both (existing + new)
**Recommended**: (C) Both
**Why**: AIUsage tracks AI calls (mentor, adaptive). PremiumUsage tracks feature consumption (simulation, streak freeze). Both needed for complete picture.
**Risk if wrong**: Incomplete data.
**Dependency**: None.

---

## 4. Priority Classification

### P0 — Architecture Blockers (MUST decide before implementation)
| # | Decision | Recommended |
|---|----------|-------------|
| 1 | Murid Monetization Strategy | Product experience premium |
| 2 | Legacy Route Migration | Delete RPP+Soal, keep Latihan unlimited |
| 6 | AI Strategy for Murid | Feature-tiered AI |

### P1 — Product Blockers (MUST decide before product implementation)
| # | Decision | Recommended |
|---|----------|-------------|
| 3 | Pricing for Murid Premium | Rp 19,000/month + Rp 180,000/yearly |
| 4 | Trial Design for Murid | 7-day, limited features |
| 8 | Entitlement System for Murid | Extend existing keys with murid-specific values |
| 12 | Murid Premium Features | Standard (adaptive + mentor + insights + re-assessment) |

### P2 — Implementation Details (can decide during implementation)
| # | Decision | Recommended |
|---|----------|-------------|
| 5 | Auto-Renewal vs Manual | Both (start one-time, add subscription later) |
| 9 | Subscription Model Wiring | Defer (one-time payments first) |
| 10 | Kupon Strategy for Murid | No coupons initially |
| 14 | Analytics Approach | Both AIUsage + PremiumUsage |

### P3 — Can Decide Later
| # | Decision | Recommended |
|---|----------|-------------|
| 7 | Plan Resolution Architecture | Keep dual systems for now |
| 11 | Trial Scope | Limited (decide exact caps during implementation) |
| 13 | Pricing Methodology | Value-based with competitive check |

---

## 5. Murid Premium Architecture

### Recommended Flow

```
MURID FREE
    ↓
ASSESSMENT (Mulai Latihan — always accessible)
    ↓
BASIC RESULT (Band L1-L12, SkillRadar bars)
    ↓
BASIC RECOMMENDATION ("Kamu perlu memperkuat: Tata Bahasa")
    ↓
JALUR CERDAS (free learning path)

MURID PREMIUM
    ↓
DEEP DIAGNOSTIC (per-skill detail, confidence, recommendation)
    ↓
PERSONALIZED PROFILE (what to improve, in what order)
    ↓
PERSONALIZED PLAN (adaptive practice targeting weaknesses)
    ↓
ADAPTIVE PRACTICE (soal dipilih khusus untuk levelmu)
    ↓
AI MENTOR (penjelasan KENAPA salah, bukan hanya jawaban benar)
    ↓
REASSESSMENT (auto-suggest setelah X latihan)
    ↓
MEASURE GROWTH (week-over-week comparison)
```

### Engine Mapping

| Engine | FREE | PREMIUM | Status |
|--------|------|---------|--------|
| Assessment Engine | ✅ 10 soal diagnostik | ✅ 10 soal + deeper | EXISTS |
| AI Diagnostic | ✅ Basic band result | ✅ Per-skill detail + confidence | EXISTS (v1.1) |
| SkillRadar | ✅ 7 skill bars | ✅ Bars + recommendation | EXISTS |
| Learning Loop | ✅ Basic CTA | ✅ Full loop | EXISTS |
| Mentor | ✅ Basic insight | ✅ Deep, contextual | EXISTS (AI BC 2.0) |
| Jalur Cerdas | ✅ All 72 units | ✅ All 72 units | EXISTS |
| Daily Action | ✅ 1 tantangan/hari | ✅ 1 tantangan/hari | EXISTS |
| Adaptive Practice | ⚠️ COMING_SOON | ✅ Personalized per weakness | EXISTS (gated) |
| AI Mentor (mistake explanation) | ❌ | ✅ "Kesalahanmu X, karena Y" | NEEDS WIRING |
| Progress Insights | ❌ | ✅ Weekly recap | NEEDS BUILD |
| Re-assessment | ❌ | ✅ Auto-suggest after X latihan | NEEDS BUILD |

### Key Design Principle
**FREE = diagnostic access.** Murid TAHU kemampuannya. Premium = development acceleration. Murid DIBANTU memperbaikinya. "Mulai Latihan" is NEVER paywalled.

---

## 6. Premium Entitlement Model

### Recommended: Extend Existing Premium Economy

The existing `premium-economy` system is the right foundation for MURID PREMIUM:

```
SUBSCRIPTION (Midtrans, via Webhook)
    ↓
PLAN (resolvePlan → FREE / PRO / FOUNDER)
    ↓
ENTITLEMENT (getEntitlements → per-feature limits)
    ↓
FEATURE ACCESS (hasEntitlement, getFeatureLimit)
    ↓
USAGE POLICY (consumeUsage → atomic enforcement)
```

### How This Unifies Current Systems

| System | Current | Future |
|--------|---------|--------|
| AI Gateway (credits) | Guru-only, credit-based | Stays Guru-only |
| Premium Economy (features) | Simulation + booleans | Extends to all murid features |
| User premium fields | isPremium, premiumUntil, premiumPlan | Stays (compatibility) |
| Subscription | Exists, not wired | Wired for murid (later) |
| Transaksi | One-time payments | Stays for initial launch |
| AI credits | Guru only | Stays Guru only |
| PremiumUsage | Simulation only | Extends to mentor, adaptive, etc. |

### Entitlement Keys for MURID

| Key | MURID FREE | MURID PREMIUM | Enforcement |
|-----|-----------|---------------|-------------|
| SIMULATION_MONTHLY_LIMIT | 3 | 10 | Atomic (PremiumUsage) |
| AI_MENTOR_DAILY_LIMIT | unlimited* | 30 | Atomic (PremiumUsage) |
| AI_PRACTICE_MONTHLY_LIMIT | unlimited* | 50 | Atomic (PremiumUsage) |
| PREMIUM_PROFILE | false | true | UI gate |
| PREMIUM_COSMETICS | false | true | UI gate |
| ADVANCED_STATS | false | true | UI gate |
| STREAK_FREEZE_MONTHLY | 0 | 1 | Atomic (PremiumUsage) |

*Note: "unlimited" for FREE = not enforced yet (PremiumUsage migration not run). Once enforced, FREE will get reasonable defaults (e.g., 5 mentor/day, 10 adaptive/month).

---

## 7. Murid Plan Design

### Conceptual Plans

| Plan | Price | Duration | Features | Target |
|------|-------|----------|----------|--------|
| MURID FREE | Rp 0 | ∞ | Basic assessment, Jalur Cerdas, UKBI/TKA, gamification | All students |
| MURID PREMIUM MONTHLY | Rp 19,000 | 30 days | + Adaptive + Mentor + Insights + Re-assessment + Cosmetics | Students 13-18 |
| MURID PREMIUM YEARLY | Rp 180,000 | 365 days | Same as monthly + 21% savings | Committed students |

### Pricing Methodology
1. **Anchor**: "Cuma Rp 633/hari — lebih murah dari aqua gelas" (Rp 19,000 / 30 hari = ~Rp 633/hari)
2. **Competitive check**: Below Ruangguru (Rp 50-100K), below Zenius (Rp 100K+)
3. **Parent psychology**: Below Rp 50K barrier
4. **Annual incentive**: "Hemat Rp 99,000" (29% discount)
5. **Margin target**: >90% gross margin (COGS ~Rp 2,000/murid/month)

---

## 8. AI Strategy

### Recommended: Feature-Tiered AI (Option C)

**For Murid Premium**: Feature-tiered. Certain AI features are UNLOCKED with caps.

| Feature | FREE | PREMIUM | Cap |
|---------|------|---------|-----|
| Adaptive Practice | COMING_SOON | Available | 50 sessions/month |
| AI Mentor explanations | COMING_SOON | Available | 30 explanations/day |
| AI Diagnostic scoring | Available | Available + deeper | 10 simulations/month |
| AI BC Chat | Available | Available | Rate-limited (existing) |

**Why NOT credits**: Indonesian teenagers don't understand "credits." Parents don't understand "500 kredit per bulan." Premium should feel "unlimited within reason," not "counting tokens."

**Why NOT unlimited**: Abuse risk, unpredictable COGS. Feature-tiered caps are transparent and fair.

---

## 9. Midtrans Strategy

### Recommended: One-Time Payment Initially (Option A), Add Subscription Later

**Current reality**: Midtrans Snap one-time payment works today. Recurring API is not wired.

**Launch architecture**:
1. Extend `lib/billing/plans.ts` with `MURID_PREMIUM_MONTHLY` and `MURID_PREMIUM_YEARLY`
2. Extend checkout route to accept MURID role
3. Webhook handler detects `transaksi.type === "MURID_PREMIUM"` → activates premium
4. Stacking works (existing code handles `premiumUntil` extension)

**Later phase**: Wire Midtrans recurring API + Subscription model for auto-renewal.

**Why this is safest**: No new Midtrans API integration. No webhook changes for existing Guru flow. MURID checkout is additive-only.

---

## 10. Legacy Route Decisions

### Recommendations

| Route | Decision | Rationale |
|-------|----------|-----------|
| `app/api/ai/rpp/route.ts` | **DELETE** | Deprecated, 0 callers, job queue dead code |
| `app/api/ai/soal/route.ts` | **DELETE** | Deprecated, superseded by guru/latihan, 0 direct callers |
| `app/api/guru/latihan/route.ts` | **KEEP** (unlimited) | Active endpoint, dual-role (GURU+MURID), used by `/guru/bank-soal` |

**Why keep Latihan unlimited**: It's the active bank-soal generation endpoint. Migrating to credits = GURU_FREE loses unlimited access (regression). It's a legacy exception that works correctly.

**Why NOT make Murid Premium depend on legacy systems**: Murid Premium uses Premium Economy (feature-tiered), not AI Gateway (credit-based). Legacy routes are Guru-only. Complete isolation.

---

## 11. Premium Value Proposition

### North Star
> **"BahasaCerdas Premium membantu murid memahami dan mengembangkan kemampuan bahasa Indonesia mereka secara lebih personal, lebih dalam, dan lebih terukur."**

### Three Premium Promises
1. **"Saya tahu kemampuan saya."** — Profil diagnostik yang jujur dan detail
2. **"Latihan saya disesuaikan untuk saya."** — Adaptive Practice yang benar-benar menyesuaikan
3. **"Saya melihat perkembangan saya."** — Progress tracking yang nyata

### Three Killer Features
1. **Adaptive Practice** — Soal dipilih khusus untuk weakness (maturity: engine EXISTS, pool needs production)
2. **AI Mentor** — "Kesalahanmu X, karena Y, perbaikinya Z" (maturity: provider EXISTS, prompt needs wiring)
3. **Learning Insights** — Weekly recap + growth analysis (maturity: engine EXISTS, aggregation needs build)

---

## 12. Free vs Premium Matrix

| Capability | FREE | PREMIUM | Reason |
|-----------|------|---------|--------|
| **Mulai Latihan** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | **HARD REQUIREMENT** — never paywall |
| **Assessment** | ✅ 10 soal | ✅ 10 soal + deeper | Pool shared, depth differs |
| **SkillRadar** | ✅ 7 bars + trend | ✅ Bars + recommendation | Display vs actionable |
| **AI Diagnostic** | ✅ Band L1-L12 | ✅ Band + per-skill + confidence | Depth difference |
| **Jalur Cerdas** | ✅ All 72 units | ✅ All 72 units | Core content — never lock |
| **Adaptive Practice** | ⚠️ Coming soon | ✅ Personalized per weakness | New capability |
| **AI Mentor** | ⚠️ Coming soon | ✅ Explains mistakes | New capability |
| **Mistake Review** | ❌ | ✅ "Kesalahanmu X, karena Y" | Premium value |
| **Personalized Plan** | ❌ | ✅ "Mulai dengan: X" | Premium value |
| **Progress Insight** | ⚠️ Basic | ✅ Week-over-week comparison | Depth difference |
| **UKBI** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Diagnostic — never lock |
| **TKA** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Diagnostic — never lock |
| **Arena** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Social — never lock |
| **XP** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Motivation — never lock |
| **Coins** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Engagement — never lock |
| **Streak** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Habit — never lock |
| **Streak Freeze** | ❌ 0/month | ✅ 1/month | Premium utility |
| **Badges** | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Collection — never lock |
| **Avatar** | ✅ Basic | ✅ Premium frames | Cosmetic premium |
| **Simulation Quota** | ✅ 3/month | ✅ 10/month | Capacity premium |

---

## 13. Premium Conversion Loop

```
FREE
    ↓
Mulai Latihan (always accessible, never paywalled)
    ↓
Assessment (10 soal, 6 skill)
    ↓
"Ini kemampuanmu: Menengah (L5-L8)"
    ↓
"Yang kuat: Membaca ✓, Kosakata ✓"
    ↓
"Yang perlu ditingkatkan: ⚠ Tata Bahasa, ⚠ Menulis"
    ↓
Basic recommendation: "Mulai Belajar" → Jalur Cerdas
    ↓
Premium opportunity (HALUS — not aggressive):
    ↓
"BahasaCerdas bisa menyusun rencana latihan yang
dikhususkan untuk kemampuanmu."
    ↓
[Langsung Berlangganan] or [Mulai 7 Hari Gratis]
    ↓
Payment (Midtrans Snap)
    ↓
Premium activation (webhook → isPremium=true, premiumUntil set)
    ↓
Premium welcome: "Rencana belajarmu sudah siap."
    ↓
First personalized action: "Latihan pertamamu: Tata Bahasa — Imbuhan Dasar"
    ↓
Daily learning loop: Adaptive → AI Feedback → Skill Update → Next Action
    ↓
Reassessment (after 20 latihan): "Sudah waktunya tes ulang!"
    ↓
Visible growth: "Tata Bahasa: 62% → 74% (+12% dalam 2 minggu!)"
```

**Where Premium is introduced**: After assessment result, below the skill breakdown. One card: "Bangun Rencana Personal." No modal overlay. No aggressive pop-up. The student has already seen their weaknesses — Premium offers to help fix them.

**No manipulative paywalls**: FREE users always see their full assessment result. Premium CTA is informational, not blocking.

---

## 14. Implementation Order

### P1: Product Foundation (1 week)
**Dependencies**: Founder decisions (this document)
**Scope**: Documentation, plan codes, type definitions
**Risk**: Low
**Exit criteria**: Founder signs off on decisions, plan codes defined, types created

### P2: Canonical Entitlement (1 week)
**Dependencies**: P1
**Scope**: Add MURID_PREMIUM to PlanCode, extend entitlement matrix, seed MURID_PREMIUM row
**Risk**: Low (additive-only, no existing MURID entitlements to break)
**Exit criteria**: `resolvePlan()` returns correct plan for all MURID states

### P3: Student Subscription (1 week)
**Dependencies**: P2
**Scope**: Extend checkout for MURID, add MURID plans to `lib/billing/plans.ts`, create subscription page
**Risk**: Medium (webhook changes must not break Guru flow)
**Exit criteria**: MURID can checkout, webhook activates, stacking works

### P4: Midtrans Integration (1 week)
**Dependencies**: P3
**Scope**: Webhook handler for MURID_PREMIUM type, premium activation, credit ledger (if needed)
**Risk**: Medium (webhook is critical path)
**Exit criteria**: End-to-end MURID payment works

### P5: Premium Experience (2 weeks)
**Dependencies**: P4
**Scope**: Wire adaptive practice, AI mentor, progress insights for MURID PREMIUM. Enforce caps.
**Risk**: Medium (new features, pool quality)
**Exit criteria**: Premium user gets full learning loop

### P6: AI Economy (1 week)
**Dependencies**: P5
**Scope**: Feature-tiered caps enforcement, PremiumUsage atomic consumption
**Risk**: Low (engine already exists)
**Exit criteria**: Caps enforced, analytics working

### P7: Legacy Cleanup (1 week)
**Dependencies**: P6
**Scope**: Delete RPP + Soal routes, clean premium.ts
**Risk**: Low (dead code removal)
**Exit criteria**: 0 imports of `lib/premium.ts` from app/ routes

### P8: Production Gate (1 week)
**Dependencies**: P7
**Scope**: Load testing, security audit, monitoring, rollback plan
**Risk**: Medium
**Exit criteria**: All tests pass, load test 200 concurrent, security audit clean

---

## 15. Final Founder Gate

### MUST DECIDE NOW (Maximum 7)

**Decision 1: Should we monetize murid?**
- RECOMMENDATION: Yes — product experience premium
- WHY: 1340 students = significant market. Premium = better learning, not more AI.

**Decision 2: What price for murid premium?**
- RECOMMENDATION: Rp 19,000/month + Rp 180,000/yearly
- WHY: Below Rp 50K parent barrier. 29% annual discount. Competitive.

**Decision 3: Should "Mulai Latihan" stay free?**
- RECOMMENDATION: Yes — NEVER paywall assessment
- WHY: Assessment = diagnostic access. Premium = development acceleration.

**Decision 4: What trial for murid?**
- RECOMMENDATION: 7-day, limited (3 adaptive + 10 mentor + 5 simulation)
- WHY: Fast conversion decision. Enough value to see, not enough to stay free.

**Decision 5: Delete legacy RPP/Soal routes?**
- RECOMMENDATION: Yes — delete both, keep Latihan unlimited
- WHY: 0 callers, deprecated, dead code. Latihan is active.

**Decision 6: AI strategy for murid?**
- RECOMMENDATION: Feature-tiered (caps per feature, not credits)
- WHY: Simplest UX for teenagers. Parents understand "tersedia" not "500 kredit."

**Decision 7: Auto-renewal or manual?**
- RECOMMENDATION: Start with one-time, add subscription later
- WHY: Current Midtrans is one-time. Recurring adds complexity. Faster launch.

### CAN DECIDE LATER

- Exact trial feature caps (3 adaptive vs 5 adaptive)
- Coupon strategy for murid (referral codes, seasonal promos)
- Subscription model wiring (Midtrans recurring API)
- Institutional pricing (SCHOOL plan)
- Premium cosmetics scope (which frames/badges)
- Analytics dashboard details
- A/B testing framework
- Revenue dashboard

---

## 16. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pricing too high for Indonesian market | HIGH | Start Rp 19,000 (below Rp 20K barrier), adjust based on conversion data |
| AI cost overrun with 1340+ students | MEDIUM | Feature-tiered caps (30 mentor/day, 50 adaptive/month) |
| Guru billing regression | HIGH | Complete isolation: different plan codes, different routes |
| Diagnostic quality insufficient | MEDIUM | 87 APPROVED questions is honest minimum |
| Adaptive Practice not production-ready | HIGH | Gate behind COMING_SOON until pool sufficient |
| Webhook failure | MEDIUM | Existing retry mechanism, manual admin activation |
| "Mulai Latihan" accidentally paywalled | HIGH | HARD REQUIREMENT in spec, test suite verifies |
| PremiumUsage migration not run | MEDIUM | Graceful degradation (P2021/P2022 catch) |

---

## 17. Document Created

```
docs/PHASE_1E_FOUNDER_DECISION_GATE.md — this document
```

---

## 18. Verification

### Expected: Documentation-only changes
```bash
npx tsc --noEmit
# Expected: 0 errors (no code changed)

git diff
# Expected: only docs/PHASE_1E_FOUNDER_DECISION_GATE.md added
```

### Verification Status
- `npx tsc --noEmit`: NOT YET RUN (will run after document creation)
- `git diff`: Only this documentation file

---

## 19. Key Codebase Facts (Verified from Source)

1. **Checkout route blocks MURID**: `["GURU", "ADMIN"].includes(user.role)` → 403 for MURID
2. **Trial service blocks MURID**: `user.role !== "GURU"` → skip
3. **AI Gateway MURID_FREE = unlimited**: `creditsTotal: 999999`
4. **Entitlement matrix has 3 rows**: FREE, PRO, FOUNDER — no MURID-specific
5. **PremiumUsage migration not run**: Catches P2021/P2022 gracefully
6. **Webhook stacking works**: `premiumUntil` extends from current expiry
7. **Subscription model exists but unused**: Prisma `model Subscription` not wired
8. **87 APPROVED diagnostic questions**: Sufficient for initial premium
9. **Adaptive Practice gated**: `ADAPTIVE_PRACTICE_COMING_SOON` flag
10. **AI BC 2.0 built but not premium-wired**: Personas, context, route exist
11. **1340 MURID in DB**: Significant market for student premium
12. **Guru Pro has 1-2 paying subscribers**: Revenue ~Rp 100,000/month

---

*This document is the SOURCE OF TRUTH for MURID PREMIUM founder decisions.*
*Do NOT implement code until Founder approves all MUST DECIDE NOW items.*
*Only after approval should implementation begin.*
