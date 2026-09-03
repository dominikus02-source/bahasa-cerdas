# BahasaCerdas — Investor KPI Contract

## Version
1.0

## Last Updated
September 3, 2026

## Purpose

Define exact semantics for every investor-facing KPI. This document is the canonical reference.
Any code that calculates an investor metric MUST match this contract.

---

## Principles

1. **Formula is explicit** — no ambiguous language
2. **Source is canonical** — one implementation, one result
3. **Timezone is Asia/Jakarta (WIB)** — all reporting boundaries
4. **Sample-size rules are documented** — metrics with insufficient data return null
5. **No fabrication** — "Belum tersedia" is preferred over invented values

---

## KPI Definitions

### 1. Total Users

| Field | Value |
|-------|-------|
| **Definition** | All registered accounts in the system |
| **Source** | `User.count()` |
| **Formula** | `count(*)` |
| **Timezone** | N/A (count, not time-bound) |
| **Numerator** | all rows in User table |
| **Denominator** | N/A |
| **Source table** | `User` |
| **Known limitation** | Includes all roles (murid, guru, admin, founder). Includes inactive accounts. |

### 2. New Users (7d)

| Field | Value |
|-------|-------|
| **Definition** | Users registered in the last 7 calendar days (WIB) |
| **Source** | `User.count(createdAt >= wibDaysAgo(7))` |
| **Formula** | count of User rows where createdAt ≥ (today WIB - 7 days) in UTC |
| **Timezone** | WIB boundary → UTC for query |
| **Sample-size rule** | None (count is always meaningful) |
| **Known limitation** | Count of accounts, not unique humans. Self-registration, demo accounts included. |

### 3. New Users (30d)

| Field | Value |
|-------|-------|
| **Definition** | Users registered in the last 30 calendar days (WIB) |
| **Source** | `User.count(createdAt >= wibDaysAgo(30))` |
| **Formula** | count of User rows where createdAt ≥ (today WIB - 30 days) in UTC |
| **Timezone** | WIB boundary → UTC for query |

### 4. DAU (Daily Active Users)

| Field | Value |
|-------|-------|
| **Definition** | Distinct users who earned XP today (WIB calendar day) |
| **Source** | `XPTransaction.groupBy(userId, createdAt >= todayStart WIB)` |
| **Formula** | `distinct(userId) WHERE createdAt >= todayStartWIB` → `.length` |
| **Timezone** | todayStart = 00:00 WIB today → UTC equivalent |
| **Numerator** | distinct userId with XP activity today |
| **Denominator** | N/A |
| **Sample-size rule** | None |
| **Known limitation** | XP earning is a proxy for engagement. Not all learning activities earn XP. Not all user actions produce XP transactions. |

### 5. WAU (Weekly Active Users)

| Field | Value |
|-------|-------|
| **Definition** | Distinct users who earned XP in the trailing 7 days |
| **Source** | `XPTransaction.groupBy(userId, createdAt >= wibDaysAgo(7))` |
| **Formula** | `distinct(userId) WHERE createdAt >= now-7d` → `.length` |
| **Timezone** | WIB boundary → UTC |
| **Invariant** | DAU ≤ WAU ≤ MAU must always hold |

### 6. MAU (Monthly Active Users)

| Field | Value |
|-------|-------|
| **Definition** | Distinct users who earned XP in the trailing 30 days |
| **Source** | `XPTransaction.groupBy(userId, createdAt >= wibDaysAgo(30))` |
| **Formula** | `distinct(userId) WHERE createdAt >= now-30d` → `.length` |
| **Timezone** | WIB boundary → UTC |

### 7. DAU/MAU Ratio

| Field | Value |
|-------|-------|
| **Definition** | Daily-to-monthly engagement stickiness ratio |
| **Formula** | `DAU / MAU × 100` |
| **Unit** | percent |
| **Known limitation** | Early-stage product with small user base may show volatile ratios |
| **Sample-size rule** | Return null if MAU = 0 |

### 8. D7 Retention

| Field | Value |
|-------|-------|
| **Definition** | Percentage of users in a registration cohort who perform qualifying activity on exactly calendar day +7 |
| **Source** | Cohort (User registration date) × XPTransaction |
| **Formula** | `activeOnDay7 / cohortSize × 100` |
| **Cohort date** | Registration calendar date in Asia/Jakarta |
| **Day 0** | Registration calendar day |
| **D7 window** | Activity on cohort_date + 7 WIB calendar days (exact day) |
| **Qualifying activity** | Any XPTransaction by cohort user on D7 day |
| **Numerator** | distinct users in cohort with XPTransaction on D7 day |
| **Denominator** | cohort size (users registered on cohort date) |
| **Sample-size rule** | Return null if cohort < 10 users |
| **Insufficient observation** | Return null if D7 day has not yet passed |
| **Timezone** | WIB calendar day boundaries |

### 9. D30 Retention

| Field | Value |
|-------|-------|
| **Definition** | Percentage of users in a registration cohort who perform qualifying activity on exactly calendar day +30 |
| **Formula** | `activeOnDay30 / cohortSize × 100` |
| **D30 window** | Activity on cohort_date + 30 WIB calendar days (exact day) |
| **Sample-size rule** | Return null if cohort < 10 users |
| **Insufficient observation** | Return null if D30 day has not yet passed |

