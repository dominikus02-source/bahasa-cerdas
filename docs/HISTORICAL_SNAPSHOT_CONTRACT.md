# BahasaCerdas — Historical Snapshot Contract

## Version
1.0

## Last Updated
September 3, 2026

## Purpose

Define the exact contract for daily historical metric snapshots before any implementation begins. This document answers:

1. What does a snapshot dated 2026-09-03 mean?
2. What fields are stored?
3. How is immutability guaranteed?
4. How is idempotency guaranteed?
5. How is reproducibility guaranteed?

**This is a design document — no implementation, no migration, no production mutation.**

---

## 1. Re-Audit of Phase 9.0

### Phase 9.0 Assumptions Verified

| Assumption | Verified? | Evidence |
|-----------|-----------|----------|
| `User.isPremium/premiumUntil` is mutable | ✅ YES | Webhook sets `isPremium: true, premiumPlan, premiumUntil` on settlement/capture. Stack logic overwrites on renewal. |
| `Transaksi` is append-only | ✅ YES | `createdAt` immutable. `status` transitions preserved. |
| `XPTransaction` is immutable | ✅ YES | `@@unique([userId, source, reference])` idempotency. No update path. |
| `UserUnitProgress.completedAt` is immutable once set | ✅ YES | Set once on completion, never cleared. |
| MRR cannot be reconstructed from historical `premiumUntil` | ✅ YES | `premiumUntil` stacks on renewal — current value does not reflect any historical point. |
| `Subscription` model exists but is secondary | ✅ YES | `lib/premium-economy/plans.ts` reads `User.isPremium/premiumUntil` as primary. `Subscription` is a Midtrans sync target but not the canonical source for MRR. |

### Phase 9.0 Correction

Phase 9.0 states `Subscription` model has `currentPeriodStart/End` which could theoretically help. **Correction**: The `Subscription` model is sparsely populated and not the canonical source. Do NOT rely on it for historical MRR reconstruction. The snapshot approach remains the only safe path.

---

## 2. Point-in-Time Semantics

### Chosen Semantic: END-OF-DAY WIB

A snapshot for `businessDate = 2026-09-03` represents:

**The state of the metric at the end of September 3, 2026 in Asia/Jakarta.**

Formally:

```
businessDate = 2026-09-03
snapshotMoment = 2026-09-03 23:59:59.999 WIB
               = 2026-09-03 16:59:59.999 UTC
```

### Why End-of-Day (Not Start-of-Day)

| Consideration | Start-of-Day | End-of-Day | Winner |
|--------------|-------------|------------|--------|
| **MRR**: premium activated at 14:00 WIB on Sep 3 | Not captured until Sep 4 snapshot | Captured in Sep 3 snapshot | End-of-day |
| **Payment webhook**: settlement at 23:30 WIB | Missed entirely for that day | Captured | End-of-day |
| **Month-end**: premium expires Sep 30 23:59 WIB | Would show as expired on Sep 30 | Correctly shows as active on Sep 30 | End-of-day |
| **MoM comparison**: Sep 30 vs Oct 1 | Sep 30 start = Sep 29 end state | Sep 30 end = correct month-end | End-of-day |
| **Query compatibility**: existing `wibDayToUtcRange` returns `[start, end)` | Queries use `>= start AND < end` | End-of-day state = all records in `[start, end)` | Both work |

**End-of-day is correct** because:
1. It captures all events that occurred during the WIB calendar day
2. Month-end snapshots correctly reflect the final state of the month
3. Late webhooks (common in payment systems) are still captured
4. It aligns with how `wibDayToUtcRange` already works — the range `[start, end)` covers the full day

### Formal Definition

```
For a given businessDate D in WIB:

  wibDayStart(D) = D 00:00:00.000 WIB = (D - 7h) UTC
  wibDayEnd(D)   = D 23:59:59.999 WIB = (D - 7h + 23:59:59.999) UTC

  snapshotQueryWindow = [wibDayStart(D), wibDayEnd(D)]

  The snapshot value represents the aggregated metric state
  considering all events within snapshotQueryWindow,
  plus the cumulative state from all prior events.
```

---

## 3. Timezone Contract

### Canonical Helpers (Reuse Only)

