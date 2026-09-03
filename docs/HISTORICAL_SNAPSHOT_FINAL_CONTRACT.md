# BahasaCerdas — Historical Snapshot Final Contract (Phase 9.2 Implementation Spec)

## Version
1.0 (FINAL — supersedes conflicting sections of Phase 9.1)

## Last Updated
September 3, 2026

## Status
**FINAL CONTRACT.** Phase 9.2 must implement exactly this. No fundamental architectural decisions remain.

## Architecture (Approved in Phase 9.1A)

```
DailyBusinessSnapshot (TYPED core — this contract)
+ Transaksi history (existing — cash/revenue)
+ XPTransaction history (existing — DAU/WAU/MAU source of truth)
+ UserUnitProgress / ProgresKompetensi history (existing — learning)
+ future specialized snapshot tables (churn analysis — NOT in this phase)
```

---

## 1. Final Field Audit

### Identity

| Field | Decision | Rationale |
|-------|----------|-----------|
| `id` | **STORE** | Primary key, cuid |
| `businessDate` | **STORE** | The WIB day this snapshot describes. Stored as UTC midnight of that WIB day (existing convention from `wibDayToUtcRange`). |
| `snapshotAt` | **DO NOT STORE** | Redundant. Semantics are fixed: snapshot represents end-of-day WIB = `businessDate` end of range. Fully derivable from `businessDate`. |
| `generatedAt` | **STORE** | Audit — when the generator computed the row (UTC timestamp). |

### Users

| Field | Decision | Rationale |
|-------|----------|-----------|
| `totalUsers` | **STORE** (materialized) | Source of truth remains `User.createdAt`, but 3 counts/day make trend queries 1-row reads. Cheap, no drift risk (regenerable). |
| `muridUsers` | **STORE** (materialized) | Same |
| `guruUsers` | **STORE** (materialized) | Same |

### Engagement

| Field | Decision | Rationale |
|-------|----------|-----------|
| `dau` | **STORE** (materialized) | Source of truth remains `XPTransaction`. Materializing avoids recomputing growing groupBy queries for every historical request. |
| `wau` | **STORE** (materialized) | Same |
| `mau` | **STORE** (materialized) | Same |

### Premium (state-derived — the reason snapshots exist)

| Field | Decision | Rationale |
|-------|----------|-----------|
| `activePremium` | **STORE** | `User.isPremium + premiumUntil` is mutable — NOT reconstructable. Core field. |
| `muridPremium` | **STORE** | Same |
| `guruPremium` | **STORE** | Same |

### MRR (state-derived — core)

| Field | Decision | Rationale |
|-------|----------|-----------|
| `mrr` | **STORE** | Derived from mutable User state. Core field. |
| `muridMonthlyMrr` | **STORE** | MRR mix — independently calculated, needed to answer "why is MRR X". |
| `muridYearlyMrr` | **STORE** | Same |
| `guruMonthlyMrr` | **STORE** | Same |
| `guruYearlyMrr` | **STORE** | Same |

### Version

| Field | Decision | Rationale |
|-------|----------|-----------|
| `calculationVersion` | **STORE** | `"1.0"` default. Enables formula evolution without rewriting history. |

### Explicitly NOT Stored

| Candidate | Reason |
|-----------|--------|
| `snapshotAt` | Derivable from `businessDate` (end-of-day semantics) |
| `cashCollectedDay / 30d / AllTime` | Event-derived from `Transaksi` — storing duplicates a second source of truth |
| `newUsersDay` | Event-derived from `User.createdAt` |
| `jalurCompletedDay`, `ukbiSessionsDay`, `karyaCreatedDay` | Event-derived from their immutable tables |
| `d7Rate`, `d30Rate` | Cohort computations over `User` × `XPTransaction` — reconstructable |
| `premiumConversion` | `guruPremium / (guruUsers - founders)` — derivable from stored columns |
| `paymentHealth`, `dataQuality` | Operational, not historical business truth |

---

## 2. Database Types

### Monetary Fields (mrr + 4 plan MRRs)

**Type: `Int` (integer rupiah)**

Verified against existing conventions — **the entire schema uses `Int` for money**:

