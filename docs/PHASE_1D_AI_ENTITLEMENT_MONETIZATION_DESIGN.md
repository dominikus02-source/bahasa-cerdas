# Phase 1D: AI Entitlement & Monetization Design

**Date**: August 20, 2026  
**Status**: READ-ONLY DESIGN — No code changes  
**Author**: opencode  
**Scope**: Full premium architecture — Guru + Murid, AI credits, Midtrans lifecycle, entitlement matrix

---

## Executive Summary

BahasaCerdas has **two separate premium systems** that evolved independently:

1. **AI Gateway** (credit-based): `resolveUserAiPlan` → `AiCreditLedger` → per-agent credit costs → `checkAndPrepareDeduction` → `deductCreditsAtomic`. Handles RPP/Soal/PPT/EYD/Feedback/Grading/TextAnalysis/etc. 6 plan outcomes: FOUNDER (∞), MURID_FREE (∞), GURU_PRO (500), GURU_PRO_TRIAL (200), GURU_FREE (30), SCHOOL (5000).

2. **Premium Economy** (entitlement-based): `resolvePlan` → `Entitlement` table → `PremiumUsage` table → `consumeUsageGuarded`. Handles SIMULATION (monthly limit), AI_MENTOR (daily), AI_PRACTICE (monthly), STREAK_FREEZE (monthly), plus boolean capabilities (PREMIUM_PROFILE, PREMIUM_COSMETICS, ADVANCED_STATS). 3 plan outcomes: FREE, PRO, FOUNDER.

These two systems **do not share plan codes, tables, or resolution logic**. The AI Gateway is the primary billing system; Premium Economy is a newer layer that only enforces simulation limits today.

### Key Findings

- **Guru Only**: Only GURU users can purchase premium (Rp 49,000/mo or Rp 399,000/yr). No MURID plans exist.
- **3 Legacy Routes Unlimited**: RPP, Soal, and Latihan routes have `AI_QUOTA.*.rpp = -1` (unlimited) — migrating to credits would regress GURU_FREE from unlimited to 10 calls/mo.
- **Trial = One-shot**: 30-day Guru Pro Trial (200 credits), never restarts. After trial → GURU_FREE (30 credits/mo).
- **Hard Mode**: `AI_CREDIT_HARD_MODE=true` in production — insufficient credits BLOCK the request.
- **Two Entitlement Systems**: AI Gateway (credits) and Premium Economy (feature limits) operate independently.
- **No Murid Monetization**: MURID_FREE gets unlimited AI access (`creditsTotal: 999999`). No paid murid plan exists.
- **Kupon System**: Exists for Guru Pro (Rp 1,000 promo via Program Guru Cerdas), supports fixed/percentage discounts.
- **Subscription Model**: Prisma has `Subscription` table (Midtrans subscription ID, status, period) but the current flow uses one-time payments (`Transaksi` model) — not recurring.

---

## 1. Current Premium Inventory

### 1A. Plans & Pricing

| Plan | Price | Duration | AI Credits | Target | Status |
|------|-------|----------|------------|--------|--------|
| GURU_PRO_MONTHLY | Rp 49,000 | 30 days | 500/mo | Guru | Active |
| GURU_PRO_YEARLY | Rp 399,000 | 365 days | 500/mo | Guru | Active |
| Guru Pro Trial | Free | 30 days | 200 total | Guru (new) | Active |
| MURID_FREE | Free | ∞ | ∞ | Murid | Active |
| GURU_FREE | Free | ∞ | 30/mo | Guru | Active |
| FOUNDER | — | ∞ | ∞ | Founder/Admin | Active |
| SCHOOL | — | — | 5000/mo | Institutional | Schema only |

### 1B. AI Credit Costs (per agent call)

| Agent | Credits | Weight | Notes |
|-------|---------|--------|-------|
| eyd | 1 | light | EYD correction |
| bc-assistant | 1 | light | Chat assistant |
| feedback | 2 | medium | Student feedback |
| grading | 2 | medium | Auto grading |
| review | 2 | medium | Material review |
| text-analysis (≤5000 char) | 2 | medium | Short text |
| text-analysis (>5000 char) | 4 | medium | Long text |
| soal (≤10 questions) | 3 | medium | Soal generation |
| soal (>10 questions) | 5 | heavy | Large soal batch |
| rpp | 5 | heavy | RPP generation |
| ppt | 5 | heavy | PPT generation |
| rubric | 2 | medium | Rubric generation |
| akm-literacy | 2 | medium | AKM literacy |
| curriculum-align | 2 | medium | Curriculum alignment |
| DOCX export | 0 | light | Free |
| PPTX export | 1 | light | Export cost |
| PDF export | 0 | light | Free |

