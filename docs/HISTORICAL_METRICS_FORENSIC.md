# BahasaCerdas — Historical Metrics Forensic & Architecture Design

## Version
1.0

## Last Updated
September 3, 2026

## Purpose

Forensic audit of existing data model recoverability and architecture design for historical business metrics. **This is a design document — no implementation, no migration, no production mutation.**

---

## 1. Data Model Forensic Inventory

### Classification Key

| Class | Meaning |
|-------|---------|
| **IMMUTABLE** | Record is append-only; fields never overwritten after creation |
| **MUTABLE** | Fields are overwritten (current state, not historical) |
| **APPEND-ONLY** | New rows added; existing rows may update status but event is preserved |
| **DERIVED** | Computed from other data; not independently trustworthy for history |

### 1A. Event / Append-Only Tables (Historical Truth)

These tables contain **immutable event records** with `createdAt` timestamps. They are the foundation for reconstructing historical metrics.

| Table | Class | Key Fields | Historical Value |
|-------|-------|------------|------------------|
| `Transaksi` | APPEND-ONLY | userId, type, amount, status, createdAt | **Payment history** — every transaction recorded. Status transitions preserved. |
| `XPTransaction` | IMMUTABLE | userId, source, amount, createdAt, reference | **Activity events** — unique per (userId, source, reference). DAU/WAU/MAU source. |
| `XpLedger` | IMMUTABLE | userId, amount, source, createdAt | XP balance history. |
| `CoinTransaction` | IMMUTABLE | userId, amount, reason, createdAt | Coin flow history. |
| `AIUsage` | IMMUTABLE | userId, feature, provider, tokens, costUSD, createdAt, bulan | AI usage history. |
| `PlayerActivity` | IMMUTABLE | userId, type, skill, xp, coin, createdAt | Granular learning activity events. |
| `LearningJourney` | IMMUTABLE | userId, dayKey, type, title, createdAt | Daily learning timeline. |
| `DailyAction` | APPEND-ONLY | userId, date, source, status, isCorrect, createdAt | Daily practice activity. |
| `UserUnitProgress` | APPEND-ONLY | userId, unitId, completed, completedAt | Learning completion history. `completedAt` is immutable once set. |
| `ProgresKompetensi` | APPEND-ONLY | userId, paketId, status, startedAt, finishedAt | Assessment session history. |
| `AdminPaymentAuditLog` | IMMUTABLE | adminUserId, targetUserId, action, createdAt | Payment admin actions. |
| `AdminQuotaAuditLog` | IMMUTABLE | adminUserId, targetUserId, action, createdAt | Quota admin actions. |
| `TeacherCommission` | APPEND-ONLY | teacherId, studentId, amount, status, createdAt | Commission events. |
| `TeacherPayoutEvent` | APPEND-ONLY | payoutId, action, createdAt | Payout lifecycle events. |
| `TeacherAttributionEvent` | IMMUTABLE | attributionId, action, createdAt | Attribution events. |
| `StudentKarya` | APPEND-ONLY | userId, type, createdAt | Student creative work events. |
| `Karya` | APPEND-ONLY | sellerId, type, price, createdAt | Marketplace product events. |
| `Pembelian` | APPEND-ONLY | buyerId, karyaId, amount, status, createdAt | Purchase events. |

### 1B. Mutable State Tables (Current State Only)

These tables contain **current state** that gets overwritten. They cannot reconstruct historical values without snapshots.

| Table | Class | Mutable Fields | Historical Value |
|-------|-------|---------------|------------------|
| `User` | MUTABLE | `isPremium`, `premiumPlan`, `premiumUntil`, `xp`, `level`, `streak`, `coins`, `totalLikes`, `totalViews`, `lastActiveAt` | **Current entitlement state only.** `premiumUntil` is overwritten on each renewal — cannot determine when user was premium in the past. |
| `Subscription` | MUTABLE | `status`, `currentPeriodStart`, `currentPeriodEnd`, `willRenew`, `cancelledAt` | Current subscription lifecycle. Status transitions overwrite previous. |
| `PremiumUsage` | MUTABLE | `used`, `updatedAt` | Current period usage counter. |
| `TeacherWallet` | MUTABLE | `balance`, `totalEarned` | Current wallet balance. |
| `TeacherPayoutProfile` | MUTABLE | payout config | Current payout config. |
| `TeacherRiskCase` | MUTABLE | `status`, severity | Current risk state. |
| `PlayerProfile` | MUTABLE | `currentRank`, skill levels | Current player state. |
| `GroupMember` | MUTABLE | `role` | Current group membership. `joinedAt` is immutable. |
| `Profile` | MUTABLE | various profile fields | Current profile state. |