From `lib/admin/analytics-timezone.ts`:

| Function | Purpose | Use in Snapshots |
|----------|---------|-----------------|
| `wibTodayStart(now)` | 00:00 WIB today → UTC | Generate today's snapshot |
| `wibDaysAgo(n, now)` | N WIB days ago → UTC | Historical queries |
| `utcToWibDate(utc)` | UTC → WIB year/month/day | Convert businessDate |
| `wibDayToUtcRange(wibDay)` | WIB day → UTC [start, end) | Query window for a day |
| `ANALYTICS_TIMEZONE` | `"Asia/Jakarta"` constant | Documentation reference |

### Snapshot Timestamp Definitions

| Field | Definition | Storage | Example |
|-------|-----------|---------|---------|
| `businessDate` | WIB calendar day at 00:00, stored as UTC equivalent | `DateTime` (UTC) | `2026-09-03T00:00:00.000Z` = "start of Sep 3 WIB" |
| `generatedAt` | UTC timestamp when snapshot was computed | `DateTime` (UTC) | `2026-09-04T00:05:00.000Z` = "computed 5 min after midnight" |
| `snapshotWindow` | The query window used to compute the snapshot | Derived (not stored) | `[2026-09-02T17:00:00Z, 2026-09-03T16:59:59.999Z]` |

### Boundary Examples

| Scenario | businessDate (WIB) | Stored as UTC | Query Window (UTC) |
|----------|-------------------|---------------|-------------------|
| Normal day | 2026-09-03 | 2026-09-03T00:00:00Z | [2026-09-02T17:00:00Z, 2026-09-03T17:00:00Z) |
| Month-end | 2026-09-30 | 2026-09-30T00:00:00Z | [2026-09-29T17:00:00Z, 2026-09-30T17:00:00Z) |
| Month-start | 2026-10-01 | 2026-10-01T00:00:00Z | [2026-09-30T17:00:00Z, 2026-10-01T17:00:00Z) |
| Year-end | 2026-12-31 | 2026-12-31T00:00:00Z | [2026-12-30T17:00:00Z, 2026-12-31T17:00:00Z) |
| Year-start | 2027-01-01 | 2027-01-01T00:00:00Z | [2026-12-31T17:00:00Z, 2027-01-01T17:00:00Z) |

### Day Rollover

When the snapshot generator runs at 00:05 WIB on Sep 4:
- It generates the snapshot for `businessDate = 2026-09-03`
- It queries events in the window `[Sep 3 00:00 WIB, Sep 3 23:59:59.999 WIB]`
- It computes cumulative state including all prior history

### Month Rollover

Month-end snapshots (Sep 30) are especially important:
- They represent the final MRR for the month
- Used for MoM growth calculations
- Must capture any late-month premium activations/expirations

---

## 4. What Belongs in the Snapshot?

### Decision Framework

For each candidate metric, answer:

1. Is this metric **state-derived** (requires current DB state that changes)?
2. Is this metric **event-derived** (can be reconstructed from immutable history)?
3. Is this metric ** investor-facing** (needed for trend analysis)?

| Category | Storage Decision | Rationale |
|----------|-----------------|-----------|
| State-derived + investor-facing | **SNAPSHOT FIELD** | Cannot be reconstructed from history |
| Event-derived + investor-facing | **DERIVED FROM EVENTS** | Already reconstructable; no snapshot needed |
| State-derived + not investor-facing | **NOT STORED** | Operational metric, not business truth |
| Event-derived + not investor-facing | **NOT STORED** | Already available via queries |

### Metric Classification

#### SNAPSHOT FIELDS (Must Be Stored)

These metrics depend on mutable User state that cannot be reconstructed.

| Metric | Why Snapshot Required | Source Field |
|--------|----------------------|-------------|
| `mrr` | Derived from `User.isPremium + premiumUntil + plan` — all mutable | `calculateMRR()` |
| `mrrMuridMonthly` | Part of MRR breakdown | `calculateMRRBreakdown()` |
| `mrrMuridYearly` | Part of MRR breakdown | `calculateMRRBreakdown()` |
| `mrrGuruMonthly` | Part of MRR breakdown | `calculateMRRBreakdown()` |
| `mrrGuruYearly` | Part of MRR breakdown | `calculateMRRBreakdown()` |
| `activePremium` | `User.isPremium + premiumUntil` — mutable | `User.count(isPremium, premiumUntil>now)` |
| `muridPremium` | Same | `User.count(isPremium, premiumUntil>now, role=MURID)` |
| `guruPremium` | Same | `User.count(isPremium, premiumUntil>now, role=GURU)` |