| Existing Field | Type |
|---------------|------|
| `Transaksi.amount` | Int |
| `TeacherCommission.grossAmount` / `commissionAmount` | Int |
| `Withdrawal.amount` | Int |
| `TeacherPayout.amount` / `netTransfer` | Int |
| `Pembelian.amount` / `platformFee` / `sellerEarning` | Int |
| `XpLedger.amount`, `CoinTransaction.amount` | Int |

**Zero `Decimal` and zero `BigInt` exist in the schema.** The project's canonical money semantics is integer rupiah. The snapshot must match.

| Choice | Rejected? | Why |
|--------|-----------|-----|
| `Int` | **ACCEPTED** | Matches entire payment model. All values fit Int32 (< 2.1B). MRR is bounded by plan count × 49,000. |
| `Float` | Rejected | Floating-point drift on money. Phase 9.1A explicitly rejected. |
| `Decimal` | Rejected | No fractional rupiah exists in this system; Decimal adds complexity without value; inconsistent with 9 existing Int money fields. |
| `BigInt` | Rejected | Unnecessary — no field approaches Int32 limits. |

### Count Fields (users, premium, dau/wau/mau)

**Type: `Int`** — matches every count field in the schema (e.g., `AIUsage.tokens Int`, `User.xp Int`, `SellerEarning` etc.).

### Date Fields

- `businessDate`: `DateTime` (UTC midnight of WIB day)
- `generatedAt`: `DateTime` (UTC, `@default(now())`)

### Version Field

- `calculationVersion`: `String` (default `"1.0"`)

---

## 3. Nullability

### Decision: ALL FIELDS NOT NULL. Snapshot is atomic — all-or-nothing.

| Scenario | Behavior |
|----------|----------|
| DAU calculation fails | **The entire day's snapshot fails** and is retried. No partial row written. |
| Any metric fails | Same — whole snapshot fails. Generator is retryable and idempotent. |
| Metric genuinely has no data (e.g., zero new premium) | Store `0`, NOT NULL. Zero is truth; NULL is ambiguity. |
| Metric not yet applicable | Not possible — all metrics are defined for every day from day one. |

**Rationale**:

1. A NULL in a historical financial snapshot silently means "partial data" — investors would misinterpret.
2. CHECK-constraint invariants require NOT NULL to enforce.
3. Idempotent retry makes atomicity free — no downside to failing the whole day.
4. "Valid zero" is always representable as `0` (Phase 9.0 principle: never convert exceptions into zeros — exceptions fail the write, not produce NULL).

---

## 4. MRR Invariants

### Invariant 1 — MRR Decomposition

```text
mrr = muridMonthlyMrr + muridYearlyMrr + guruMonthlyMrr + guruYearlyMrr
```

### Invariant 2 — Premium Decomposition

```text
activePremium = muridPremium + guruPremium
```

### Invariant 3 — Non-Negativity

```text
mrr >= 0
muridMonthlyMrr >= 0, muridYearlyMrr >= 0, guruMonthlyMrr >= 0, guruYearlyMrr >= 0
activePremium >= 0, muridPremium >= 0, guruPremium >= 0
totalUsers >= 0, muridUsers >= 0, guruUsers >= 0
dau >= 0, wau >= 0, mau >= 0
```

### Invariant 4 — Sanity Bounds

```text
activePremium <= totalUsers
muridPremium <= muridUsers
guruPremium <= guruUsers
dau <= wau <= mau
dau <= totalUsers
```

### Enforcement (TWO layers)

**Layer 1 — Write-time assertion (generator, mandatory):**

```ts
assert(mrr === muridMonthlyMrr + muridYearlyMrr + guruMonthlyMrr + guruYearlyMrr);
assert(activePremium === muridPremium + guruPremium);
assert(dau <= wau && wau <= mau);
// fail the whole snapshot on violation
```

**Layer 2 — DB CHECK constraints (raw SQL migration, Phase 9.2):**

Prisma schema cannot express CHECK constraints, so they are added via `prisma/migrations/manual/` SQL (same pattern as the existing `2026-09-08_product_event.sql`):

