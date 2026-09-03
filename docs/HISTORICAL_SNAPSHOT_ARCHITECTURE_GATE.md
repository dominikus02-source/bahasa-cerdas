# BahasaCerdas — Historical Snapshot Architecture Gate

## Version
1.0

## Last Updated
September 3, 2026

## Purpose

Independent architectural review of the Phase 9.1 proposed key-value `MetricSnapshot` design, comparing:

- A. Generic `MetricSnapshot` (key-value)
- B. Typed `DailyBusinessSnapshot` (wide table)
- C. Hybrid (typed daily + event-derived + specialized snapshots)

**This is a design-review document. No implementation, no migration, no production mutation.**

---

## 1. Current Proposed Architecture (Phase 9.1)

Phase 9.1 (`docs/HISTORICAL_SNAPSHOT_CONTRACT.md`) proposed:

```prisma
model MetricSnapshot {
  id                 String   @id @default(cuid())
  businessDate       DateTime // WIB day stored as UTC midnight
  metricKey          String   // "mrr", "active_premium", "dau", ...
  value              Float    // primary numeric value
  breakdown          Json?    // optional structured breakdown
  calculationVersion String   @default("1.0")
  generatedAt        DateTime @default(now())
  @@unique([businessDate, metricKey])
  @@index([metricKey, businessDate])
  @@index([businessDate])
}
```

15 metric keys registered in a documented registry.

---

## 2. Generic MetricSnapshot — Evaluation

### Strengths

| Aspect | Verdict |
|--------|---------|
| Schema evolution | New metric = new row, zero migration |
| Query simplicity (single metric) | `WHERE metricKey='mrr' ORDER BY businessDate` — trivial |
| Storage | Compact, only stored metrics consume rows |
| Indexing | Composite `(metricKey, businessDate)` efficient for single-metric series |

### Weaknesses

| Aspect | Verdict |
|--------|---------|
| Type safety | `value Float`, `metricKey String`, `breakdown Json` — **zero compile-time safety** |
| Prisma ergonomics | `groupBy` + JSON parsing for breakdowns; no typed fields |
| Query complexity (multi-metric) | Self-joins or `IN` + pivot for same-day multi-metric reads |
| Aggregation | JSON breakdowns need `->>` extraction in SQL — slow, untyped |
| Metric validation | Any string accepted — `active_premuim` typo would silently create a row |
| Dimension consistency | `dimension`/`dimensionValue` strings accept anything — `gender` on MRR is legal |
| Financial invariant | Lives inside JSON — **cannot be enforced by DB** |
| Auditability | Per-row version OK, but breakdown diffing is JSON surgery |
| Financial reporting | Money stored as `Float` in a generic column — floating-point drift risk, no unit semantics |

### Critical Failure Modes

| Case | Generic Behavior | Preventable? |
|------|-----------------|--------------|
| `active_premuim` typo | Creates a new metric row silently | Service-layer registry check only; DB accepts |
| `banana_revenue` | Same — any string is valid | Service-layer only |
| `audience=TEACHER_STUDENT` | Dimension column accepts anything | No |
| `mrr=12025000` wrong unit | No unit semantics on `value Float` | No |
| Duplicate metric+date+version | `@@unique([businessDate, metricKey])` blocks (before version) — with version in the key, needs `@@unique([businessDate, metricKey, calculationVersion])` | Yes — but version drift splits series |
| MRR with `gender` dimension | Legal, stored, no error | No |
| Metric renamed | Old key + new key coexist → silent series split unless code filters both | No |
| Version mismatch across metrics same day | mrr v1.0 + active_premium v1.1 in same day is legal | No |

**Conclusion**: Generic key-value maximizes flexibility at the cost of every financial-integrity property. For a table whose sole purpose is *financial truth preservation*, this is the wrong trade.

---

## 3. Typed DailyBusinessSnapshot — Evaluation

### Strengths

