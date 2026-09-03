# BahasaCerdas — Investor Truth Matrix

## Version
1.0

## Last Updated
September 3, 2026

## Purpose

Every investor-facing metric is classified by availability and trustworthiness.
No metric is presented as "available" without an auditable source.

---

## Classification

| Code | Meaning |
|------|---------|
| **AVAILABLE** | Metric can be calculated from existing production data with high confidence |
| **DERIVABLE** | Metric can be approximated but has known limitations |
| **INSUFFICIENT** | Underlying data exists but is not yet sufficient for reliable calculation |
| **NOT IMPLEMENTED** | Metric is not currently calculated or displayed |

---

## User Metrics

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| Total Users | AVAILABLE | `User.count()` | count(*) | All registered accounts |
| Total Murid | AVAILABLE | `User.count(role=MURID)` | count(*) | — |
| Total Guru | AVAILABLE | `User.count(role=GURU)` | count(*) | Includes founders |
| New Users (7d) | AVAILABLE | `User.count(createdAt>=now-7d)` | count(*) | — |
| New Users (30d) | AVAILABLE | `User.count(createdAt>=now-30d)` | count(*) | — |
| User Growth MoM | DERIVABLE | Compare new30d periods | (current30d - prev30d) / prev30d | Previous period may be 0 for early-stage product |

## Engagement Metrics

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| DAU | AVAILABLE | `XPTransaction.groupBy(userId) today` | distinct(userId) | XP earning = proxy for engagement, not all activities earn XP |
| WAU | AVAILABLE | `XPTransaction.groupBy(userId) 7d` | distinct(userId) | Same caveat as DAU |
| MAU | AVAILABLE | `XPTransaction.groupBy(userId) 30d` | distinct(userId) | Same caveat as DAU |
| DAU/MAU Ratio | AVAILABLE | dau / mau | ratio | Meaningful only when MAU > 0 |
| Learning Activity | AVAILABLE | `UserUnitProgress.count(completed=true, 7d)` | count(*) | Counts completions, not unique learners |
| Learning Completions (7d) | AVAILABLE | `UserUnitProgress.count(completed=true, 7d)` | count(*) | — |
| UKBI Sessions (7d) | AVAILABLE | `ProgresKompetensi.count(startedAt>=now-7d)` | count(*) | — |
| Karya Created (7d) | AVAILABLE | `StudentKarya.count(createdAt>=now-7d)` | count(*) | — |
| AI Generations (7d) | AVAILABLE | `AIUsage.count(createdAt>=now-7d)` | count(*) | — |

## Retention Metrics

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| D7 Retention | AVAILABLE | Cohort × XPTransaction | cohort active on day+7 / cohort size | Requires ≥7 days since cohort registration |
| D30 Retention | AVAILABLE | Cohort × XPTransaction | cohort active on day+30 / cohort size | Requires ≥30 days since cohort registration |
| Cohort Trend | DERIVABLE | Compare D7 across cohorts | Visual trend only | Not statistically rigorous |

## Premium Metrics

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| Active Premium | AVAILABLE | `User.count(isPremium, premiumUntil>now)` | count(*) | Canonical entitlement state |
| Murid Premium | AVAILABLE | `User.count(isPremium, premiumUntil>now, role=MURID)` | count(*) | — |
| Guru Premium | AVAILABLE | `User.count(isPremium, premiumUntil>now, role=GURU)` | count(*) | — |
| Trial Active | AVAILABLE | `User.count(role=GURU, trialEndsAt>now)` | count(*) | — |
| Premium Conversion | AVAILABLE | guruPremium / (totalGuru - founders) × 100 | percent | Guru-only denominator |

## Financial Metrics

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| MRR | AVAILABLE | Active Premium × plan normalization | Σ MRR_CONTRIBUTION | From active entitlements, not transaction cash |
| MRR Breakdown | AVAILABLE | calculateMRRBreakdown() | murid/guru × monthly/yearly | — |
| Cash Collected (30d) | AVAILABLE | `Transaksi.aggregate(SUCCESS, 30d)` | sum(amount) | — |
| Cash Collected (All-Time) | AVAILABLE | `Transaksi.aggregate(SUCCESS)` | sum(amount) | — |
| Premium Transaction Count (30d) | AVAILABLE | `Transaksi.count(SUCCESS, 30d)` | count(*) | — |
| Pending Transactions | AVAILABLE | `Transaksi.count(PENDING)` | count(*) | — |
| MRR Trend | INSUFFICIENT | Requires historical MRR snapshots | — | No snapshot infrastructure; return null |
| MRR Growth MoM | INSUFFICIENT | Requires historical MRR snapshots | — | Same as above |
| New MRR / Expansion / Contraction / Churn | INSUFFICIENT | Requires per-user entitlement tracking over time | — | Cannot derive from current data alone |
| ARPU | INSUFFICIENT | MRR / activePremiumUsers | — | Denominator ambiguous across plans |
| LTV | NOT IMPLEMENTED | Requires retention × revenue model | — | No defensible basis yet |
| CAC | NOT IMPLEMENTED | Requires acquisition spend data | — | Not tracked |

## Revenue Dynamics

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| Paid User Growth | DERIVABLE | Count new successful premium transactions per period | count(*) | Does not distinguish new vs. upgrade |
| Paid User Churn | INSUFFICIENT | Requires tracking premium expiry events | — | Cannot reliably calculate without historical snapshots |
| Net Revenue Retention | NOT IMPLEMENTED | Requires cohort-level revenue tracking | — | Not possible with current data model |

## Trust & Operations

| Metric | Status | Source | Formula | Caveat |
|--------|--------|--------|---------|--------|
| Payment Health | AVAILABLE | Transaksi × User mismatch analysis | count affected | — |
| Data Quality | AVAILABLE | 7-check audit system | critical/warning/info | — |
| Premium Reconciliation | AVAILABLE | User.isPremium vs. qualifying transaction | mismatch detection | — |

---

## Summary

| Status | Count |
|--------|-------|
| AVAILABLE | 30 |
| DERIVABLE | 3 |
| INSUFFICIENT | 5 |
| NOT IMPLEMENTED | 3 |

**Key insight**: The current database truthfully supports ~30 investor metrics. The main gaps are MRR trend/history (needs snapshots) and advanced financial metrics (LTV, CAC, NRR).