```sql
ALTER TABLE "DailyBusinessSnapshot"
  ADD CONSTRAINT daily_snapshot_mrr_decomposition
  CHECK ("mrr" = "muridMonthlyMrr" + "muridYearlyMrr" + "guruMonthlyMrr" + "guruYearlyMrr"),
  ADD CONSTRAINT daily_snapshot_premium_decomposition
  CHECK ("activePremium" = "muridPremium" + "guruPremium"),
  ADD CONSTRAINT daily_snapshot_non_negative
  CHECK ("mrr" >= 0 AND "muridMonthlyMrr" >= 0 AND "muridYearlyMrr" >= 0
         AND "guruMonthlyMrr" >= 0 AND "guruYearlyMrr" >= 0
         AND "activePremium" >= 0 AND "muridPremium" >= 0 AND "guruPremium" >= 0
         AND "totalUsers" >= 0 AND "muridUsers" >= 0 AND "guruUsers" >= 0
         AND "dau" >= 0 AND "wau" >= 0 AND "mau" >= 0),
  ADD CONSTRAINT daily_snapshot_activity_hierarchy
  CHECK ("dau" <= "wau" AND "wau" <= "mau"),
  ADD CONSTRAINT daily_snapshot_premium_bounds
  CHECK ("activePremium" <= "totalUsers" AND "muridPremium" <= "muridUsers" AND "guruPremium" <= "guruUsers");
```

---

## 5. Exact Prisma Model (Phase 9.2 target)

```prisma
/// Historical daily business snapshot — append-only, end-of-day WIB state.
/// See docs/HISTORICAL_SNAPSHOT_FINAL_CONTRACT.md for the full contract.
model DailyBusinessSnapshot {
  id                String   @id @default(cuid())
  /// WIB calendar day, stored as UTC midnight of that WIB day.
  businessDate      DateTime
  /// UTC timestamp when this snapshot was computed (audit).
  generatedAt       DateTime @default(now())

  // Users (materialized from User.createdAt — events remain authoritative)
  totalUsers        Int
  muridUsers        Int
  guruUsers         Int

  // Engagement (materialized from XPTransaction — events remain authoritative)
  dau               Int
  wau               Int
  mau               Int

  // Premium state (NOT reconstructable — core snapshot data)
  activePremium     Int
  muridPremium      Int
  guruPremium       Int

  // MRR (NOT reconstructable — core snapshot data, integer rupiah)
  mrr               Int
  muridMonthlyMrr   Int
  muridYearlyMrr    Int
  guruMonthlyMrr    Int
  guruYearlyMrr     Int

  // Versioning
  calculationVersion String  @default("1.0")

  @@unique([businessDate, calculationVersion])
  @@index([businessDate])
}
```

**All fields NOT NULL.** Zero nullable columns. One row per (businessDate, calculationVersion).

---

## 6. Idempotency & Immutability

| Contract | Rule |
|----------|------|
| Uniqueness | `@@unique([businessDate, calculationVersion])` |
| Daily generator | UPSERT on `(businessDate, calculationVersion)` with identical values — safe to retry |
| Immutability | Generator never UPDATEs a row with different values; no DELETE path exists |
| Version change | New version → new row for same businessDate (old preserved). Two versions of one day can coexist for audit |
| Manual modification | Not supported; generator is the only writer |

---

## 7. Generation Contract

| Item | Value |
|------|-------|
| Trigger | Daily, shortly after 00:00 WIB (e.g., 00:05 WIB) |
| businessDate | Yesterday in WIB |
| Query window | `wibDayToUtcRange(businessDate)` — reuse `lib/admin/analytics-timezone.ts`, no new timezone code |
| Calculation | Reuse `calculateMRR()` / `calculateMRRBreakdown()` logic verbatim (plan detection, founder exclusion, expiry filter) |
| Atomicity | Compute all fields → assert all invariants → single INSERT. Any failure = no row, retry |
| Timeout | Must complete < 60s |

### Field-Level Computation Source

| Field | Computation |
|-------|-------------|
| `totalUsers` | `User.count(createdAt < endOfDay)` |
| `muridUsers` | `User.count(role='MURID', createdAt < endOfDay)` |
| `guruUsers` | `User.count(role='GURU', createdAt < endOfDay)` |
| `dau` | `XPTransaction.groupBy(userId, createdAt IN dayWindow)` → length |
| `wau` | `XPTransaction.groupBy(userId, createdAt IN [day-6..day] window)` → length |
| `mau` | `XPTransaction.groupBy(userId, createdAt IN [day-29..day] window)` → length |
| `activePremium` | `User.count(isPremium, premiumUntil > endOfDay, isFounder=false)` |
| `muridPremium` | Same + `role='MURID'` |
| `guruPremium` | Same + `role='GURU'` |
| `mrr` + 4 plan MRRs | `calculateMRR()` / `calculateMRRBreakdown()` — exact same queries as production |