### 1C. Quota Limits (AI Gateway)

| Plan | Credits/Month | Max/Request | Daily Velocity | Saved Results |
|------|--------------|-------------|----------------|---------------|
| FOUNDER | ∞ | ∞ | ∞ | ∞ |
| MURID_FREE | ∞ | ∞ | ∞ | ∞ |
| GURU_PRO | 500 | 50 | 200 | ∞ |
| GURU_PRO_TRIAL | 200 | 50 | 100 | 200 |
| GURU_FREE | 30 | 10 | 20 | 50 |
| SCHOOL | 5000 | 50 | 500 | ∞ |

### 1D. Premium Economy Entitlements (DB-first, matrix fallback)

| Entitlement | FREE | PRO | FOUNDER |
|-------------|------|-----|---------|
| SIMULATION_MONTHLY_LIMIT | 3 | 10 | ∞ |
| AI_MENTOR_DAILY_LIMIT | ∞ | ∞ | ∞ |
| AI_PRACTICE_MONTHLY_LIMIT | ∞ | ∞ | ∞ |
| PREMIUM_PROFILE | false | true | true |
| PREMIUM_COSMETICS | false | true | true |
| ADVANCED_STATS | false | true | true |
| STREAK_FREEZE_MONTHLY | 0 | 1 | ∞ |

### 1E. Daily Export Limits

| Plan | Downloads/Day |
|------|--------------|
| FOUNDER | ∞ |
| MURID_FREE | ∞ |
| GURU_PRO | 10 |
| GURU_PRO_TRIAL | 10 |
| GURU_FREE | 1 |
| SCHOOL | 10 |

---

## 2. Subscription Architecture Audit

### 2A. Payment Flow (Current)

```
User clicks "Upgrade" → /guru/berlangganan
  → selects plan (GURU_PRO_MONTHLY or GURU_PRO_YEARLY)
  → optional: applies kupon (Rp 1,000 promo)
  → POST /api/billing/checkout
    → validates role (GURU/ADMIN/founder only)
    → validates plan + kupon
    → creates Transaksi record (status=PENDING)
    → creates Midtrans Snap token (one-time payment, NOT subscription)
    → returns { token, redirectUrl }
  → user pays via Midtrans Snap (VA/ewallet/credit card)
  → Midtrans sends webhook to POST /api/payment/webhook
    → verifies signature (SHA512)
    → on capture/settlement:
      → updates Transaksi status=SUCCESS
      → sets User.isPremium=true, premiumPlan="PRO"
      → calculates premiumUntil (stack on existing if still active)
      → syncs AiCreditLedger (500 credits for current period)
      → sends confirmation email via Resend
```

### 2B. Subscription Model (Prisma — Underutilized)

```prisma
model Subscription {
  id                     String
  userId                 String
  plan                   SubscriptionPlan   @default(PRO_MONTHLY)
  status                 SubscriptionStatus @default(PENDING)
  midtransSubscriptionId String?            @unique
  currentPeriodStart     DateTime
  currentPeriodEnd       DateTime
  paymentMethodId        String?
  paymentMethodType      String?
  willRenew              Boolean            @default(true)
  cancelledAt            DateTime?
  lastTransactionId      String?
  metadata               Json?
}
```

The `Subscription` model exists in Prisma but **is not actively used** by the payment flow. The current flow uses one-time `Transaksi` records and manually sets `User.premiumUntil`. The `Subscription` model was designed for Midtrans's recurring payment API but was never wired.

### 2C. Trial Flow

```
New Guru signs up → first login to /guru/* layout
  → startGuruTrialIfEligible(userId)
    → checks: not founder, role=GURU, no existing trial, no active premium
    → sets trialStartedAt, trialEndsAt (+30 days), trialPlan="GURU_PRO_TRIAL"
    → creates AiCreditLedger (period="trial", 200 credits)
    → trial never restarts (if trialStartedAt !== null → skip)
  → trial ends → resolveUserAiPlan returns GURU_FREE (30 credits/mo)
```

### 2D. Expiry & Renewal

- **No auto-renewal**: Midtrans one-time payment → `premiumUntil` set once → when expired, user drops to GURU_FREE.
- **Stack on active**: If user pays while still premium, `premiumUntil` stacks (adds duration from current expiry, not from now).
- **Founder bypass**: `isFounder=true` → always FOUNDER plan regardless of premium/subscription fields.

---

## 3. Plan Taxonomy & Resolution

### 3A. AI Gateway Plan Resolution (6 outcomes)