### 1C. Derived / Computed Tables

| Table | Class | Notes |
|-------|-------|-------|
| `DailyQuest` | DERIVED | Regenerated daily; not trustworthy for historical analysis. |
| `WeeklySeason` | DERIVED | Leaderboard period definition. |
| `LeaderboardPeriodResult` | DERIVED | Computed from aggregated XP. |
| `Badge` / `UserBadge` | DERIVED | Badge definitions and grants. |
| `Achievement` / `UserAchievement` | DERIVED | Achievement definitions and grants. |

---

## 2. Historical Truth Audit — Per Metric

### 2A. User Growth

| Metric | Recoverable? | Source | Confidence | Earliest Reliable Date |
|--------|-------------|--------|------------|----------------------|
| Total users by day | ✅ FULLY RECONSTRUCTABLE | `User.createdAt` GROUP BY date | HIGH | First registration |
| New users 7d/30d | ✅ FULLY RECONSTRUCTABLE | `User.createdAt` WHERE createdAt >= X | HIGH | First registration |
| Users by role | ✅ FULLY RECONSTRUCTABLE | `User.createdAt` + `User.role` | HIGH | First registration |
| Teacher growth | ✅ FULLY RECONSTRUCTABLE | `User.createdAt WHERE role='GURU'` | HIGH | First registration |
| Student growth | ✅ FULLY RECONSTRUCTABLE | `User.createdAt WHERE role='MURID'` | HIGH | First registration |

**Assessment**: User growth is fully reconstructable from `User.createdAt`. No snapshot needed. The `createdAt` field is set once at registration and never modified.

### 2B. Engagement

| Metric | Recoverable? | Source | Confidence | Caveat |
|--------|-------------|--------|------------|--------|
| DAU by day | ✅ FULLY RECONSTRUCTABLE | `XPTransaction` WHERE createdAt in day range, GROUP BY userId | HIGH | XP earning is the canonical activity signal. Not all activities earn XP. |
| WAU by week | ✅ FULLY RECONSTRUCTABLE | Same as DAU, 7-day window | HIGH | Same caveat |
| MAU by month | ✅ FULLY RECONSTRUCTABLE | Same as DAU, 30-day window | HIGH | Same caveat |
| DAU/MAU ratio | ✅ FULLY RECONSTRUCTABLE | Derived from DAU/MAU | HIGH | — |
| Learning completions by day | ✅ FULLY RECONSTRUCTABLE | `UserUnitProgress.completedAt` | HIGH | `completedAt` is immutable once set |
| UKBI sessions by day | ✅ FULLY RECONSTRUCTABLE | `ProgresKompetensi.startedAt` | HIGH | — |
| Karya created by day | ✅ FULLY RECONSTRUCTABLE | `StudentKarya.createdAt` | HIGH | — |
| AI generations by day | ✅ FULLY RECONSTRUCTABLE | `AIUsage.createdAt` | HIGH | — |

**Assessment**: All engagement metrics are fully reconstructable from append-only event tables. The canonical activity signal (`XPTransaction`) is immutable.

### 2C. Monetization

