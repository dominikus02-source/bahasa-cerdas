# Founder Decision Layer — BahasaCerdas Control Tower

## Version
1.0

## Last Updated
September 2, 2026

## Overview

The Founder Decision Layer transforms raw analytics into deterministic, actionable signals. It evaluates four business domains and produces a health status + up to 3 prioritized actions.

**Core principle**: DATA → RULE → SIGNAL → ACTION. No AI. No randomness.

---

## Health Model

### Status Levels

| Status | Meaning | Visual |
|--------|---------|--------|
| **CRITICAL** | At least one P1 issue exists | 🔴 Red banner |
| **ATTENTION** | At least one P2 issue exists (no P1) | 🟡 Amber banner |
| **HEALTHY** | No P1 or P2 issues | 🟢 Green banner |

### Evaluation Domains

| Domain | What it checks |
|--------|---------------|
| **Business** | MRR, premium conversion, premium active count |
| **Product** | DAU trend, retention, learning activity |
| **Trust** | Payment health, data quality, entitlement integrity |
| **Operations** | Pending actions, system state |

---

## Decision Rules

### P1 — Critical (requires immediate founder attention)

| # | Rule | Threshold | Evidence | Action | Destination |
|---|------|-----------|----------|--------|-------------|
| 1 | Payment mismatch | `paymentMismatchCount > 0` | Count + Rp at risk | Investigasi Pembayaran | `/admin/payments` |
| 2 | Critical data quality | `dataQualityCriticalCount > 0` | Count of critical findings | Lihat Data Quality | `/admin/data-center` |
| 3 | Zero active premium with historical cash | `activePremium === 0 AND cashCollectedAllTime > 0` | Cash at risk | Periksa Entitlement | `/admin/payments` |

### P2 — Attention (should be addressed this week)

| # | Rule | Threshold | Evidence | Action | Destination |
|---|------|-----------|----------|--------|-------------|
| 4 | DAU declining 3 consecutive days | `dau[today] < dau[yesterday] < dau[twoDaysAgo]` | Day-over-day values + % drop | Lihat Learning Analytics | `/admin/analytics` |
| 5 | D7 retention below threshold | `latestD7Rate < 20%` | Rate + threshold | Analisis Retensi | `/admin/analytics` |

### P3 — Growth opportunity (address when P1/P2 clear)

| # | Rule | Threshold | Evidence | Action | Destination |
|---|------|-----------|----------|--------|-------------|
| 6 | Premium conversion low | `conversionRate < 5% AND activePremium > 0` | Rate + threshold | Review Premium | `/admin/premium` |
| 7 | No learning completions | `jalurCompleted7d === 0 AND dauToday > 0` | DAU vs completions | Lihat Analytics | `/admin/analytics` |

### Priority Ordering

1. Sort by severity: P1 first, then P2, then P3
2. Return at most **3 priorities**
3. If no issues: return empty priorities + HEALTHY status with growth recommendation

---

## KPI Definitions

### Section 2 — Core KPIs

| Card | Value | Subtitle | Source |
|------|-------|----------|--------|
| Total Users | `users.total` | murid/guru split | `User.count()` |
| DAU | `active.dau.value` | WAU/MAU | `XPTransaction.groupBy` today |
| Active Premium | `premium.active.value` | murid/guru split | `User.count WHERE isPremium AND premiumUntil>now` |
| MRR | `revenue.mrr.value` | trend status | `calculateMRR()` |
| Cash Collected 30d | `revenue.cashCollected30d.value` | all-time | `Transaksi.aggregate WHERE SUCCESS` |

### Section 3 — Intelligence Columns

**Column A: Growth**
- DAU, WAU, MAU with trends
- D7/D30 retention (median of recent cohorts)
- New Users 7d with trend

**Column B: Revenue Mix**
- MRR breakdown: Murid Monthly, Murid Yearly, Guru Monthly, Guru Yearly
- Transaction counts (success 30d, pending)

**Column C: Payment Trust**
- Payment → Premium health (Healthy/Mismatch count)
- Premium Conversion rate
- Trial active count
- CTA to Payments if mismatch

---

## MRR Breakdown

### Canonical Source
`lib/admin/executive.ts → calculateMRRBreakdown()`

### Formula
For each active premium user (`isPremium=true AND premiumUntil>now AND isFounder=false`):
1. Detect plan from most recent SUCCESS transaction reference
2. Fallback to `user.premiumPlan`
3. Look up `MRR_CONTRIBUTION[plan]`
4. Sum by category

### Plan → MRR Mapping

| Plan | Price | MRR Contribution |
|------|-------|-----------------|
| MURID_PREMIUM_MONTHLY | Rp 19,000/mo | Rp 19,000 |
| MURID_PREMIUM_YEARLY | Rp 180,000/yr | Rp 15,000 (=180K÷12) |
| GURU_PRO_MONTHLY | Rp 49,000/mo | Rp 49,000 |
| GURU_PRO_YEARLY | Rp 399,000/yr | Rp 33,250 (=399K÷12) |

### MRR Trend
- **Not yet available** — no historical snapshot infrastructure
- Returns `trend: null, comparisonAvailable: false`
- UI displays "Belum tersedia trend"
- Future: add daily MRR snapshots to enable trend calculation

---

## Retention

### Definition
- **Cohort**: Users registered on a specific WIB calendar day
- **D7**: Activity on cohort_date + 7 WIB days
- **D30**: Activity on cohort_date + 30 WIB days
- **Qualifying activity**: Any XPTransaction on the target day
- **Insufficient observation**: Returns null (not 0)

### UI Behavior
- Collapsed by default (uses `<details>` element)
- Header shows median D7 and D30 rates
- Expandable table with all cohorts

---

## Threshold Configuration

All thresholds are defined as constants in `lib/admin/founder-health.ts`:

```ts
const PREMIUM_CONVERSION_THRESHOLD = 5;  // percent
const D7_RETENTION_THRESHOLD = 20;       // percent
const DAU_DECLINE_THRESHOLD = 10;        // percent (for future use)
```

Changes to thresholds require updating:
1. `lib/admin/founder-health.ts`
2. `scripts/test-founder-health.ts`
3. This document

---

## Data Flow

```
Prisma DB
    ↓
lib/admin/executive.ts → getExecutiveDashboardData()
    ↓
app/(dashboard)/admin/executive/page.tsx (Server Component)
    ↓
lib/admin/founder-health.ts → evaluateFounderHealth()
    ↓
Rendered as: Health Banner + KPIs + Intelligence + Priorities + Retention
```

Every metric on the page traces back to a single canonical query in `lib/admin/executive.ts`. The health engine is a pure function that receives these metrics as input — no DB calls, no side effects.

---

## Testing

All rules are tested in `scripts/test-founder-health.ts`:
- Every P1 rule triggered correctly
- Every P2 rule triggered correctly
- Every P3 rule triggered correctly
- Priority ordering (P1 before P2 before P3)
- Maximum 3 priorities enforced
- HEALTHY state when no issues
- MRR breakdown matches calculateMRR()
- Edge cases: zero denominators, null retention, empty data