```typescript
resolveUserAiPlan(user):
  ADMIN/FOUNDER    → FOUNDER (∞ credits)
  MURID            → MURID_FREE (∞ credits)
  Guru+premium     → GURU_PRO (500 credits)
  Guru+trial       → GURU_PRO_TRIAL (200 credits)
  Guru (default)   → GURU_FREE (30 credits)
```

### 3B. Premium Economy Plan Resolution (3 outcomes)

```typescript
resolvePlan(userId):
  ADMIN/founder    → FOUNDER
  Active subscription (DB) → PRO
  isPremium+premiumUntil > now → PRO
  trialEndsAt > now → PRO
  default          → FREE
```

### 3C. Plan Resolution Conflict

The two systems **do not conflict** because:
- AI Gateway handles AI credit billing (credits per call)
- Premium Economy handles feature entitlements (simulation limits, cosmetics, etc.)
- Both read `User.isFounder`, `User.isPremium`, `User.premiumUntil`, `User.trialEndsAt`

However, they use **different plan codes** (GURU_PRO vs PRO) and **different tables** (AiCreditLedger vs Entitlement/PremiumUsage). This dual-system is functional but creates maintenance overhead.

---

## 4. Murid Premium — Current State & Design Gap

### 4A. Current State

| Aspect | Murid | Guru |
|--------|-------|------|
| AI Credits | ∞ (MURID_FREE) | 30 (free) / 200 (trial) / 500 (pro) |
| Can purchase premium? | No | Yes |
| Has trial? | No | Yes (30 days, 200 credits) |
| Simulation limit | 3/month (FREE) | 3/month (FREE) / 10/month (PRO) |
| Premium features | None (no paid plan) | PRO: cosmetics, stats, marketplace, priority |

### 4B. Design Gap