| Metric | Recoverable? | Source | Confidence | Caveat |
|--------|-------------|--------|------------|--------|
| Cash collected by day | ✅ FULLY RECONSTRUCTABLE | `Transaksi.amount WHERE status='SUCCESS' AND createdAt` | HIGH | Immutable event record |
| Cash collected by plan | ✅ FULLY RECONSTRUCTABLE | `Transaksi.type + amount WHERE status='SUCCESS'` | HIGH | `type` indicates plan |
| Cash collected by audience | ✅ FULLY RECONSTRUCTABLE | `Transaksi.type` (MURID_PREMIUM vs PREMIUM_UPGRADE) | HIGH | — |
| Transaction volume by day | ✅ FULLY RECONSTRUCTABLE | `Transaksi.count WHERE createdAt` | HIGH | — |
| Active premium by day | ⚠️ NOT RECONSTRUCTABLE | `User.isPremium + premiumUntil` | LOW | Fields are overwritten. Cannot determine historical premium state. |
| Murid Premium by day | ⚠️ NOT RECONSTRUCTABLE | Same | LOW | Same |
| Guru Premium by day | ⚠️ NOT RECONSTRUCTABLE | Same | LOW | Same |
| MRR by day | ⚠️ NOT RECONSTRUCTABLE | `calculateMRR()` uses current state | LOW | Cannot reconstruct historical MRR from current entitlement fields |
| MRR mix by day | ⚠️ NOT RECONSTRUCTABLE | Same | LOW | Same |
| Premium conversion by day | ⚠️ NOT RECONSTRUCTABLE | Requires active premium + total users | LOW | Active premium not reconstructable |
| Paid user count by day | ⚠️ PARTIALLY RECONSTRUCTABLE | `Transaksi.count(DISTINCT userId, SUCCESS)` | MEDIUM | Shows who *ever* paid, not who is *currently* paying |

**Assessment**: Cash/revenue metrics are fully reconstructable from immutable `Transaksi` records. Active premium, MRR, and conversion require snapshots because `User.isPremium/premiumUntil` are overwritten on each renewal.

### 2D. Retention

| Metric | Recoverable? | Source | Confidence | Caveat |
|--------|-------------|--------|------------|--------|
| D7 retention by cohort | ✅ FULLY RECONSTRUCTABLE | `User.createdAt` (cohort) × `XPTransaction` (activity on day+7) | HIGH | Both tables immutable |
| D30 retention by cohort | ✅ FULLY RECONSTRUCTABLE | Same, day+30 | HIGH | Same |
| Cohort size by date | ✅ FULLY RECONSTRUCTABLE | `User.createdAt` GROUP BY date | HIGH | — |
| Retention trend | ✅ FULLY RECONSTRUCTABLE | Compare D7 across cohorts | HIGH | — |

**Assessment**: Retention is fully reconstructable. Both source tables (User for cohort, XPTransaction for activity) are immutable.

### 2E. Advanced Metrics

| Metric | Recoverable? | Source | Confidence | Required Future Source |
|--------|-------------|--------|------------|----------------------|
| Churn (premium) | ❌ NOT RECONSTRUCTABLE | Requires knowing when premium expired in the past | LOW | Premium expiry event log OR daily snapshot |
| Churned MRR | ❌ NOT RECONSTRUCTABLE | Requires historical MRR + churn events | LOW | Daily MRR snapshot |
| Expansion MRR | ❌ NOT RECONSTRUCTABLE | Requires historical MRR per user | LOW | Daily MRR snapshot per user |
| Contraction MRR | ❌ NOT RECONSTRUCTABLE | Same | LOW | Daily MRR snapshot per user |
| NRR | ❌ NOT RECONSTRUCTABLE | Requires churn + expansion data | LOW | Daily MRR snapshot + cohort tracking |
| LTV | ❌ NOT RECONSTRUCTABLE | Requires retention × revenue model | LOW | Retention cohorts + MRR snapshots |
| ARPU | ⚠️ PARTIALLY | Cash / users — but period definition ambiguous | MEDIUM | Explicit period definition + snapshots |
| CAC | ❌ NOT RECONSTRUCTABLE | No acquisition spend data tracked | NONE | Acquisition cost tracking system |

---

## 3. Source-of-Truth Classification