| Aspect | Verdict |
|--------|---------|
| Type safety | All fields typed columns — typos are **compile errors**, not runtime data |
| Prisma ergonomics | Direct field access, no JSON parsing, full Prisma type inference |
| Query simplicity | One row per day; all metrics available without joins |
| Financial invariant | `mrr = muridMonthlyMrr + muridYearlyMrr + guruMonthlyMrr + guruYearlyMrr` is a single-row check — enforceable with a CHECK constraint (raw SQL migration) or at write time |
| Auditability | Whole-day snapshot is one atomic row — version + generatedAt apply to all metrics consistently |
| Indexing | `@@unique([businessDate, calculationVersion])` or PK on businessDate; range scans trivial |
| Storage | Wide row, but every metric is computed daily anyway — no meaningful waste |

### Weaknesses

| Aspect | Verdict |
|--------|---------|
| Schema evolution | New metric requires `ALTER TABLE ADD COLUMN` (additive, nullable) — a deliberate migration |
| Nullable columns | Some new fields may be null until backfill — acceptable, documented |
| Future arbitrary dimensions | Not supported without new columns — but BahasaCerdas has **zero** current need for arbitrary dimensions |

### Failure Modes

| Case | Typed Behavior |
|------|----------------|
| `active_premuim` typo | Compile error — column does not exist |
| `banana_revenue` | Compile error |
| `audience=TEACHER_STUDENT` | Impossible — no dimension columns |
| Wrong unit | `Int` money column with documented rupiah semantics; no float drift |
| Duplicate date+version | `@@unique([businessDate, calculationVersion])` — enforced by DB |
| MRR with gender | Impossible |
| Metric renamed | Column rename is a deliberate migration; old data preserved |
| Version mismatch same day | One version per row — consistent by construction |

**Conclusion**: Typed sacrifices "zero-migration new metrics" (a non-requirement) for correctness, safety, and auditability (hard requirements for financial data).

---

## 4. Hybrid — Evaluation

### Definition

```
DailyBusinessSnapshot (TYPED — state-derived financial metrics)
+ Transaksi history (existing — cash, revenue)
+ XPTransaction history (existing — DAU/WAU/MAU)
+ UserUnitProgress / ProgresKompetensi history (existing — learning)
+ future specialized snapshots (per-user premium state when churn analysis arrives)
```

### Why Hybrid Wins

1. **No duplication**: Event-derived metrics (cash, DAU, learning) stay in their immutable source tables — never copied into a snapshot where they could drift.
2. **Typed core where state-derived truth lives**: MRR + premium state is the only data that *cannot* be reconstructed — give it the strongest possible schema.
3. **Queryability**: The 5 most important investor queries (MRR trend, MRR mix, active premium trend, month-end MRR, MoM growth) are single-row reads against the typed table.
4. **Future-ready**: When churn/expansion analysis needs per-user historical state, add a dedicated `PremiumStateSnapshot` table (user × date × plan × premiumUntil) — the hybrid pattern scales to specialized needs without touching the daily core.

### What Belongs in the Typed Daily Core

| Field | Why In Core |
|-------|-------------|
| `businessDate` | Identity |
| `mrr` | State-derived, investor-critical |
| `muridMonthlyMrr`, `muridYearlyMrr`, `guruMonthlyMrr`, `guruYearlyMrr` | MRR mix — investor-critical, needed to answer "why is MRR X" |
| `activePremium`, `muridPremium`, `guruPremium` | State-derived population |
| `totalUsers`, `muridUsers`, `guruUsers` | Materialized for cheap trend queries (source of truth = `User.createdAt`, but 3 counts/day is trivial and makes queries 1-row) |
| `dau`, `wau`, `mau` | Materialized for cheap trend queries (source of truth = `XPTransaction`) |
| `calculationVersion`, `generatedAt` | Audit trail |

### What Stays in Event Tables (NOT in daily core)

| Metric | Home |
|--------|------|
| Cash collected (day/30d/all-time) | `Transaksi` — already immutable |
| New users by day | `User.createdAt` |
| Learning completions | `UserUnitProgress.completedAt` |
| UKBI/TKA sessions | `ProgresKompetensi.startedAt` |
| Karya activity | `StudentKarya.createdAt` |
| D7/D30 retention | Cohort computation over `User` × `XPTransaction` |

**Reasoning**: Cash and activity metrics are already fully reconstructable from append-only tables (Phase 9.0). Copying them into a snapshot adds a second source of truth that can drift. The typed core contains only: (a) genuinely non-reconstructable state, plus (b) a few high-value counts materialized for query performance with events remaining authoritative.