**Note on "endOfDay"**: premiumUntil comparison uses the snapshot moment (end of businessDate WIB). A premium expiring at 23:59:59 WIB on businessDate is counted; one expiring 00:00:01 WIB next day is not. This is the exact end-of-day semantics. *(The two examples in this note are mutually inconsistent under any single boundary comparison — the exact, implemented rule is given in §13 and supersedes this wording.)*

---

## 8. Sample Row (Illustrative)

```
businessDate       = 2026-09-30T00:00:00.000Z   (Sep 30 WIB)
generatedAt        = 2026-10-01T00:05:00.000Z
totalUsers         = 1500
muridUsers         = 1200
guruUsers          = 300
dau                = 215
wau                = 480
mau                = 890
activePremium      = 8
muridPremium       = 3
guruPremium        = 5
mrr                = 250000
muridMonthlyMrr    = 38000    (2 × 19,000)
muridYearlyMrr     = 15000    (1 × 15,000)
guruMonthlyMrr     = 147000   (3 × 49,000)
guruYearlyMrr      = 50000    (illustrative)
calculationVersion = "1.0"

CHECK: 38000 + 15000 + 147000 + 50000 = 250000 ✓
CHECK: 3 + 5 = 8 ✓
```

---

## 9. Investor Queries Enabled by This Contract (no architectural decision left)

| Query | SQL Shape |
|-------|-----------|
| Monthly MRR last 12 months | `SELECT businessDate, mrr FROM DailyBusinessSnapshot WHERE businessDate IN (month-end days) ORDER BY businessDate` |
| MRR by audience 12 months | Direct columns `guruMonthlyMrr + guruYearlyMrr AS guruMrr, muridMonthlyMrr + muridYearlyMrr AS muridMrr` |
| Active premium trend | `SELECT businessDate, activePremium, muridPremium, guruPremium ... ORDER BY businessDate` |
| DAU/MAU trend | Materialized columns — 1-row reads |
| September month-end MRR | `WHERE businessDate = '2026-09-30'` → `mrr` |
| MRR growth MoM | Window function over month-end rows |
| Calc version for Sept MRR | `calculationVersion` on the Sep 30 row |
| "Why was MRR 250,000 Sep 30?" | Single row: all 5 MRR columns + version + generatedAt; regenerate-and-compare |

---

## 10. Acceptance Checklist (Phase 9.2 Definition of Done)

1. [ ] `DailyBusinessSnapshot` model matches §5 exactly
2. [ ] All fields `Int` rupiah / counts, `DateTime` dates, `String` version
3. [ ] Zero nullable fields
4. [ ] `@@unique([businessDate, calculationVersion])` + `@@index([businessDate])`
5. [ ] CHECK constraints applied via manual SQL migration (invariants §4)
6. [ ] Generator reuses `calculateMRR()` / `calculateMRRBreakdown()` verbatim
7. [ ] Generator reuses `lib/admin/analytics-timezone.ts` (no new timezone code)
8. [ ] Write-time invariant assertions fail atomically (no partial rows)
9. [ ] Idempotent retry proven by test (run twice → same single row)
10. [ ] No Float/Decimal anywhere in the table
11. [ ] Storage < 1 MB/year

---

## 11. Out of Scope (explicitly deferred)

| Item | Phase |
|------|-------|
| Backfill of event-derived metrics | Phase 9.3 |
| Daily cron/generator deployment | Phase 9.4 |
| Wiring snapshots into `/admin/executive` trends | Phase 9.5 |
| Churn/expansion/contraction (requires premium expiry events) | Phase 9.6+ |
| LTV, CAC, NRR | Deferred indefinitely (insufficient data infrastructure) |
| Any backfill of MRR/premium from current state | **NEVER** |

---

## 12. Production Safety

**NONE of the above is implemented in this phase.** This document is the contract. No schema change, no migration, no table, no cron, no backfill, no data writes, no push.

---

## 13. Phase 9.3 Controlled QA — Semantic Clarifications (canonical)

Decisions ratified during the Phase 9.3 QA gate. Where these conflict with earlier
wording, THIS section wins.

### 13.1 Business-date boundary (half-open WIB day)