| Metric | Current Source | Historical Source | Recoverability | Confidence | Required Future Source |
|--------|---------------|-------------------|----------------|------------|----------------------|
| Total Users | `User.count()` | `User.createdAt` | FULLY RECONSTRUCTABLE | HIGH | None (already available) |
| New Users (7d/30d) | `User.count(createdAt>=X)` | `User.createdAt` | FULLY RECONSTRUCTABLE | HIGH | None |
| DAU | `XPTransaction` today | `XPTransaction` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| WAU | `XPTransaction` 7d | `XPTransaction` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| MAU | `XPTransaction` 30d | `XPTransaction` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| D7 Retention | Cohort × XPTransaction | Same, historical | FULLY RECONSTRUCTABLE | HIGH | None |
| D30 Retention | Cohort × XPTransaction | Same, historical | FULLY RECONSTRUCTABLE | HIGH | None |
| Cash Collected | `Transaksi.aggregate` | `Transaksi` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| Cash by Plan | `Transaksi.type + amount` | `Transaksi` by day + type | FULLY RECONSTRUCTABLE | HIGH | None |
| Transaction Volume | `Transaksi.count` | `Transaksi` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| Active Premium | `User.isPremium + premiumUntil` | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| Murid Premium | Same | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| Guru Premium | Same | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| MRR | `calculateMRR()` | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| MRR Mix | `calculateMRRBreakdown()` | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| Premium Conversion | `guruPremium / eligible` | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| Paid Users (current) | Derived from active premium | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| Learning Completions | `UserUnitProgress.completedAt` | `UserUnitProgress` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| UKBI Sessions | `ProgresKompetensi.startedAt` | `ProgresKompetensi` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| Karya Activity | `StudentKarya.createdAt` | `StudentKarya` by day | FULLY RECONSTRUCTABLE | HIGH | None |
| Churn | **NOT CALCULATED** | **NOT AVAILABLE** | EVENT HISTORY REQUIRED | N/A | Premium expiry events OR snapshots |
| Churned MRR | **NOT CALCULATED** | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot |
| NRR | **NOT CALCULATED** | **NOT AVAILABLE** | SNAPSHOT REQUIRED | N/A | Daily MetricSnapshot + cohort |
| LTV | **NOT CALCULATED** | **NOT AVAILABLE** | NOT RECONSTRUCTABLE | N/A | Retention + Revenue model |
| CAC | **NOT CALCULATED** | **NOT AVAILABLE** | NOT RECONSTRUCTABLE | N/A | Acquisition tracking |

---

## 4. Snapshot vs Event Architecture

### Approach A: Periodic Snapshots

**Concept**: Daily row per metric, append-only.

```
MetricSnapshot {
  businessDate: Date      // WIB calendar day
  metricKey: string       // "mrr", "active_premium", "dau", etc.
  value: number           // metric value at end of day
  breakdown: Json?        // optional breakdown (plan mix, role split)
  calculationVersion: string
  generatedAt: DateTime
}
```

**Pros**: Simple, queryable, handles any metric, versionable.
**Cons**: Storage grows linearly, calculation must be correct at snapshot time.

### Approach B: Immutable Business Events

**Concept**: Record every state change as an event.

```
PremiumActivated { userId, plan, source, activatedAt }
PremiumExpired { userId, plan, expiredAt }
PaymentSucceeded { userId, type, amount, plan, transaksiId, occurredAt }
```

**Pros**: Complete audit trail, supports churn/expansion/contraction analysis.
**Cons**: Requires event sourcing infrastructure, complex to query current state, harder to implement for derived metrics.

### Approach C: Both

**Concept**: Events for business state changes + snapshots for derived metrics.

**Recommended**: This is the correct architecture for BahasaCerdas.

### Per-Metric Architecture Recommendation