---

## 5. Financial Invariant Evaluation

### MRR Invariant

```
mrr = muridMonthlyMrr + muridYearlyMrr + guruMonthlyMrr + guruYearlyMrr
```

| Architecture | Enforcement |
|--------------|-------------|
| Generic | Lives inside `breakdown` JSON — checked only by generator code; DB cannot validate; drift undetectable |
| Typed | All five are columns of one row. Enforceable via SQL CHECK constraint (raw migration) AND asserted at write time. Reconciliation is `SELECT * WHERE businessDate=X` and sum in one glance |
| Hybrid | Same as typed (typed core) |

### Active Premium Invariant

```
activePremium = muridPremium + guruPremium
```

| Architecture | Enforcement |
|--------------|-------------|
| Generic | JSON breakdown — weak |
| Typed | Columns — CHECK constraint + write-time assertion |
| Hybrid | Same as typed |

### Should Breakdowns Be Stored at All?

**Yes — in typed columns, not derived.** Reasoning:

1. Each mix component is independently computed from User state at snapshot time — they are not derivable from the total alone.
2. Storing all five makes the invariant *visible* and reconcilable.
3. If a future formula change alters one component, the typed row reveals exactly where the change landed.
4. DB-level CHECK constraints make drift impossible.

---

## 6. Investor Query Evaluation

### "Monthly MRR, last 12 months"

| Arch | Complexity |
|------|-----------|
| Generic | `WHERE metricKey='mrr'` + month grouping + JSON `->>` for mix |
| Typed | `WHERE businessDate IN (month-ends)` → `SELECT mrr` — 1 query, no JSON |
| Hybrid | Same as typed |

### "MRR by audience, last 12 months"

| Arch | Complexity |
|------|-----------|
| Generic | `breakdown->>'muridMonthlyMrr'` JSON extraction — untyped, slower |
| Typed | Direct columns `muridMonthlyMrr, guruMonthlyMrr` |
| Hybrid | Same as typed |

### "Active Premium trend, 6 months"

| Arch | Complexity |
|------|-----------|
| Generic | metricKey filter + JSON split |
| Typed | 1-row-per-day direct columns |
| Hybrid | Same as typed |

### "DAU/MAU trend"

| Arch | Complexity |
|------|-----------|
| Generic | metricKey filter (or event recompute) |
| Typed | Materialized columns |
| Hybrid | Same as typed (events remain authoritative for recomputation) |

### "September month-end MRR"

| Arch | Complexity |
|------|-----------|
| Generic | `WHERE metricKey='mrr' AND businessDate='2026-09-30'` |
| Typed | `WHERE businessDate='2026-09-30'` → `mrr` column |
| Hybrid | Same as typed |

### "MRR growth MoM"

| Arch | Complexity |
|------|-----------|
| Generic | Window function over metricKey series + JSON mix parse |
| Typed | Window function over month-end rows — trivial |
| Hybrid | Same as typed |

### "Calculation version for September MRR"

| Arch | Complexity |
|------|-----------|
| Generic | Per-metric-row version (mrr may be v1.0 while others v1.1) |
| Typed | One row = one version — unambiguous |
| Hybrid | Same as typed |

**Typed wins on every multi-metric query; ties on single-metric.** The JSON extraction penalty in generic is the deciding factor.

---

## 7. Auditability Evaluation

### Investor: "Why was MRR on September 30 Rp250,000?"

| Arch | Answer Path |
|------|-------------|
| Generic | Read `mrr` row for 09-30 → `value` + `breakdown` JSON + `calculationVersion` → parse JSON to see mix → regenerate with version → compare |
| Typed | Read row for 09-30 → `mrr`, `muridMonthlyMrr`, ..., all visible as columns → `calculationVersion` → regenerate with version → compare |

| Aspect | Generic | Typed |
|--------|---------|-------|
| Snapshot value | ✓ | ✓ |
| Plan breakdown | JSON parse required | Direct columns |
| Calculation version | Per metric row | One per day |
| Generation timestamp | ✓ | ✓ |
| Underlying source | `calculateMRR()` documented | Same |
| Reconciliation status | Manual (sum JSON) | CHECK constraint + write-time assert |