#### DERIVED FROM EVENTS (No Snapshot Needed)

These metrics can be reconstructed from immutable event tables.

| Metric | Source Table | Reconstruction |
|--------|-------------|---------------|
| `totalUsers` | `User.createdAt` | `count(*) WHERE createdAt <= dayEnd` |
| `muridUsers` | `User.createdAt + role` | `count(*) WHERE createdAt <= dayEnd AND role='MURID'` |
| `guruUsers` | `User.createdAt + role` | Same for GURU |
| `dau` | `XPTransaction.createdAt` | `count(DISTINCT userId) WHERE createdAt IN dayRange` |
| `wau` | `XPTransaction.createdAt` | Same, 7-day window |
| `mau` | `XPTransaction.createdAt` | Same, 30-day window |
| `cashCollectedDay` | `Transaksi.createdAt + status` | `sum(amount) WHERE status='SUCCESS' AND createdAt IN dayRange` |
| `cashCollected30d` | Same | Same, 30-day window |
| `cashCollectedAllTime` | Same | Same, all-time |
| `jalurCompletedDay` | `UserUnitProgress.completedAt` | `count(*) WHERE completed=true AND completedAt IN dayRange` |
| `ukbiSessionsDay` | `ProgresKompetensi.startedAt` | `count(*) WHERE startedAt IN dayRange` |
| `karyaCreatedDay` | `StudentKarya.createdAt` | `count(*) WHERE createdAt IN dayRange` |
| `premiumTxCount` | `Transaksi.createdAt + type + status` | `count(*) WHERE type IN (PREMIUM_UPGRADE, MURID_PREMIUM) AND status='SUCCESS'` |

#### NOT STORED

| Metric | Why Not Stored |
|--------|---------------|
| `d7Retention` | Derivable from cohort × XPTransaction. Complex but reconstructable. |
| `d30Retention` | Same |
| `conversionRate` | `guruPremium / (guruUsers - founders)` — all derivable |
| `aiGenerations` | `AIUsage.createdAt` — fully event-derived |
| `paymentHealth` | Derived from Transaksi × User — operational, not business truth |
| `dataQuality` | Operational metric |

### Snapshot Field Summary

The snapshot stores **8 state-derived metrics** that cannot be reconstructed from history. Everything else is derived from event tables or current queries.

---

## 5. MRR Snapshot Contract

### Why MRR Is the Most Critical Snapshot

MRR is:
1. The primary investor-facing financial metric
2. Derived entirely from mutable state (`User.isPremium/premiumUntil/plan`)
3. Impossible to reconstruct historically without snapshots
4. The basis for MoM growth, churn analysis, and revenue forecasting

### MRR Calculation (Snapshot Version)

The snapshot must use the **exact same calculation** as `calculateMRR()`:

```ts
// Pseudocode — NOT implementation
function calculateMrrForSnapshot(): MrrSnapshotData {
  const activeUsers = db.user.findMany({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false }
  });

  let mrr = 0, muridMonthly = 0, muridYearly = 0, guruMonthly = 0, guruYearly = 0;

  for (const user of activeUsers) {
    const planKey = detectPlanKey(user); // from latest SUCCESS transaction or user.premiumPlan
    const contribution = MRR_CONTRIBUTION[planKey];
    mrr += contribution;
    // ... breakdown accumulation
  }

  return { mrr, muridMonthly, muridYearly, guruMonthly, guruYearly,
           activePremium: activeUsers.length, muridPremium: ..., guruPremium: ... };
}
```

### MRR Snapshot Invariants

| Invariant | How Guaranteed |
|-----------|---------------|
| `mrr === muridMonthly + muridYearly + guruMonthly + guruYearly` | Sum verified at write time |
| `activePremium === muridPremium + guruPremium` | Sum verified at write time |
| Each user counted exactly once | Same logic as `calculateMRR()` — single query, no joins that could duplicate |
| Founders excluded | `isFounder: false` filter |
| Expired excluded | `premiumUntil > now` filter |
| Plan detection matches production | Same `detectPlanKey()` function |