| Metric | Recommended Source | Rationale |
|--------|-------------------|-----------|
| User Growth | **EXISTING DATA** (`User.createdAt`) | Already immutable, no snapshot needed |
| DAU/WAU/MAU | **EXISTING DATA** (`XPTransaction`) | Already immutable, no snapshot needed |
| D7/D30 Retention | **EXISTING DATA** (cohort × XP) | Already immutable, no snapshot needed |
| Cash Collected | **EXISTING DATA** (`Transaksi`) | Already immutable, no snapshot needed |
| Learning Activity | **EXISTING DATA** (`UserUnitProgress`, `ProgresKompetensi`) | Already immutable, no snapshot needed |
| Active Premium | **SNAPSHOT** | `User.isPremium/premiumUntil` overwritten |
| MRR | **SNAPSHOT** | Derived from active premium state |
| MRR Mix | **SNAPSHOT** | Derived from active premium + plan |
| Premium Conversion | **SNAPSHOT** | Requires active premium |
| Paid Users | **SNAPSHOT** | Requires active premium |
| Churn | **BOTH** — Events for premium expiry + snapshots for MRR | Events tell you when; snapshots tell you the financial impact |
| Churned MRR | **SNAPSHOT** | Requires historical MRR |
| NRR | **SNAPSHOT** | Requires churn + expansion MRR |
| LTV | **NOT NOW** | Requires retention model + revenue data. Deferred. |
| CAC | **NOT NOW** | Requires acquisition tracking. Deferred. |

---

## 5. Snapshot Granularity

### Evaluation

| Granularity | Accuracy | Investor Usefulness | Storage | Query Cost | Month-End State | MoM Growth |
|-------------|----------|--------------------|---------|------------|-----------------|--------------------|
| **Daily** | High — captures intra-month changes | High — enables trend analysis | ~365 rows/metric/year | Low — simple WHERE date=X | Exact | Exact |
| **Weekly** | Medium — misses mid-week changes | Medium — limited granularity | ~52 rows/metric/year | Low | Approximate | Approximate |
| **Monthly** | Low — only captures month-end | Low — too coarse for trend | ~12 rows/metric/year | Very low | Exact (if captured on last day) | Exact |

### Recommendation: DAILY SNAPSHOT

**Reasoning**:

1. **Investor accuracy**: Daily snapshots enable precise MRR trend analysis, churn detection, and anomaly investigation.
2. **Month-end state**: Daily snapshots naturally capture month-end state (last day of month).
3. **Storage cost**: Negligible. ~15 metrics × 365 days × 4 bytes ≈ 22 KB/year. Even with breakdowns, < 1 MB/year.
4. **Query simplicity**: `SELECT * FROM MetricSnapshot WHERE metricKey = 'mrr' AND businessDate >= '2026-01-01' ORDER BY businessDate` — trivial.
5. **Timezone correctness**: Daily WIB boundary is clean — no intra-day timezone ambiguity.
6. **Anomaly detection**: Daily granularity enables detecting sudden drops/spikes that monthly would miss.

**Do NOT use monthly-only**: Too coarse for investor-grade analysis. A monthly snapshot on Dec 31 cannot tell you whether MRR was stable all month or crashed on Dec 15.

**Do NOT use weekly-only**: Week boundaries don't align with month boundaries, making MoM calculations ambiguous.

---

## 6. Timezone Contract

### Snapshot Timestamp Rules

| Concept | Definition |
|---------|-----------|
| **Snapshot businessDate** | WIB calendar day (YYYY-MM-DD in Asia/Jakarta) |
| **Snapshot generatedAt** | UTC timestamp when the snapshot was computed |
| **Day boundary** | 00:00 WIB = 17:00 UTC (previous day) |
| **Month boundary** | 1st of month, 00:00 WIB |
| **UTC storage** | All timestamps stored in UTC in the database |
| **WIB reporting** | All UI/analytics display in WIB |

### Implementation

Reuse existing `lib/admin/analytics-timezone.ts` helpers:
- `wibTodayStart()` — today's 00:00 WIB in UTC
- `wibDaysAgo(n)` — n days ago in UTC
- `utcToWibDate()` — convert UTC to WIB date components
- `wibDayToUtcRange()` — get UTC start/end for a WIB day

**Do NOT introduce a second timezone implementation.**

---

## 7. Snapshot Immutability

### Principle

Historical metric snapshots should be **append-only / immutable**.

If a calculation changes later:

1. **DO NOT** silently rewrite historical truth
2. **DO** add a new `calculationVersion` field
3. **DO** document what changed and why
4. **DO** preserve the old snapshot as historical record

### Schema Design

```prisma
model MetricSnapshot {
  id                 String   @id @default(cuid())
  businessDate       DateTime // WIB calendar day (stored as UTC midnight of that WIB day)
  metricKey          String   // "mrr", "active_premium", "dau", "cash_collected_30d", etc.
  value              Float    // metric value
  breakdown          Json?    // optional structured breakdown
  calculationVersion String   @default("1.0") // version of the calculation logic
  generatedAt        DateTime @default(now()) // when this snapshot was computed

  @@unique([businessDate, metricKey, calculationVersion])
  @@index([metricKey, businessDate])
  @@index([businessDate])
}
```

### Versioning Strategy

- **v1.0**: Initial implementation
- **v1.1**: Minor formula correction (e.g., fixing edge case)
- **v2.0**: Major formula change (e.g., changing MRR definition)

When a formula changes:
1. New snapshots use new `calculationVersion`
2. Old snapshots retain old version
3. Queries can filter by version or use latest
4. Documentation explains version differences

---

## 8. Backfill Strategy

### 8A. Fully Reconstructable (No Snapshot Needed)

These metrics can be backfilled from existing data with HIGH confidence.

| Metric | Source | Earliest Date | Caveat |
|--------|--------|---------------|--------|
| Daily new users | `User.createdAt` | First registration | — |
| Daily new users by role | `User.createdAt` + `role` | First registration | — |
| Daily DAU | `XPTransaction.createdAt` | First XP transaction | Before XP system: DAU=0 |
| Daily WAU | Same, 7-day window | First XP + 7 days | — |
| Daily MAU | Same, 30-day window | First XP + 30 days | — |
| Daily learning completions | `UserUnitProgress.completedAt` | First completion | — |
| Daily UKBI sessions | `ProgresKompetensi.startedAt` | First session | — |
| Daily Karya created | `StudentKarya.createdAt` | First karya | — |
| Daily cash collected | `Transaksi WHERE status='SUCCESS'` | First SUCCESS tx | — |
| Daily cash by plan | Same + `type` | First SUCCESS tx | — |
| D7/D30 retention cohorts | `User.createdAt` × `XPTransaction` | First cohort + 7/30 days | — |

### 8B. NOT Reconstructable (Snapshot Required Going Forward)

| Metric | Why Not Reconstructable | Backfill Feasibility |
|--------|------------------------|---------------------|
| Active Premium (historical) | `User.isPremium/premiumUntil` overwritten | ❌ DO NOT BACKFILL — current fields do not reflect historical state |
| MRR (historical) | Derived from active premium | ❌ DO NOT BACKFILL |
| MRR Mix (historical) | Same | ❌ DO NOT BACKFILL |
| Premium Conversion (historical) | Requires active premium | ❌ DO NOT BACKFILL |
| Churn | Requires knowing when premium expired | ❌ DO NOT BACKFILL from current data |
| Churned MRR | Requires historical MRR | ❌ DO NOT BACKFILL |
| NRR | Requires churn + expansion | ❌ DO NOT BACKFILL |

**Critical warning**: Do NOT attempt to reconstruct historical MRR by looking at `premiumUntil` dates. A user with `premiumUntil = 2026-10-01` today might have had their premium extended manually — the current `premiumUntil` does not tell you when they originally became premium or what their plan was at any historical point.

### 8C. Possible With Caveat (Partial Reconstruction)

| Metric | Reconstruction Method | Confidence | Caveat |
|--------|----------------------|------------|--------|
| Historical paid users | `DISTINCT userId FROM Transaksi WHERE type IN (PREMIUM_UPGRADE, MURID_PREMIUM) AND status='SUCCESS'` | MEDIUM | Shows who *ever* paid, not who was *currently* premium on a given day |
| Historical premium transactions | `Transaksi WHERE type IN (...) AND status='SUCCESS'` | HIGH | Transaction records are immutable |

---

## 9. MRR Snapshot Design

### Future MRR Snapshot Contract