### 10. Active Premium

| Field | Value |
|-------|-------|
| **Definition** | Users with current active Premium entitlement |
| **Source** | `User.count(isPremium=true, premiumUntil>now, isFounder=false)` |
| **Formula** | count(*) WHERE isPremium=true AND premiumUntil > NOW() AND isFounder=false |
| **Canonical state** | User table fields are the source of truth for entitlement |
| **Known limitation** | Includes both paid and manual/comped premium users. Cannot distinguish payment-backed vs admin-granted from this metric alone. |

### 11. Murid Premium

| Field | Value |
|-------|-------|
| **Definition** | Active student Premium entitlement |
| **Formula** | Active Premium WHERE role='MURID' |

### 12. Guru Premium

| Field | Value |
|-------|-------|
| **Definition** | Active teacher Premium entitlement |
| **Formula** | Active Premium WHERE role='GURU' |

### 13. Premium Conversion Rate

| Field | Value |
|-------|-------|
| **Definition** | Guru Premium adoption rate |
| **Numerator** | Active Guru Premium users |
| **Denominator** | Total Guru minus Founders (eligible teacher population) |
| **Formula** | `guruPremium / (totalGuru - founderCount) × 100` |
| **Unit** | percent |
| **Sample-size rule** | Return null if eligible < 5 |
| **Known limitation** | Guru-only. Murid Premium is not included in conversion. |

### 14. MRR (Monthly Recurring Revenue)

| Field | Value |
|-------|-------|
| **Definition** | Normalized monthly recurring revenue from currently active Premium subscriptions |
| **Source** | Active Premium users × plan normalization |
| **Formula** | `Σ MRR_CONTRIBUTION[plan]` for each active Premium user |
| **Time window** | Current snapshot (point-in-time) |
| **Plan detection** | Most recent SUCCESS Premium transaction reference → fallback to User.premiumPlan |
| **Canonical pricing** | `lib/admin/executive.ts → PLAN_PRICES + MRR_CONTRIBUTION` |
| **Unit** | Rp/month |
| **Investor-safe** | YES |

**Plan → MRR mapping:**

| Plan | Payment Price | MRR Contribution |
|------|---------------|------------------|
| MURID_PREMIUM_MONTHLY | Rp 19,000/month | Rp 19,000 |
| MURID_PREMIUM_YEARLY | Rp 180,000/year | Rp 15,000 (= 180K ÷ 12) |
| GURU_PRO_MONTHLY | Rp 49,000/month | Rp 49,000 |
| GURU_PRO_YEARLY | Rp 399,000/year | Rp 33,250 (= 399K ÷ 12) |

**Double-count protection**: Each user counted exactly once via User record. Multiple historical SUCCESS transactions do NOT inflate MRR.

**Expired exclusion**: Only `isPremium=true AND premiumUntil>now` users are counted.

**Founder exclusion**: `isFounder=true` users excluded.

### 15. MRR Breakdown

| Field | Value |
|-------|-------|
| **Definition** | MRR decomposed by plan type |
| **Source** | `calculateMRRBreakdown()` |
| **Returns** | `{ muridMonthly, muridYearly, guruMonthly, guruYearly, total }` |
| **Invariant** | `total === calculateMRR()` |

### 16. Cash Collected (30d)

| Field | Value |
|-------|-------|
| **Definition** | Actual cash received from Premium transactions in trailing 30 days |
| **Source** | `Transaksi.aggregate(amount, status=SUCCESS, createdAt>=now-30d)` |
| **Formula** | `sum(amount) WHERE status='SUCCESS' AND createdAt >= now-30d` |
| **Timezone** | UTC comparison (database timestamps are UTC) |
| **Unit** | Rp |
| **≠ MRR** | Cash collected ≠ recurring revenue. Yearly payment contributes full amount to cash but only 1/12 to MRR. |

### 17. Cash Collected (All-Time)

| Field | Value |
|-------|-------|
| **Definition** | All cash received from successful Premium transactions |
| **Formula** | `sum(amount) WHERE status='SUCCESS'` |

### 18. Premium Transaction Count (30d)

| Field | Value |
|-------|-------|
| **Definition** | Count of successful Premium transactions in trailing 30 days |
| **Formula** | `count(*) WHERE status='SUCCESS' AND createdAt >= now-30d` |

### 19. Learning Activity (7d)

| Field | Value |
|-------|-------|
| **Definition** | Number of learning units completed in trailing 7 days |
| **Source** | `UserUnitProgress.count(completed=true, completedAt>=now-7d)` |
| **Unit** | count (rows, not unique users) |

### 20. MRR Trend / Growth

| Field | Value |
|-------|-------|
| **Status** | INSUFFICIENT DATA |
| **Reason** | No historical MRR snapshot infrastructure exists. Cannot derive historical MRR from current premiumUntil dates. |
| **Current implementation** | Returns `{ trend: null, comparisonAvailable: false }` |
| **What would be needed** | Daily MRR snapshot table or equivalent |

### 21. Retention Trend

| Field | Value |
|-------|-------|
| **Status** | DERIVABLE |
| **Definition** | Visual comparison of D7 rates across cohorts |
| **Limitation** | Not statistically rigorous. Confounds cohort quality with time effects. |