Murid currently has **no monetization path**. The AI Gateway gives MURID_FREE unlimited credits with the comment `"Murid — free access, no restrictions yet"`. This is intentional for the education market (students don't pay), but creates a strategic gap:

- **No murid premium plan** in `lib/billing/plans.ts`
- **No murid checkout flow** (checkout route checks `!["GURU", "ADMIN"].includes(user.role) && !user.isFounder` → 403)
- **No murid trial** (trial service checks `user.role !== "GURU"` → skip)
- **Entitlement matrix** only has FREE/PRO/FOUNDER — no murid-specific tiers

### 4C. Potential Murid Premium Dimensions

If murid monetization is desired in the future:

| Dimension | Free | Premium (hypothetical) |
|-----------|------|----------------------|
| AI Practice | ∞ (unlimited) | ∞ + priority queue |
| Diagnostic | 1 attempt | ∞ attempts |
| Adaptive Practice | Basic | Advanced (harder questions) |
| Leaderboard | Global only | School/Class/Friends |
| Cosmetics | Basic | Premium frames/effects |
| Analytics | Basic | Detailed skill radar |
| Badges/Achievements | Standard | Exclusive premium badges |
| Offline access | No | Yes (download materi) |

**Recommendation**: Murid premium should be **product-experience-driven** (Duolingo Max model), not credit-driven. Students don't generate expensive AI output — they consume content and practice. Premium murid = better learning experience, not more AI credits.

---

## 5. AI Monetization Model

### 5A. Credit Economy Architecture

```
User Action → Agent Route
  → calculateAgentCost(agentId, input) → { credits: N, weight, reason }
  → checkQuota(user, agentId) → { allowed, creditsRemaining, ... }
  → [if allowed] → AI provider call (DeepSeek/Groq/Gemini)
  → [on success] → deductCreditsAtomic(userId, planInfo, credits)
  → [fire-and-forget] → logUsage(feature, provider, tokens, costUSD)
```

### 5B. Revenue Model

| Revenue Stream | Current Status | Monthly Est. |
|---------------|---------------|-------------|
| Guru Pro (Rp 49,000/mo) | Active | ~Rp 200,000 (1-2 subscribers) |
| Guru Pro (Rp 399,000/yr) | Active | 1 subscriber (kusum4w4) |
| Marketplace (20% commission) | Active | Variable |
| Murid Premium | Not implemented | — |
| Institutional (SCHOOL) | Schema only | — |
| Ad revenue | Not implemented | — |

### 5C. AI Provider Costs (Estimated)

| Provider | Input Cost | Output Cost | Typical Call |
|----------|-----------|-------------|-------------|
| DeepSeek | $0.14/1M tokens | $0.28/1M tokens | ~2K input, ~1K output = $0.0006 |
| Groq | Free tier | Free tier | Rate limited |
| Gemini | Free tier | Free tier | Rate limited |

At 500 credits/mo for GURU_PRO, if each credit ≈ 1 AI call at ~$0.001 cost, the AI cost per subscriber is ~$0.50/mo vs Rp 49,000 revenue (~$3.10). Gross margin ~84%.

### 5D. Legacy Routes — Unlimited Problem

Three routes have `AI_QUOTA.*.rpp = -1` (unlimited for all plans):

| Route | Legacy Quota | Modern Cost | GURU_FREE Impact |
|-------|-------------|-------------|-----------------|
| `/api/ai/rpp` | rpp: -1 (∞) | 5 credits | Unlimited → 6 calls/mo |
| `/api/ai/soal` | soal: -1 (∞) | 3 credits | Unlimited → 10 calls/mo |
| `/api/guru/latihan` | soal: -1 (∞) | 3 credits | Unlimited → 10 calls/mo |

**Migration decision required**: These routes are legacy (RPP deprecated, soal deprecated, latihan active). Options:
1. **Keep unlimited** for GURU_FREE on these specific routes (exception to credit system)
2. **Migrate to credits** — accept regression (GURU_FREE loses unlimited access)
3. **Deprecate latihan route** — migrate to modern `/api/ai/agents/run` (soal agent)
4. **Hybrid** — latihan uses modern gateway, rpp/soal stay legacy until sunset

---

## 6. Guru vs Murid Premium Experience

### 6A. Guru Premium (Current)

| Feature | Free | Pro |
|---------|------|-----|
| AI credits | 30/mo | 500/mo |
| AI speed cap | 20/day | 200/day |
| Saved results | 50 | ∞ |
| Export downloads | 1/day | 10/day |
| Marketplace selling | No | Yes (85% commission) |
| Priority support | No | Yes |
| Cosmetics | No | Yes |
| Advanced stats | No | Yes |
| Profile badge | No | Premium badge |

### 6B. Murid Premium (Proposed — Product Experience)

Following Duolingo Super/Max principles (not credit-driven):

| Feature | Free | Premium (proposed) |
|---------|------|-------------------|
| Jalur Cerdas | All levels | All levels + bonus challenges |
| Diagnostic | 1 attempt | ∞ attempts |
| Adaptive Practice | Basic (5 skills) | Advanced (7 skills + difficulty) |
| Simulasi UKBI/TKA | 3/month | 10/month |
| Leaderboard | Global | Global + School + Class + Friends |
| Skill Radar | Basic | Detailed + recommendations |
| Daily Quests | Standard | Enhanced (more rewards) |
| Cosmetics | Basic | Premium frames/effects |
| AI Mentor | Basic | Enhanced (personalized) |
| Streak Freeze | 0/month | 1/month |
| Dokumen Hasil | Basic | Enhanced styling |

### 6C. Key Insight: Premium = Product Experience

The founder's directive is clear: **Premium = PRODUCT EXPERIENCE**, not just "more AI credits". Following Duolingo Super/Max principles:

1. **Remove friction** — no ads, no limits on practice
2. **Daily habit** — streak rewards, daily quests, personalized challenges
3. **Personalization** — AI adapts to skill level, recommends content
4. **Progress visibility** — detailed analytics, skill radar, achievement tracking
5. **Practice depth** — unlimited diagnostic attempts, adaptive difficulty
6. **Social proof** — enhanced leaderboard, exclusive badges, school ranking

---

## 7. AIUsage Strategy

### 7A. Current Logging

Every AI call logs to `AIUsage` table:
```prisma
model AIUsage {
  userId    String
  feature   String     // "rpp", "soal", "eyd", "ai-bc-chat", "ai_export_docx", etc.
  provider  String?    // "deepseek", "groq", "gemini"
  model     String?    // "deepseek-chat", "gpt-oss-120b"
  status    String?    // "SUCCESS", "success"
  tokens    Int        // total tokens consumed
  costUSD   Float      // estimated cost in USD
  latencyMs Int?       // response time
  bulan     String     // "YYYY-MM" period
}
```

### 7B. AIUsage Consumers

| Consumer | Feature Strings | Purpose |
|----------|----------------|---------|
| Admin AI Analytics | `agent:rpp`, `agent:soal`, etc. | Usage dashboard |
| Admin Dashboard | `rpp_generator`, `soal_generator` | Legacy stats |
| Export Routes | `ai_export_docx`, `ai_export_pdf`, `ai_export_pptx` | Daily export limit |
| BC Chat | `ai-bc-chat` | Usage tracking |
| Usage Logger | `agent:<agentId>` | Modern agent tracking |

### 7C. Migration Concern

The admin dashboard (`/api/guru/dashboard`) queries `AIUsage` by legacy feature strings. After migrating legacy routes to modern gateway, the feature strings change from `"rpp_generator"` to `"agent:rpp"`. The `logLegacyUsage` bridge in modern routes maps these for backward compatibility.

---

## 8. Entitlement Architecture

### 8A. Two-Layer System

```
Layer 1: AI Gateway (credits)
  resolveUserAiPlan → AiCreditLedger → per-agent cost → deduction
  
Layer 2: Premium Economy (features)
  resolvePlan → Entitlement table → PremiumUsage table → consumption
```

### 8B. Entitlement Keys (7 total)

| Key | Type | FREE | PRO | FOUNDER | Enforced? |
|-----|------|------|-----|---------|-----------|
| SIMULATION_MONTHLY_LIMIT | LIMIT | 3 | 10 | ∞ | Yes |
| AI_MENTOR_DAILY_LIMIT | LIMIT | ∞ | ∞ | ∞ | No (soft) |
| AI_PRACTICE_MONTHLY_LIMIT | LIMIT | ∞ | ∞ | ∞ | No (soft) |
| PREMIUM_PROFILE | BOOLEAN | false | true | true | No (UI) |
| PREMIUM_COSMETICS | BOOLEAN | false | true | true | No (UI) |
| ADVANCED_STATS | BOOLEAN | false | true | true | No (UI) |
| STREAK_FREEZE_MONTHLY | LIMIT | 0 | 1 | ∞ | No (soft) |

### 8C. Usage Features (4 total)

| Feature | Period | Entitlement Key | Enforced? |
|---------|--------|----------------|-----------|
| SIMULATION | MONTH | SIMULATION_MONTHLY_LIMIT | Yes (atomic) |
| AI_MENTOR | DAY | AI_MENTOR_DAILY_LIMIT | No |
| AI_PRACTICE | MONTH | AI_PRACTICE_MONTHLY_LIMIT | No |
| STREAK_FREEZE | MONTH | STREAK_FREEZE_MONTHLY | No |

### 8D. DB Schema

```prisma
model Plan {
  code         String        @unique // FREE, PRO, FOUNDER
  name         String
  entitlements Entitlement[]
}

model Entitlement {
  planCode  String
  key       String          // SIMULATION_MONTHLY_LIMIT, etc.
  type      EntitlementType // BOOLEAN, LIMIT, UNLIMITED
  value     Int?
  @@unique([planCode, key])
}

model PremiumUsage {
  userId      String
  featureCode String         // SIMULATION, AI_MENTOR, etc.
  periodKey   String         // "YYYY-MM" or "YYYY-MM-DD"
  used        Int
  @@unique([userId, featureCode, periodKey])
}
```

---

## 9. Midtrans Lifecycle

### 9A. One-Time Payment (Current Active Flow)

```
Checkout → Transaksi(PENDING) → Snap Token → User Pays → Webhook(capture/settlement)
  → Transaksi(SUCCESS) → User.isPremium=true, premiumUntil calculated
  → AiCreditLedger synced (500 credits)
  → Email confirmation
```

### 9B. Recurring Subscription (Schema Exists, Not Wired)

```
Subscription model exists:
  midtransSubscriptionId, status(PENDING/ACTIVE/CANCELLED/EXPIRED)
  currentPeriodStart/End, willRenew, cancelledAt
  
Not wired: No checkout creates Subscription records.
No webhook handler updates Subscription status.
No cron job checks expired subscriptions.
```

### 9C. Kupon (Coupon) System

- Supports: fixed price (Rp 1,000), percentage discount, minimum price
- Per-plan restriction (planId field)
- Per-role restriction (untukRole field)
- Usage limits (batasPemakaian)
- Time-bound (mulaiBerlaku/berakhirPada)
- Currently used for "Program Guru Cerdas" (Rp 1,000 monthly promo)

### 9D. Payment Providers

- **Midtrans**: Primary payment gateway (Snap for checkout, API for status)
- **Resend**: Email delivery for payment confirmations
- No other providers (no Stripe, no Xendit)

---

## 10. Pricing Strategy Analysis

### 1A. Current Pricing

| Plan | Price | Credits | Cost/Call (RPP) | Calls/Month | Price/Call |
|------|-------|---------|-----------------|-------------|------------|
| GURU_FREE | Free | 30 | 5 credits | 6 | Free |
| GURU_PRO_TRIAL | Free | 200 | 5 credits | 40 | Free |
| GURU_PRO_MONTHLY | Rp 49,000 | 500 | 5 credits | 100 | Rp 490 |
| GURU_PRO_YEARLY | Rp 399,000 | 500 | 5 credits | 100 | Rp 3,325/mo |

### 1B. Competitive Positioning

| Competitor | Price | Features |
|-----------|-------|----------|
| Duolingo Super | ~Rp 150,000/mo | No ads, unlimited hearts, streak repair |
| Duolingo Max | ~Rp 300,000/mo | + AI conversations, explain my answer |
| Quillbot Premium | ~Rp 150,000/mo | Paraphraser, grammar checker, summarizer |
| Grammarly Premium | ~Rp 200,000/mo | Grammar, tone, clarity, plagiarism |
| BahasaCerdas Pro | Rp 49,000/mo | AI RPP, Soal, PPT, simulation, marketplace |

**Positioning**: BahasaCerdas Pro is significantly cheaper than competitors but offers domain-specific value (Bahasa Indonesia education). The low price point is intentional for the Indonesian education market.

### 1C. Pricing Recommendations

1. **Keep Rp 49,000/mo** — competitive for Indonesian market, good value for AI features
2. **Consider Rp 99,000/mo tier** — "Pro Plus" with more credits (1000) and priority AI
3. **Annual discount is strong** — Rp 399,000/yr = Rp 33,250/mo (32% savings)
4. **Kupon strategy** — Rp 1,000 promo for new users is effective acquisition tool
5. **Institutional pricing** — SCHOOL plan (5000 credits) for school-wide deployment

---

## 11. North Star Metrics

### 11A. Revenue Metrics

| Metric | Current | Target (6mo) | Target (12mo) |
|--------|---------|-------------|--------------|
| Paying Guru | 1-2 | 20 | 100 |
| MRR | ~Rp 100,000 | Rp 1,000,000 | Rp 5,000,000 |
| ARPU | Rp 49,000 | Rp 50,000 | Rp 55,000 |
| Churn rate | Unknown | <10%/mo | <5%/mo |
| Trial→Paid conversion | Unknown | >15% | >25% |

### 11B. Engagement Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Daily Active Guru | Unknown | Track via AIUsage |
| AI calls/guru/day | Unknown | Track via AIUsage |
| Simulation attempts/user | Track via PremiumUsage | >3/mo |
| Marketplace transactions | Track via Transaksi | >10/mo |
| Murid daily active | Unknown | Track via XP/login |

### 11C. Product Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Feature adoption (AI tools) | Unknown | >50% guru use AI monthly |
| Content creation rate | Unknown | >5 RPP/soal generated/guru/mo |
| Student engagement | Track via XP | >3 activities/day |
| Retention (30-day) | Unknown | >40% |

---

## 12. Entitlement Matrix (Comprehensive)

### 12A. Guru Entitlements

| Feature | GURU_FREE | GURU_PRO_TRIAL | GURU_PRO | FOUNDER |
|---------|-----------|----------------|----------|---------|
| **AI Credits/Month** | 30 | 200 (total) | 500 | ∞ |
| **AI Speed Cap/Day** | 20 | 100 | 200 | ∞ |
| **Max Credits/Request** | 10 | 50 | 50 | ∞ |
| **Saved Results** | 50 | 200 | ∞ | ∞ |
| **Export Downloads/Day** | 1 | 10 | 10 | ∞ |
| **RPP Generation** | ∞ (legacy) | ∞ (legacy) | ∞ | ∞ |
| **Soal Generation** | ∞ (legacy) | ∞ (legacy) | ∞ | ∞ |
| **Simulation UKBI/TKA** | 3/mo | 3/mo | 10/mo | ∞ |
| **Marketplace Selling** | No | No | Yes (85%) | Yes (85%) |
| **Premium Profile** | No | No | Yes | Yes |
| **Premium Cosmetics** | No | No | Yes | Yes |
| **Advanced Stats** | No | No | Yes | Yes |
| **Streak Freeze** | 0/mo | 0/mo | 1/mo | ∞ |
| **Priority Support** | No | No | Yes | Yes |
| **AI Mentor** | ∞ | ∞ | ∞ | ∞ |
| **AI Practice** | ∞ | ∞ | ∞ | ∞ |

### 12B. Murid Entitlements

| Feature | MURID_FREE | (No paid plan) |
|---------|-----------|---------------|
| **AI Credits** | ∞ | — |
| **AI Speed Cap** | ∞ | — |
| **Simulation** | 3/mo | — |
| **Jalur Cerdas** | All levels | — |
| **Diagnostic** | 1 attempt | — |
| **Adaptive Practice** | Basic | — |
| **Leaderboard** | Global | — |
| **Cosmetics** | Basic | — |
| **Streak Freeze** | 0/mo | — |

### 12C. Admin/Founder Entitlements

| Feature | ADMIN | FOUNDER |
|---------|-------|---------|
| **Everything** | ∞ | ∞ |
| **Admin Panel** | Yes | Yes |
| **User Management** | Yes | Yes |
| **Payment Management** | Yes | Yes |
| **AI Analytics** | Yes | Yes |
| **Manual Premium Grant** | Yes | Yes |

---

## 13. Migration Roadmap (19 Steps)

### Phase 1: Foundation (Steps 1-5)

| Step | Description | Risk | Effort |
|------|-------------|------|--------|
| 1 | **Unify Plan Resolution** — Merge AI Gateway + Premium Economy into single `resolvePlan()` | Medium | High |
| 2 | **Consolidate Plan Codes** — Align AI Gateway plans (GURU_PRO) with Premium Economy plans (PRO) | Low | Medium |
| 3 | **Wire Subscription Model** — Connect Prisma `Subscription` to Midtrans recurring API | High | High |
| 4 | **Extend Entitlement Matrix** — Add AI credit entitlements to `Entitlement` table | Low | Low |
| 5 | **Unified Quota API** — Single `/api/quota/status` replacing both AI Gateway and Premium Economy status | Low | Medium |

### Phase 2: Guru Premium (Steps 6-10)

| Step | Description | Risk | Effort |
|------|-------------|------|--------|
| 6 | **Migrate Legacy Routes** — Wire RPP/Soal/Latihan to modern gateway with unlimited exception | Medium | Medium |
| 7 | **Enhance Berlangganan Page** — Show full feature comparison, entitlement details | Low | Medium |
| 8 | **Add Kupon to Checkout** — Support promo codes, institutional discounts | Low | Low |
| 9 | **Implement Auto-Renewal** — Wire Midtrans recurring + Subscription model | High | High |
| 10 | **Guru Premium Analytics** — Track usage, conversion, churn | Low | Medium |

### Phase 3: Murid Premium (Steps 11-15)

| Step | Description | Risk | Effort |
|------|-------------|------|--------|
| 11 | **Design Murid Premium Plan** — Product experience features (not credit-driven) | Low | Medium |
| 12 | **Create Murid Checkout Flow** — Extend checkout for murid role | Medium | Medium |
| 13 | **Implement Murid Entitlements** — Enhanced simulation, diagnostic, adaptive | Low | Medium |
| 14 | **Murid Premium UI** — Upgrade modal, feature gates, premium indicators | Low | Medium |
| 15 | **Murid Premium Analytics** — Track murid engagement and conversion | Low | Low |

### Phase 4: Optimization (Steps 16-19)

| Step | Description | Risk | Effort |
|------|-------------|------|--------|
| 16 | **Institutional Billing** — SCHOOL plan for school-wide deployment | Medium | High |
| 17 | **Advanced Coupon System** — Referral codes, bulk discounts, seasonal promos | Low | Medium |
| 18 | **Revenue Dashboard** — Real-time MRR, churn, LTV, conversion funnel | Low | Medium |
| 19 | **A/B Testing Framework** — Test pricing, features, trial lengths | Low | High |

---

## 14. Risk Analysis

### 14A. Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual-system confusion | Medium | Unify plan resolution (Step 1) |
| Subscription webhook reliability | High | Idempotent handlers, retry queue, monitoring |
| Credit ledger race conditions | Medium | Atomic deduction already implemented |
| Legacy route migration regression | High | Keep unlimited exception for GURU_FREE on legacy routes |
| PremiumUsage migration not run | Medium | Graceful degradation (P2021/P2022 catch) |

### 14B. Business Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Low conversion rate | High | Free trial, clear value proposition, competitive pricing |
| High churn | Medium | Engagement features, streak rewards, personalized content |
| Murid monetization failure | Medium | Start with product experience, not credits |
| Kupon abuse | Low | Per-plan, per-role, time-bound, usage limits |
| Founder dependency | Medium | Document all decisions, automate billing |

### 14C. Compliance Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Payment data security | High | Midtrans handles PCI compliance, no card data stored |
| Student data privacy | High | FERPA/COPPA considerations for murid data |
| Indonesian payment regulations | Medium | Midtrans is locally compliant |
| Tax compliance | Medium | Invoice generation, PPN handling |

---

## 15. Founder Decisions Required

### 15A. Critical Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | **Legacy route migration** | A) Keep unlimited for GURU_FREE, B) Migrate to credits, C) Deprecate | Affects GURU_FREE experience |
| 2 | **Murid monetization** | A) No murid premium, B) Product experience only, C) Credit-based | Affects revenue potential |
| 3 | **Auto-renewal** | A) Manual renewal only, B) Auto-renew with Midtrans, C) Both | Affects churn and revenue |
| 4 | **Subscription model** | A) Keep one-time payments, B) Switch to recurring, C) Hybrid | Affects billing complexity |
| 5 | **Institutional pricing** | A) SCHOOL plan, B) Per-student pricing, C) Custom | Affects school adoption |