```ts
interface MrrSnapshotRecord {
  // Identity
  id: string
  businessDate: Date          // WIB calendar day (stored as UTC)

  // MRR values
  mrr: number                 // total MRR in Rp
  muridMonthly: number        // Murid monthly plan MRR
  muridYearly: number         // Murid yearly plan MRR (normalized /12)
  guruMonthly: number         // Guru monthly plan MRR
  guruYearly: number          // Guru yearly plan MRR (normalized /12)

  // Premium population
  activePremium: number       // total active premium users
  muridPremium: number        // active murid premium
  guruPremium: number         // active guru premium

  // Calculation metadata
  calculationVersion: string  // "1.0"
  generatedAt: Date           // UTC timestamp of computation
}
```

### Snapshot Generation Logic

```
1. Query active premium users (same as calculateMRR)
2. For each user, determine plan (same as detectPlanKey)
3. Sum MRR contributions
4. Write single MetricSnapshot row with metricKey="mrr"
5. Write breakdown as JSON in breakdown field
```

### Monthly Snapshot (Supplementary)

In addition to daily snapshots, generate a **monthly summary** on the 1st of each month:

```ts
interface MonthlyMrrSnapshot {
  month: string               // "2026-09"
  monthStartMrr: number       // MRR on 1st of month
  monthEndMrr: number         // MRR on last day of month
  avgMrr: number              // average daily MRR (if daily snapshots exist)
  newMrr: number              // MRR from new premium users this month
  churnedMrr: number          // MRR lost from expired premium this month
  netNewMrr: number           // newMrr - churnedMrr
  expansionMrr: number        // MRR from upgrades (monthly→yearly, murid→guru)
  contractionMrr: number      // MRR from downgrades
}
```

**Note**: `churnedMrr`, `expansionMrr`, `contractionMrr` require **event-level premium tracking** (PremiumActivated/PremiumExpired events) which does not yet exist. These fields should be populated only when event tracking is implemented. Until then, leave as `null`.

---

## 10. Event Tracking (Future Enhancement)

### Recommended Events

To support churn, expansion, and contraction analysis, the following events should be emitted in the future:

```ts
// Premium lifecycle events (recommended for future implementation)
interface PremiumActivated {
  userId: string
  plan: string                // "MURID_PREMIUM_MONTHLY", etc.
  source: string              // "PAYMENT", "ADMIN_GRANT", "TRIAL"
  transaksiId?: string        // link to payment if applicable
  activatedAt: Date           // WIB
}

interface PremiumExpired {
  userId: string
  plan: string
  reason: string              // "EXPIRED", "CANCELLED", "DOWNGRADED"
  expiredAt: Date
}

interface PremiumChanged {
  userId: string
  previousPlan: string
  newPlan: string
  changeType: string          // "UPGRADE", "DOWNGRADE", "RENEWAL"
  changedAt: Date
}
```

**These events do NOT exist yet.** They are recommended for Phase 10+ when churn/expansion/contraction analysis becomes a priority.

---

## 11. Storage Estimate

### Daily MetricSnapshot

| Metric | Rows/Day | Rows/Year | Size/Year (est.) |
|--------|----------|-----------|-----------------|
| mrr | 1 | 365 | ~50 KB |
| active_premium | 1 | 365 | ~50 KB |
| dau | 1 | 365 | ~50 KB |
| cash_collected_daily | 1 | 365 | ~50 KB |
| (15 metrics) | 15 | 5,475 | ~750 KB |

**Total**: < 1 MB/year for all daily metrics. Negligible.

### Monthly Summary

| Metric | Rows/Month | Rows/Year | Size/Year |
|--------|-----------|-----------|-----------|
| mrr_monthly | 1 | 12 | ~5 KB |
| (10 metrics) | 10 | 120 | ~50 KB |

**Total**: Negligible.

---

## 12. Query Patterns

### Historical MRR Trend

```sql
SELECT businessDate, value as mrr
FROM MetricSnapshot
WHERE metricKey = 'mrr'
  AND businessDate >= '2026-01-01'
ORDER BY businessDate
```