`businessDate = D` denotes the half-open interval `[D 00:00:00 WIB, D+1 00:00:00 WIB)`.

- `00:00:00 WIB` on D belongs to D (inclusive start).
- `23:59:59.999 WIB` on D belongs to D (exclusive end via `lt`).
- `D+1 00:00:00 WIB` does NOT belong to D.

`businessDate` is stored as the UTC midnight carrying the same calendar label as the
WIB day (`normalizeBusinessDate()`: `Date.UTC(y, m, d)` of the WIB components), so
`wibDayToUtcRange(businessDate)` recovers the exact interval above. Implemented in
`lib/admin/historical-snapshot.ts`, using only `lib/admin/analytics-timezone.ts`.

### 13.2 Premium boundary — exact comparison rule

The snapshot moment is the boundary instant `D+1 00:00:00.000 WIB` (the exclusive end
of day D). A premium is counted as active in snapshot D **iff**

```text
premiumUntil > D+1 00:00:00.000 WIB      (strict greater-than)
```

- `premiumUntil` exactly at the boundary → **NOT counted** (strict `>`).
- `premiumUntil` 1 second before the boundary (i.e. `D 23:59:59 WIB`) → **NOT counted**.
- `premiumUntil` 1 second after the boundary → **counted** (it was active at the
  boundary instant).

This supersedes the §7 note examples (which were mutually inconsistent). Behavior is
deterministic and covered by a boundary test with expiries at `boundary − 1s`,
`boundary`, and `boundary + 1s`.

### 13.3 Versioning — Option B retained, canonical selection is deterministic

Multiple immutable versions of one `businessDate` may coexist:
`@@unique([businessDate, calculationVersion])`. Investor-facing queries MUST select
the canonical row with `WHERE calculationVersion = SNAPSHOT_CALCULATION_VERSION`
(module constant, currently `"1.0"`) — this yields exactly one row per `businessDate`
via `findUnique`, so NO `findFirst` / latest-by-`generatedAt` logic is ever needed.
Older versions exist solely for audit/regeneration comparison. The generator default
is always the canonical constant.

### 13.4 Role semantics

The verified `User.role` universe is `GURU | MURID | ADMIN`. Therefore:

```text
totalUsers = all roles
muridUsers + guruUsers <= totalUsers        (ADMIN users sit in neither bucket)
```

Enforced by a new Layer-1 assertion (`Role bounds`) and a matching DB CHECK
`daily_snapshot_role_bounds` (`CHECK ("muridUsers" + "guruUsers" <= "totalUsers")`)
added to the manual migration. Existing premium-bounds CHECKs are unchanged.

### 13.5 Late events — RECORDED STATE vs TRUE HISTORICAL STATE

- **Engagement & registration** (XPTransaction, User.createdAt) attribute by event
  timestamp: an event with `createdAt` inside day D — even if persisted after
  midnight D+1 — is counted in D. Correct attribution by timestamp.
- **Premium & MRR** reflect RECORDED STATE at generation time: the generator reads the
  mutable `User.isPremium`/`premiumUntil` fields (filtered by `premiumUntil > boundary`).
  It CANNOT reconstruct: (a) entitlements that started after D but are still active at
  generation time, or (b) entitlements revoked before generation. True historical
  premium state requires a premium event ledger (Phase 9.6+, not built). This is a
  documented limitation, not a defect.

### 13.6 Migration execution policy

The manual migration creates infrastructure ONLY (table + indexes + CHECKs). It never
populates data, runs the generator, or touches existing tables. It is idempotent
(`IF NOT EXISTS` / `EXCEPTION duplicate_object`) and safe to apply exactly once or
repeat. It was NOT applied in Phase 9.2 or 9.3 — no staging database exists in this
environment and production is never used as staging. Apply order when approved:
staging → production (Supabase SQL editor).

### 13.7 Contract deviations recorded

| Change | Classification |
|--------|----------------|
| `daily_snapshot_role_bounds` CHECK + Layer-1 assertion added | ACCEPTED REFINEMENT — required by §4 role semantics; additive, migration never applied |
| §7 premium-boundary note superseded by §13.2 | REQUIRED CONTRACT CLARIFICATION — §7 examples were internally inconsistent |
| Backfill listed in §11 as "Phase 9.3" | DEFERRED — Phase 9.3 became the QA/migration gate; backfill is a later controlled phase |