### MRR Trend (After Snapshots Exist)

Once daily snapshots exist, MRR trend becomes:

```sql
SELECT
  businessDate,
  value as mrr,
  LAG(value) OVER (ORDER BY businessDate) as prevDayMrr,
  ROUND((value - LAG(value) OVER (ORDER BY businessDate)) / NULLIF(LAG(value) OVER (ORDER BY businessDate), 0) * 100, 1) as dailyGrowthPct
FROM MetricSnapshot
WHERE metricKey = 'mrr'
  AND businessDate >= now() - INTERVAL '30 days'
ORDER BY businessDate
```

**This is NOT implemented yet.** The current `comparisonAvailable: false` is correct.

---

## 6. Full Snapshot Schema Design

### Approach: Key-Value with JSON Breakdown

Rather than a wide table with many nullable columns, use a **key-value model** with optional JSON breakdown. This is:
- **Flexible**: Adding new metrics requires no schema migration
- **Queryable**: Simple `WHERE metricKey = 'mrr'` queries
- **Compact**: Only non-null metrics stored
- **Idempotent**: Same (businessDate, metricKey) = same row

### Prisma Model (Design Only — Not Implemented Yet)

```prisma
model MetricSnapshot {
  id                 String   @id @default(cuid())

  // Time contract
  businessDate       DateTime // WIB calendar day stored as UTC midnight of that WIB day
                             // e.g., "2026-09-03" WIB = 2026-09-03T00:00:00.000Z

  // Metric identity
  metricKey          String   // "mrr", "active_premium", "dau", "cash_collected_day", etc.

  // Metric value
  value              Float    // primary numeric value
  breakdown          Json?    // optional structured breakdown (plan mix, role split, etc.)

  // Audit trail
  calculationVersion String   @default("1.0") // version of calculation logic used
  generatedAt        DateTime @default(now()) // UTC timestamp when snapshot was computed

  @@unique([businessDate, metricKey]) // idempotent: same day + same metric = same row
  @@index([metricKey, businessDate])  // efficient time-series queries
  @@index([businessDate])             // efficient "all metrics for a day" queries
}
```

### Why Key-Value (Not Wide Table)

| Approach | Pros | Cons |
|----------|------|------|
| **Wide table** (one row per day, many columns) | Single row per day, easy to read | Nullable columns, schema migration for new metrics, hard to query individual metric history |
| **Key-value** (one row per metric per day) | Flexible, no migration for new metrics, efficient per-metric queries | More rows, slightly more complex aggregation |

**Key-value wins** because:
1. Adding a new metric (e.g., `arenaActiveUsers`) requires zero schema changes
2. Per-metric time-series queries are trivial: `WHERE metricKey = 'mrr' ORDER BY businessDate`
3. Storage cost difference is negligible (< 1 MB/year either way)
4. The `breakdown` JSON field handles structured data without additional columns

### Example Rows

```sql
-- September 3, 2026 snapshots
INSERT INTO MetricSnapshot (businessDate, metricKey, value, breakdown, calculationVersion, generatedAt) VALUES

-- MRR
('2026-09-03', 'mrr', 81250.00, '{"muridMonthly":19000,"muridYearly":15000,"guruMonthly":14000,"guruYearly":33250}', '1.0', '2026-09-04T00:05:00Z'),

-- Active Premium
('2026-09-03', 'active_premium', 3.00, '{"murid":1,"guru":2}', '1.0', '2026-09-04T00:05:00Z'),

-- User counts (for reference — reconstructable but useful in snapshot)
('2026-09-03', 'total_users', 100.00, '{"murid":80,"guru":20}', '1.0', '2026-09-04T00:05:00Z'),

-- DAU (reconstructable but expensive to query daily)
('2026-09-03', 'dau', 15.00, null, '1.0', '2026-09-04T00:05:00Z'),

-- Cash collected today
('2026-09-03', 'cash_collected_day', 120000.00, '{"guru":49000,"murid":71000}', '1.0', '2026-09-04T00:05:00Z');
```

---

