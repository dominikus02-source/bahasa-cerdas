# BahasaCerdas — Investor Metrics Contract

## Purpose

This document is the **single source of truth** for every metric that may appear in investor materials, pitch decks, board updates, or financial reports.

It is NOT a pitch deck. It is a technical contract that ensures any investor-facing number can be traced to a canonical database query and reproduced by any engineer.

## Version

2.0

## Last Updated

September 2, 2026

---

## Canonical Service

All metrics are computed by `lib/admin/executive.ts` → `getExecutiveDashboardData()`.

Premium Command Center (`/api/admin/premium/report`) uses `calculateMRR()` from the same service.

**No module may compute MRR, Cash Collected, or Active Premium independently.**

---

## MRR — Monthly Recurring Revenue

**Investor-safe**: YES

**Definition**: Normalized monthly recurring revenue from currently active Premium subscriptions.

**Formula**: For each user where `isPremium=true AND premiumUntil>now AND isFounder=false`:
1. Determine plan from most recent SUCCESS transaction `reference` field (or `premiumPlan` fallback)
2. Look up `MRR_CONTRIBUTION[plan]`
3. Sum all contributions

**Plan → MRR mapping**:

| Plan | Price | MRR Contribution |
|------|-------|-----------------|
| MURID_PREMIUM_MONTHLY | Rp 19,000/month | Rp 19,000 |
| MURID_PREMIUM_YEARLY | Rp 180,000/year | Rp 15,000 (=180K÷12) |
| GURU_PRO_MONTHLY | Rp 49,000/month | Rp 49,000 |
| GURU_PRO_YEARLY | Rp 399,000/year | Rp 33,250 (=399K÷12) |

**Inclusion rules**:
- User must have `isPremium=true`
- User must have `premiumUntil > NOW()`
- User must NOT be a founder (`isFounder=false`)
- Plan determined from most recent SUCCESS transaction reference

**Exclusion rules**:
- Expired premium users (premiumUntil ≤ now)
- Founder accounts
- Users without qualifying SUCCESS transaction (manual/comped premium)
- FREE users

**Known limitations**:
- Plan detection relies on transaction `reference` field; may be stale if user changed plans
- Manual/comped premium (e.g., admin grants) does NOT contribute to MRR unless they have a qualifying transaction

**Data source**: `User` + `Transaksi` (most recent SUCCESS per user)

**Current value source**: `lib/admin/executive.ts` → `calculateMRR()`

**Type**: Recurring (monthly equivalent)

---

## Cash Collected — Current Month

**Investor-safe**: YES

**Definition**: Total Premium payments received during the current calendar month.

**Formula**: `SUM(amount) WHERE status='SUCCESS' AND createdAt >= monthStart`

**Inclusion rules**:
- Transaction type: `PREMIUM_UPGRADE` or `MURID_PREMIUM`
- Status: `SUCCESS`
- Created in current calendar month

**Exclusion rules**:
- PENDING, FAILED, EXPIRED, CANCELLED transactions
- Non-premium transaction types
- Manual premium activations (no transaction)

**Data source**: `Transaksi`

**Type**: Cash (actual payments received)

---

## Cash Collected — 30 Days

**Investor-safe**: YES

**Definition**: Total Premium payments received in trailing 30 days.

**Formula**: `SUM(amount) WHERE status='SUCCESS' AND createdAt >= NOW() - 30 days`

**Same inclusion/exclusion rules as Cash Collected — Current Month.**

---

## Cash Collected — All Time

**Investor-safe**: YES

**Definition**: Total Premium payments received since inception.

**Formula**: `SUM(amount) WHERE status='SUCCESS'`

**Same inclusion/exclusion rules as Cash Collected — Current Month.**

---

## Active Premium

**Investor-safe**: YES

**Definition**: Users with current Premium entitlement.

**Formula**: `COUNT(*) WHERE isPremium=true AND premiumUntil>now AND isFounder=false`

**Inclusion rules**:
- `isPremium=true`
- `premiumUntil > NOW()`
- `isFounder=false`

**Exclusion rules**:
- Founders/admins
- Users with expired entitlement (premiumUntil ≤ now)
- Users with isPremium=false

**Known edge cases**:
- Manual/comped premium (admin grants without transaction) IS counted in Active Premium
- This is intentional: Active Premium measures entitlement, not payment source

**Data source**: `User`

**Type**: Population (current entitlement holders)

---

## Paid Premium

**Investor-safe**: YES (with caveat)

**Definition**: Active Premium users whose entitlement is backed by a qualifying SUCCESS Premium transaction.

**Formula**: `COUNT(User) WHERE isPremium=true AND premiumUntil>now AND isFounder=false AND EXISTS(Transaksi WHERE userId=User.id AND status='SUCCESS' AND type IN ['PREMIUM_UPGRADE','MURID_PREMIUM'])`

**Difference from Active Premium**: Excludes manual/comped users who have no qualifying transaction.

**Data source**: `User` + `Transaksi`

**Type**: Population (paying entitlement holders)

---

## Historical Premium Customers

**Investor-safe**: YES

**Definition**: Users with at least one qualifying SUCCESS Premium transaction, regardless of current entitlement status.

**Formula**: `COUNT(DISTINCT userId) FROM Transaksi WHERE status='SUCCESS' AND type IN ['PREMIUM_UPGRADE','MURID_PREMIUM']`

**Data source**: `Transaksi`

**Type**: Population (ever-paid users)

---

## Guru Premium Conversion Rate

**Investor-safe**: YES

**Definition**: Percentage of eligible Guru accounts with active Premium.

**Formula**: `ROUND(activeGuruPremium / (totalGuru - founderCount) × 100)`