### 15B. Product Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 6 | **Guru Pro features** | Current set vs enhanced | Affects conversion |
| 7 | **Murid premium features** | What to include in paid tier | Affects murid engagement |
| 8 | **Trial length** | 30 days vs 14 days vs 7 days | Affects conversion |
| 9 | **Trial credits** | 200 total vs 500 total | Affects trial experience |
| 10 | **Pricing** | Rp 49,000/mo vs Rp 99,000/mo | Affects revenue and conversion |

### 15C. Technical Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 11 | **Plan resolution unification** | A) Single system, B) Keep dual | Affects maintenance |
| 12 | **Entitlement system** | A) DB-first, B) Config-first, C) Hybrid | Affects flexibility |
| 13 | **Credit system** | A) Keep credits, B) Switch to per-feature limits | Affects billing model |
| 14 | **Analytics approach** | A) AIUsage only, B) PremiumUsage + AIUsage, C) Both | Affects insights |

---

## 16. Implementation Priorities

### Immediate (This Week)

1. **Document all founder decisions** (Section 15)
2. **Run PremiumUsage migration** if not already done
3. **Verify AiCreditLedger** is being populated correctly in production

### Short-term (1-2 Weeks)

4. **Migrate legacy routes** with unlimited exception (Step 6)
5. **Enhance berlangganan page** with feature comparison (Step 7)
6. **Add kupon to checkout** (Step 8)