## 7. MetricKey Registry

### Canonical Metric Keys

| metricKey | Value Type | Breakdown | Description |
|-----------|-----------|-----------|-------------|
| `mrr` | Rp (number) | `{ muridMonthly, muridYearly, guruMonthly, guruYearly }` | Monthly Recurring Revenue |
| `active_premium` | count | `{ murid, guru }` | Active premium users |
| `total_users` | count | `{ murid, guru, founder }` | Total registered users |
| `new_users_day` | count | `{ murid, guru }` | New registrations today |
| `dau` | count | null | Daily Active Users |
| `wau` | count | null | Weekly Active Users (trailing 7d) |
| `mau` | count | null | Monthly Active Users (trailing 30d) |
| `cash_collected_day` | Rp | `{ guru, murid, other }` | Cash received today |
| `cash_collected_30d` | Rp | null | Cash received trailing 30d |
| `cash_collected_all_time` | Rp | null | All-time cash received |
| `jalur_completed_day` | count | null | Learning units completed today |
| `ukbi_sessions_day` | count | null | UKBI sessions started today |
| `karya_created_day` | count | null | Student karya published today |
| `premium_tx_count_day` | count | null | Successful premium transactions today |
| `premium_conversion` | percent | null | Guru Premium conversion rate |

### Adding New Metrics

To add a new metric:
1. Add entry to this registry document
2. Add calculation in snapshot generator
3. No schema migration needed (key-value model)
4. Use `calculationVersion` to track formula changes

---

## 8. Idempotency Contract

### Guarantee

**Running the snapshot generator twice for the same businessDate produces the same result.**

### Implementation

The `@@unique([businessDate, metricKey])` constraint ensures:
- First write: INSERT succeeds
- Second write (idempotent retry): INSERT fails on unique constraint → upsert to same value
- No data duplication
- No incorrect values from double-runs

### Idempotency Window

| Scenario | Behavior |
|----------|----------|
| Generator runs at 00:05 WIB, runs again at 00:10 WIB | Second run overwrites with same value (idempotent) |
| Generator fails at 00:05 WIB, retries at 00:15 WIB | Retry writes same value (idempotent) |
| Generator runs for wrong day | Different businessDate → different row (no conflict) |
| Manual backfill for historical date | Different businessDate → different row (no conflict with daily) |

### Why Overwrite on Retry

Since the snapshot represents end-of-day state, and the generator runs shortly after midnight:
- Events during the day are complete
- Re-running captures the same final state
- Overwriting with the same value is safe and idempotent

---

## 9. Immutability Contract

### Principle

**Historical snapshots are append-only. Once written for a businessDate, they are never modified.**

### Enforcement

| Mechanism | Purpose |
|-----------|---------|
| Application-level: generator only INSERTs or UPSERTs with identical values | Prevents accidental modification |
| `calculationVersion` field | If formula changes, new snapshots use new version; old snapshots preserved |
| No UPDATE/DELETE in snapshot generator code | Generator never modifies existing rows |
| Optional: DB-level write-only policy | Prevent manual modifications (future enhancement) |

### Formula Versioning

When a calculation changes:

1. Old snapshots retain `calculationVersion = "1.0"`
2. New snapshots use `calculationVersion = "1.1"` (or "2.0" for major changes)
3. Queries can filter by version: `WHERE calculationVersion = '1.0'` for historical, `'1.1'` for current
4. Documentation explains version differences
5. **Old snapshots are NEVER rewritten**

### Example: MRR Formula Change

```
Before: MRR counted trial users as Premium
After:  MRR excludes trial users

v1.0 snapshots: include trial users in MRR
v1.1 snapshots: exclude trial users from MRR

Both versions coexist. Queries choose which version to read.
```

---

## 10. Reproducibility Contract

### Guarantee

**Given the same database state and calculation version, the snapshot generator produces identical results.**

### How

| Requirement | Implementation |
|-------------|---------------|
| Same inputs → same outputs | Pure calculation from DB state at `generatedAt` |
| No randomness | All calculations deterministic |
| No external dependencies | No API calls, no LLM, no network |
| Time-independent | Snapshot for `businessDate=D` uses events up to D end, not "now" |
| Version-pinned | `calculationVersion` locks the formula |