**Numerator**: `COUNT(User) WHERE isPremium=true AND premiumUntil>now AND role='GURU' AND isFounder=false`

**Denominator**: `COUNT(User) WHERE role='GURU'` minus `COUNT(User) WHERE isFounder=true`

**Eligibility**: All Guru accounts minus founder accounts

**Exclusion**: Founders, admins, MURID accounts

**Edge case**: If denominator = 0, rate = 0

**Data source**: `User`

---

## DAU — Daily Active Users

**Investor-safe**: YES

**Definition**: Distinct users with XP activity today.

**Formula**: `COUNT(DISTINCT userId) FROM XPTransaction WHERE createdAt >= todayStart`

**Timezone**: Computed as midnight UTC (Vercel server time). Off by 7 hours from WIB (Asia/Jakarta). Acceptable for trend purposes.

**Qualifying activity**: Any `XPTransaction` record (learning, game, quiz, etc.)

**Data source**: `XPTransaction`

**Type**: Activity (daily unique users)

---

## WAU — Weekly Active Users

**Investor-safe**: YES

**Definition**: Distinct users with XP activity in trailing 7 days.

**Formula**: `COUNT(DISTINCT userId) FROM XPTransaction WHERE createdAt >= NOW() - 7 days`

**Invariant**: WAU ≥ DAU (always)

---

## MAU — Monthly Active Users

**Investor-safe**: YES

**Definition**: Distinct users with XP activity in trailing 30 days.

**Formula**: `COUNT(DISTINCT userId) FROM XPTransaction WHERE createdAt >= NOW() - 30 days`

**Invariant**: MAU ≥ WAU (always)

---

## D7 Retention

**Investor-safe**: YES

**Definition**: Percentage of users registered on a specific WIB calendar day who performed XP activity on cohort_date + 7 WIB days.

**Formula**: `activeOnDay7 / registeredOnDay0 × 100`

**Cohort**: Users registered on a specific WIB calendar day (Asia/Jakarta)

**D7 window**: The exact WIB calendar day that is 7 days after registration day. Only activity on that single day counts.

**Qualifying activity**: Any XPTransaction on the D7 WIB day

**Insufficient observation**: Returns `null` if the D7 day has not yet passed. UI shows "belum cukup".

---

## D30 Retention

**Investor-safe**: YES

**Definition**: Percentage of users registered on a specific WIB calendar day who performed XP activity on cohort_date + 30 WIB days.

**Formula**: `activeOnDay30 / registeredOnDay0 × 100`

**D30 window**: The exact WIB calendar day that is 30 days after registration day. Only activity on that single day counts.

**Qualifying activity**: Any XPTransaction on the D30 WIB day

**Insufficient observation**: Returns `null` if the D30 day has not yet passed. For cohorts less than 30 days old, D30 is always null (not 0).

---

## Payment Health

**Investor-safe**: NO (operational metric)

**Definition**: Detection of SUCCESS payments without active Premium entitlement.

**Formula**: Filter `Transaksi WHERE status='SUCCESS' AND type IN ['PREMIUM_UPGRADE','MURID_PREMIUM']` → find users where `isPremium=false OR premiumUntil≤now`

**This indicates**: Payment was received but entitlement was not activated (potential bug or webhook failure).

---

## Premium Reconciliation

**Investor-safe**: NO (operational metric)

**Definition**: Consistency check between payment records and entitlement state.

**Invariants checked**:
1. Every active Premium user should have at least one qualifying SUCCESS transaction
2. Every SUCCESS premium transaction should reference a valid user
3. No duplicate orderId across premium transactions
4. No duplicate Midtrans ID across premium transactions

---

## Cross-Metric Consistency Matrix

| Scenario | MRR | Cash Collected | Paid Premium | Active Premium | Revenue Impact |
|----------|-----|---------------|-------------|---------------|----------------|
| Paid monthly subscriber | ✅ monthly price | ✅ full amount | ✅ | ✅ | ✅ counted |
| Paid yearly subscriber | ✅ annual/12 | ✅ full amount | ✅ | ✅ | ✅ counted |
| Expired paid user | ❌ 0 | ✅ historical only | ❌ | ❌ | ✅ historical |
| Manual activation (no tx) | ❌ 0 | ❌ 0 | ❌ | ✅ | ❌ 0 |
| FREE user | ❌ 0 | ❌ 0 | ❌ | ❌ | ❌ 0 |

---

## Timezone

All analytics date boundaries use **Asia/Jakarta (WIB, UTC+7)**.

Canonical helpers in `lib/admin/analytics-timezone.ts`:
- `wibTodayStart()` — start of today in WIB
- `wibDaysAgo(n)` — n WIB calendar days ago
- `utcToWibDate()` — convert UTC timestamp to WIB date components
- `wibDayToUtcRange()` — get UTC query range for a WIB day

Database timestamps remain UTC. Only reporting period boundaries are converted.

---

## How to Reproduce Any Metric

1. Import `calculateMRR()` from `lib/admin/executive.ts`
2. Call `getExecutiveDashboardData()` from the same file
3. Compare output with dashboard display
4. Or run `npx tsx scripts/test-investor-truth-gate.ts` for automated verification

---

## Audit Trail

| Date | Change | Author |
|------|--------|--------|
| 2026-09-02 | v1.0 — Initial contract | Automated audit |
| 2026-09-02 | MRR consolidated to canonical `calculateMRR()` | Phase 7 audit |
| 2026-09-02 | Founder count made dynamic | Phase 7 audit |
| 2026-09-02 | Premium Command Center uses canonical MRR | Phase 7 audit |
| 2026-09-02 | v2.0 — Standard D7/D30 retention, WIB timezone, null for insufficient observation | Phase 7.1 audit |