**Typed provides a self-describing audit row. Generic requires JSON surgery to answer the same question.**

---

## 8. Schema Evolution Evaluation

| Scenario | Generic | Typed |
|----------|---------|-------|
| New premium plan (e.g., PRO_PLUS) | breakdown JSON gains a key silently — no validation, queries must be updated anyway | `ALTER TABLE ADD COLUMN guruProPlusMrr` — deliberate, versioned migration |
| New audience (e.g., SCHOOL) | New dimensionValue accepted unvalidated | New column or new specialized table |
| New metric (arenaActiveUsers) | Zero-migration metricKey | New column (or new table) — additive migration |
| New dimension | Encourages dimension abuse | Not supported by design (correct: no current need) |
| Metric renamed | Silent series split | Column rename = explicit migration |

**Typed makes change deliberate. Generic makes change silent — for financial data, silent change is a liability, not a feature.**

The Phase 9.1 "zero schema migration" benefit is real but mis-weighted: it optimizes for adding metrics (a rare, deliberate act) at the cost of validating every stored value (a daily, correctness-critical act).

---

## 9. Final Recommendation

# HYBRID

**Specifically: TYPED `DailyBusinessSnapshot` core + existing event tables + future specialized snapshot tables.**

The hybrid is chosen because:

1. **Investor trust**: Financial truth lives in typed columns with DB-enforced invariants — not strings and JSON.
2. **Financial correctness**: MRR invariant is a single-row CHECK constraint, not a JSON-sum convention.
3. **Query simplicity**: The 5 most-asked investor queries are 1-row reads.
4. **Auditability**: A day's entire financial state is one atomic, versioned row.
5. **Maintainability**: TypeScript ↔ Prisma 1:1 mapping; the metric registry IS the schema, cannot drift.
6. **Current scale**: ~5,475 rows/year typed — trivial for PostgreSQL.
7. **10x–100x growth**: Typed wide table with `businessDate` index handles millions of rows. Generic JSON extraction degrades first.

The Phase 9.1 key-value design is **rejected** for the daily core. It remains a reasonable pattern for *optional* operational metrics with genuinely variable dimensions — but that need does not exist today.

---

## 10. Phase 9.1 Impact

**REVISED** — the daily snapshot core changes from generic key-value to typed wide-row.

### Change Log

| Item | Original (Phase 9.1) | Revised (Phase 9.1A) | Reason |
|------|---------------------|---------------------|--------|
| Schema | Generic `MetricSnapshot` (metricKey/value/breakdown) | Typed `DailyBusinessSnapshot` (typed columns) | Financial invariants not enforceable in JSON |
| Value type | `Float` | `Int` (rupiah) / `Int` (counts) | Float drift risk on money |
| Metric validation | Documented registry (drift risk) | Schema = registry (compile-time) | Typo `active_premuim` impossible |
| MRR mix | `breakdown` JSON | Typed columns ×4 | Direct queries + CHECK constraint |
| Cash/activity metrics | Stored as metricKeys | Stay in event tables (not stored) | Avoid second source of truth; Phase 9.0 already proved reconstructability |
| DAU/WAU/MAU/user counts | metricKeys | Materialized columns (events remain authoritative) | Cheap trend queries |
| Versioning | Per metricKey row | Per day row | One version per day, unambiguous |

---

## 11. Migration Readiness

**NO** — this phase is design-only. No schema, no migration, no table, no cron, no backfill. Implementation begins in Phase 9.2 after this gate is accepted.

---

## 12. Production Mutation

**NONE** — design-review only. No data writes, no schema changes, no code changes.

---

## 13. Git Status

Two new untracked documents; no modified production files from this phase:

- `docs/HISTORICAL_SNAPSHOT_ARCHITECTURE_GATE.md` (this file)
- Revision notice appended to `docs/HISTORICAL_SNAPSHOT_CONTRACT.md`

Other modified files in the working tree belong to separate workstreams (product-event analytics, teacher growth) and are untouched.

---

## 14. Commit

LOCAL ONLY. Awaiting founder decision on the architecture before any commit.