### Medium-term (1-2 Months)

7. **Unify plan resolution** (Step 1)
8. **Implement auto-renewal** (Step 9)
9. **Design murid premium** (Step 11)

### Long-term (3-6 Months)

10. **Institutional billing** (Step 16)
11. **Revenue dashboard** (Step 18)
12. **A/B testing framework** (Step 19)

---

## 17. Appendix: File Reference

### Core Files

| File | Purpose |
|------|---------|
| `lib/ai-gateway/plan-resolver.ts` | AI Gateway plan resolution (6 outcomes) |
| `lib/ai-gateway/quota-checker.ts` | Credit check + deduction engine |
| `lib/ai-gateway/quota-policy.ts` | Quota limits per plan |
| `lib/ai-gateway/agent-cost-policy.ts` | Per-agent credit costs |
| `lib/ai-gateway/gateway-types.ts` | Type definitions |
| `lib/ai-gateway/gateway-config.ts` | Hard mode flag |
| `lib/ai-gateway/trial-service.ts` | Trial start/status |
| `lib/premium-economy/plans.ts` | Premium Economy plan resolution (3 outcomes) |
| `lib/premium-economy/entitlement.ts` | Entitlement resolution (DB-first) |
| `lib/premium-economy/features.ts` | Feature + entitlement key definitions |
| `lib/premium-economy/matrix.ts` | Default entitlement matrix |
| `lib/premium-economy/usage.ts` | Atomic usage engine |
| `lib/billing/plans.ts` | Product plans (pricing) |
| `lib/billing/kupon.ts` | Coupon system |
| `lib/billing/limits.ts` | Daily export limits |
| `lib/payments/midtrans-server.ts` | Midtrans SDK integration |
| `app/api/billing/checkout/route.ts` | Checkout flow |
| `app/api/payment/webhook/route.ts` | Payment webhook |
| `app/api/ai/quota/status/route.ts` | AI quota status API |
| `app/api/player/premium/status/route.ts` | Premium economy status API |
| `app/(dashboard)/guru/berlangganan/page.tsx` | Subscription page UI |

### Legacy Files (Phase 1A/1C Audit)

| File | Purpose |
|------|---------|
| `lib/premium.ts` | Legacy billing (checkAIQuota, recordAIUsage) |
| `app/api/ai/rpp/route.ts` | Legacy RPP (deprecated, unlimited) |
| `app/api/ai/soal/route.ts` | Legacy soal (deprecated, unlimited) |
| `app/api/guru/latihan/route.ts` | Legacy latihan (active, unlimited) |

### Prisma Models

| Model | Purpose |
|-------|---------|
| `User` | isPremium, premiumPlan, premiumUntil, trialEndsAt, isFounder |
| `Subscription` | Midtrans subscription (exists, not actively used) |
| `Transaksi` | Payment records (one-time payments) |
| `Kupon` | Coupon definitions |
| `KuponPemakaian` | Coupon usage history |
| `AiCreditLedger` | AI credit tracking |
| `AIUsage` | AI usage logging |
| `Plan` | Premium Economy plans |
| `Entitlement` | Feature entitlements per plan |
| `PremiumUsage` | Feature usage tracking |
| `AIJob` | Legacy job queue (RPP only) |

---

*Document generated as part of Phase 1D — READ-ONLY design. No code changes made.*