### Reproducibility Test

```ts
// Pseudocode
function testReproducibility() {
  // 1. Generate snapshot for 2026-09-03
  const snapshot1 = generateSnapshot("2026-09-03");

  // 2. Generate again (same DB state)
  const snapshot2 = generateSnapshot("2026-09-03");

  // 3. Verify identical
  assert(snapshot1.value === snapshot2.value);
  assert(snapshot1.breakdown === snapshot2.breakdown);
}
```

---

## 11. Backfill Contract

### Safe to Backfill (Event-Derived Metrics)

These can be backfilled from existing immutable data with HIGH confidence.

| Metric | Source | Earliest Date | Method |
|--------|--------|---------------|--------|
| `total_users` | `User.createdAt` | First registration | Count users registered by each day |
| `new_users_day` | `User.createdAt` | First registration | Count per day |
| `dau` | `XPTransaction.createdAt` | First XP event | Distinct users per day |
| `cash_collected_day` | `Transaksi` | First SUCCESS tx | Sum per day |
| `jalur_completed_day` | `UserUnitProgress.completedAt` | First completion | Count per day |
| `ukbi_sessions_day` | `ProgresKompetensi.startedAt` | First session | Count per day |
| `karya_created_day` | `StudentKarya.createdAt` | First karya | Count per day |

### NOT Safe to Backfill (State-Derived)

| Metric | Why Not Safe | Consequence |
|--------|-------------|-------------|
| `mrr` | Requires knowing who was premium on each historical day | Would produce incorrect values |
| `active_premium` | Same | Same |
| `premium_conversion` | Requires active premium | Same |

### Backfill for Event-Derived Only

The backfill script should:
1. Iterate each day from earliest event to today
2. Query events in that day's WIB window
3. Write `MetricSnapshot` rows
4. Use `calculationVersion = "1.0-backfill"` to distinguish from daily snapshots
5. Be idempotent (safe to re-run)

---

## 12. Query Patterns

### Current MRR (Today)

```sql
SELECT value, breakdown
FROM MetricSnapshot
WHERE metricKey = 'mrr'
  AND businessDate = DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Jakarta')
ORDER BY generatedAt DESC
LIMIT 1;
```

### MRR Trend (30 Days)

```sql
SELECT businessDate, value as mrr
FROM MetricSnapshot
WHERE metricKey = 'mrr'
  AND businessDate >= NOW() - INTERVAL '30 days'
ORDER BY businessDate;
```

### Month-over-Month MRR

```sql
WITH month_ends AS (
  SELECT
    DATE_TRUNC('month', businessDate + INTERVAL '1 day') - INTERVAL '1 day' as month_end,
    value as mrr
  FROM MetricSnapshot
  WHERE metricKey = 'mrr'
    AND businessDate IN (
      -- Last day of each month
      SELECT MAX(businessDate)
      FROM MetricSnapshot
      WHERE metricKey = 'mrr'
      GROUP BY DATE_TRUNC('month', businessDate)
    )
  ORDER BY month_end
)
SELECT
  month_end,
  mrr,
  LAG(mrr) OVER (ORDER BY month_end) as prev_month_mrr,
  ROUND((mrr - LAG(mrr) OVER (ORDER BY month_end)) / NULLIF(LAG(mrr) OVER (ORDER BY month_end), 0) * 100, 1) as growth_pct
FROM month_ends;
```

### Active Premium History

```sql
SELECT businessDate, value as active_premium, breakdown
FROM MetricSnapshot
WHERE metricKey = 'active_premium'
  AND businessDate >= '2026-06-01'
ORDER BY businessDate;
```

---

## 13. Generator Execution Contract

### When to Run

- **Daily**: Shortly after 00:00 WIB (e.g., 00:05 WIB)
- **Trigger**: Vercel Cron or scheduled function
- **Timeout**: Must complete within 60 seconds
- **Retry**: Up to 3 retries on failure

### What It Does

```
1. Determine businessDate = yesterday in WIB
2. For each metricKey in registry:
   a. Calculate metric value using canonical query
   b. Calculate breakdown if applicable
   c. Verify calculationVersion
   d. UPSERT into MetricSnapshot
3. Verify all metrics written
4. Log summary
```