### Month-over-Month MRR Growth

```sql
WITH monthly AS (
  SELECT
    DATE_TRUNC('month', businessDate) as month,
    MAX(CASE WHEN businessDate = DATE_TRUNC('month', businessDate) THEN value END) as start_mrr,
    MAX(CASE WHEN businessDate = (DATE_TRUNC('month', businessDate) + INTERVAL '1 month' - INTERVAL '1 day')::date THEN value END) as end_mrr
  FROM MetricSnapshot
  WHERE metricKey = 'mrr'
  GROUP BY DATE_TRUNC('month', businessDate)
)
SELECT
  month,
  start_mrr,
  end_mrr,
  ROUND((end_mrr - start_mrr) / NULLIF(start_mrr, 0) * 100, 1) as growth_pct
FROM monthly
ORDER BY month
```

### Daily Active Premium Trend

```sql
SELECT businessDate, value as active_premium
FROM MetricSnapshot
WHERE metricKey = 'active_premium'
  AND businessDate >= '2026-06-01'
ORDER BY businessDate
```

---

## 13. Migration Strategy (Future — Not This Phase)

### When Ready to Implement

1. **Create `MetricSnapshot` model** in Prisma schema
2. **Create snapshot generator** in `lib/admin/snapshot-generator.ts`
3. **Create cron job** or scheduled Vercel cron to run daily at 23:59 WIB
4. **Backfill user growth + engagement + cash** from existing data (safe)
5. **DO NOT backfill MRR/premium** from current state (unsafe)
6. **Start collecting daily snapshots** from implementation date forward
7. **Update executive service** to use snapshots for trend data
8. **Update investor growth engine** to show historical trends

### Rollout Order

| Phase | Action | Risk |
|-------|--------|------|
| 9.1 | Create MetricSnapshot schema | None (additive) |
| 9.2 | Build snapshot generator | None (new service) |
| 9.3 | Backfill reconstructable metrics | LOW (append-only, idempotent) |
| 9.4 | Start daily collection | None (new cron) |
| 9.5 | Wire to executive dashboard | LOW (additive, old paths preserved) |
| 9.6 | Enable MRR trend display | LOW (only when data available) |

---

## 14. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Snapshot generator fails to run | MEDIUM | Alert on missing day. Manual backfill possible from events. |
| Snapshot calculation is wrong | MEDIUM | `calculationVersion` enables correction without data loss. |
| Timezone drift | LOW | Reuse existing WIB helpers. No new timezone code. |
| Storage growth | NEGLIGIBLE | < 1 MB/year. |
| Backfill produces incorrect historical MRR | HIGH | **DO NOT backfill MRR.** Only forward-fill from implementation date. |
| Event tracking not implemented | MEDIUM | Churn/expansion/contraction metrics deferred until events exist. |

---

## 15. Summary

### What CAN Be Reconstructed Today (No New Infrastructure)

- ✅ User growth (daily, by role)
- ✅ DAU / WAU / MAU (daily)
- ✅ D7 / D30 retention (by cohort)
- ✅ Cash collected (daily, by plan, by audience)
- ✅ Learning completions (daily)
- ✅ UKBI sessions (daily)
- ✅ Karya activity (daily)
- ✅ Transaction volume (daily)

### What REQUIRES Snapshots (New Infrastructure Needed)

- ❌ Active Premium (historical)
- ❌ MRR (historical)
- ❌ MRR Mix (historical)
- ❌ Premium Conversion (historical)
- ❌ Paid Users — current (historical)
- ❌ Churn / Churned MRR
- ❌ NRR

### What CANNOT Be Done Even With Snapshots

- ❌ LTV (requires retention + revenue model)
- ❌ CAC (requires acquisition cost tracking)
- ❌ NRR without event tracking (requires PremiumActivated/PremiumExpired events)

### Key Insight

**60% of investor metrics are already reconstructable from existing immutable data.** The remaining 40% (primarily monetization state metrics) require daily snapshots starting from implementation date. No historical reconstruction of MRR/premium state is safe or recommended.