### What It Does NOT Do

- ❌ Modify any production data
- ❌ Delete or update historical snapshots
- ❌ Call external APIs
- ❌ Use LLM/AI
- ❌ Modify User/Transaksi/XPTransaction tables

---

## 14. Storage Estimate

### Daily Snapshots

| Metric | Rows/Day | Rows/Year | Size/Year (est.) |
|--------|----------|-----------|-----------------|
| 15 metric keys | 15 | 5,475 | ~500 KB (with breakdowns) |

### Total

< 1 MB/year. Negligible for any PostgreSQL database.

---

## 15. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Generator fails to run for a day | MEDIUM | Alert on missing day. Manual backfill from events possible for event-derived metrics. State-derived metrics for that day are lost. |
| Generator runs with wrong timezone | HIGH | Use canonical `analytics-timezone.ts` helpers exclusively. Test with boundary dates. |
| Formula change breaks historical comparison | MEDIUM | `calculationVersion` field. Old snapshots preserved. Documentation of version differences. |
| Backfill produces incorrect historical MRR | HIGH | **DO NOT backfill MRR.** Only forward-fill from implementation date. |
| Snapshot generator has bug | MEDIUM | `calculationVersion` enables re-generation with fix. Old snapshots preserved as audit trail. |
| Storage grows unexpectedly | NEGLIGIBLE | < 1 MB/year. Can add retention policy later if needed. |

---

## 16. Migration Strategy (Future — Phase 9.2+)

### Phase 9.2: Schema + Generator

1. Create `MetricSnapshot` model in Prisma schema
2. Run `prisma db push` (additive, no destructive migration)
3. Create `lib/admin/snapshot-generator.ts`
4. Test locally against dev database

### Phase 9.3: Backfill Event-Derived Metrics

1. Backfill `total_users`, `dau`, `cash_collected_day`, etc. from existing data
2. **DO NOT backfill `mrr` or `active_premium`**
3. Verify backfilled data against known historical points

### Phase 9.4: Daily Collection

1. Add Vercel Cron to run generator daily at 00:05 WIB
2. Monitor first 7 days for correctness
3. Verify month-end snapshot (Sep 30) captures correct MRR

### Phase 9.5: Wire to Executive Dashboard

1. Update `lib/admin/executive.ts` to read MRR trend from snapshots
2. Update `comparisonAvailable: true` when 7+ days of snapshots exist
3. Update investor growth engine to show historical trends

### Phase 9.6: Enable Advanced Metrics

1. Implement churn/expansion/contraction from snapshot diffs
2. Implement NRR from cohort + MRR snapshots
3. Defer LTV and CAC (require additional data infrastructure)

---

## 17. Acceptance Criteria

This design is complete when:

1. ✅ `businessDate` semantics are precisely defined (end-of-day WIB)
2. ✅ Timezone contract uses existing helpers
3. ✅ Snapshot fields are minimal (8 state-derived metrics only)
4. ✅ Event-derived metrics excluded from snapshot (reconstructable)
5. ✅ MRR snapshot contract matches `calculateMRR()` exactly
6. ✅ Idempotency guaranteed via unique constraint
7. ✅ Immutability guaranteed via append-only + versioning
8. ✅ Reproducibility guaranteed via deterministic calculation
9. ✅ Backfill strategy documented (event-derived safe, state-derived unsafe)
10. ✅ Storage estimate < 1 MB/year
11. ✅ No production mutation
12. ✅ No schema migration (design only)

---

## 18. Summary

### What a Snapshot Means

`businessDate = 2026-09-03` = end-of-day WIB state = all events in `[Sep 3 00:00 WIB, Sep 3 23:59:59.999 WIB]` plus cumulative history.

### What Is Stored

8 state-derived metrics that cannot be reconstructed from history: MRR (5 fields), active premium (3 fields). Everything else is derived from immutable event tables.

### What Is NOT Stored

Event-derived metrics (DAU, cash, learning activity) — already reconstructable from XPTransaction, Transaksi, UserUnitProgress.

### Key Innovation

The snapshot stores the **minimum** necessary to preserve historical truth. Event-derived metrics remain queryable from their source tables. State-derived metrics (MRR, active premium) are captured daily because their source fields are overwritten.
