# Phase 9.1 — Historical Metrics: Proof of Correctness

**Date:** September 3, 2026
**Status:** READ-ONLY forensic proof — no schema/data changes, no commit/push
**Deliverables (exactly 3 new files):**
- `scripts/historical-metrics-proof.ts` — forensic script (read-only)
- `data/historical-metrics-proof-september-2026.json` — structured output
- `docs/HISTORICAL_METRICS_PROOF_SEPTEMBER_2026.md` — this report

---

## 1. Executive Verdict

**Not all investor-relevant historical metrics are reconstructable from retained production data.**

The evidence is unambiguous: **two distinct classes of metrics coexist** and must be treated differently:

| Class | What | Verdict |
|-------|------|---------|
| **Event/ledger metrics** | user growth, engagement, content published, learning sessions, XP | **Reconstructable** from primary event/ledger tables — **but only within their recorded windows** (each table has a migration/engine floor). |
| **Point-in-time state metrics** | MRR, MRR breakdown, active premium count, premium-by-role, active trial count | **NOT reconstructable**. These are compositions of *mutable current-state fields* (`isPremium`, `premiumUntil`, `premiumPlan`, `role`, `trialEndsAt`) of which no historical version is retained. Only the **latest** state survives. Only an **append-only daily snapshot** preserves them. |

**Architecture verdict:** an **evidence-driven hybrid** is required — keep the append-only `DailyBusinessSnapshot` (proven necessary) for MRR/premium, and derive the reconstructable engagement metrics from the primary event tables (facts) rather than materializing them from a snapshot.

**Backfill verdict:** **No backfill of MRR or premium state is possible** for any date before the snapshot's start (2026-09-02), because the underlying point-in-time active-subscriber composition does not exist for earlier dates. **Do NOT backfill MRR/premium**; snapshot from now forward. Reconstructable engagement metrics can be backfilled from primary tables, but only within each metric's recorded window floor.

---

## 2. Method & Independent Verification

This proof **independently re-derived** every conclusion against the **actual Prisma schema** and the **live production database** (Supabase, `timestamp without time zone` on all key `createdAt` columns; app writes UTC wall-clock; reporting converts to WIB, UTC+7, per `lib/admin/analytics-timezone.ts`). Prior forensic analyses were treated as hypotheses to verify, **not** trusted conclusions.

The script connects **read-only** via `DIRECT_URL`, probes 14 tables, gathers premium/revenue state, reads the latest `DailyBusinessSnapshot`, and **reconciles** an independently recomputed MRR against the snapshot's MRR.

### Classification Rules (embedded in the script + output)
1. Mutable current-state fields (`isPremium`, `premiumUntil`, `premiumPlan`, `role`, `xp`, `lastActiveAt`) are **never** treated as historical truth.
2. **Cash collected ≠ MRR** (they are unrelated measures; conflating them is the single most common investor-metric error).
3. A timestamp's existence alone does **not** prove retention validity — cohort date *and* bounded activity are both required.
4. Role changes corrupt historical role-based growth (`role` is mutable, no role-change ledger exists in schema).
5. Everything is classified **FACT / INFERENCE / ASSUMPTION / UNKNOWN**, and **UNKNOWN is never converted into an estimate**.

---

## 3. Evidence: Live Table Facts (production, read-only)

| Table | Rows | Min | Max | Window floor |
|-------|------|-----|-----|--------------|
| `User` | 2,442 | 2026-06-28 | 2026-09-03 | Supabase migration (pre-migration not retained) |
| `Profile` | 2,437 | 2026-06-28 | 2026-09-03 | Supabase migration |
| `XPTransaction` | 11,115 | 2026-08-03 | 2026-09-03 | modern gamification engine |
| `XpLedger` | 15,663 | 2026-07-28 | 2026-09-03 | legacy engine |
| `PlayerActivity` | 2,390 | 2026-08-03 | 2026-09-03 | modern engine |
| `ProductEvent` | **0** | — | — | **empty — not usable** |
| `DailyBusinessSnapshot` | **1** | 2026-09-02 | 2026-09-02 | snapshot just started |
| `UserUnitProgress` | 3,418 | 2026-06-29 | 2026-09-03 | Jalur Cerdas |
| `ProgresKompetensi` | 577 | 2026-07-07 | 2026-09-03 | UKBI/TKA |
| `StudentKarya` | 1,633 | 2026-07-09 | 2026-09-03 | Karya |
| `Group` | 144 | 2026-07-08 | 2026-09-02 | Kelas |
| `GroupMember` | 1,254 | 2026-07-14 | 2026-09-01 | Keanggotaan |
| `Transaksi` | 17 | 2026-06-28 | 2026-09-01 | Payments (append-only) |
| `AIUsage` | 1,261 | 2026-07-01 | 2026-09-02 | AI tools |

**Critical observation:** `ProductEvent` (the intended product event ledger) has **0 rows** — it was never populated. `DailyBusinessSnapshot` has only **1 row**. Engagement is reconstructable only via the `XPTransaction` proxy (floor 2026-08-03), not from product events.

---

## 4. Premium & Revenue Live State

| Metric | Live value |
|--------|-----------|
| Active premium (non-founder) | 4 |
| Active murid premium | 2 |
| Active guru premium | 2 |
| Active guru trials | 273 |
| `Transaksi` EXPIRED | 6 → Rp365,000 |
| `Transaksi` SUCCESS | 4 → **Rp438,000 (cash collected)** |
| `Transaksi` PENDING | 7 → Rp1,114,000 |
| **Live recomputed MRR** | **Rp120,250** |

These are **current-state** facts. They are a *snapshot of now*, NOT a historical series.

---

## 5. MRR Reconciliation — Proof the Formula is Internally Consistent

The script independently recomputed MRR from the live non-founder active-premium set (plan derived from each user's **latest SUCCESS** `PREMIUM_UPGRADE`/`MURID_PREMIUM` transaction reference, using the **same canonical formula** from `lib/admin/executive.ts`: MURID monthly 19,000 / MURID yearly 15,000 / GURU monthly 49,000 / GURU yearly 33,250).

```
snapshotMrr        = 120250   (from DailyBusinessSnapshot row, businessDate 2026-09-02)
liveRecomputedMrr  = 120250   (independent read-only recompute)
match              = true
```

**Interpretation:** the snapshot's MRR value is **internally consistent** with an independent recompute using the canonical formula. This **proves the snapshot formula is correct as of its business date**, but it does **not** resurrect any prior MRR history.

---

## 6. Metric-by-Metric Classification (17 metrics)

| # | Metric | Kind | Status | Reconstructable | Window floor / evidence |
|---|--------|------|--------|-----------------|--------------------------|
| 1 | `newUserRegistrations` | user-growth | **FACT** | windowed | `User.createdAt` ≥ 2026-06-28 |
| 2 | `dailyActiveUsers` | engagement | **INFERENCE** | windowed | `XPTransaction` distinct user/WIB-day ≥ 2026-08-03 |
| 3 | `weeklyActiveUsers` | engagement | **INFERENCE** | windowed | same proxy, trailing 7 days ≥ 2026-08-03 |
| 4 | `monthlyActiveUsers` | engagement | **INFERENCE** | windowed | same proxy, trailing 30 days ≥ 2026-08-03 |
| 5 | `retentionCohorts` | engagement | **INFERENCE** | windowed | cohort ≥ 06-28 AND activity ≥ 08-03 |
| 6 | `cashCollected` | revenue | **FACT** | **true** (fully) | `Transaksi` SUCCESS, append-only ledger |
| 7 | `mrr` | revenue | **ASSUMPTION** | needs-snapshot | current-state only |
| 8 | `mrrBreakdown` | revenue | **ASSUMPTION** | needs-snapshot | current-state only |
| 9 | `activePremiumCount` | premium | **ASSUMPTION** | needs-snapshot | current-state only |
| 10 | `premiumByRole` | premium | **ASSUMPTION** | needs-snapshot | current-state only |
| 11 | `activeTrialCount` | premium | **ASSUMPTION** | needs-snapshot | current-state only |
| 12 | `karyaPublished` | content | **FACT** | windowed | `StudentKarya.createdAt` ≥ 2026-07-09 |
| 13 | `ukbiTkaSessions` | learning | **FACT** | windowed | `ProgresKompetensi.startedAt` ≥ 2026-07-07 |
| 14 | `jalurCompletions` | learning | **FACT** | windowed | `UserUnitProgress.completedAt` ≥ 2026-06-29 |
| 15 | `xpAwardedBySource` | gamification | **FACT** | windowed | `XPTransaction` ≥ 2026-08-03 |
| 16 | `growthByRole` | user-growth | **UNKNOWN** | **false** | role mutable, no role ledger |
| 17 | `preMigrationHistory` | cross-cutting | **UNKNOWN** | **false** | dead VPS, not retained |

**Totals:** fully reconstructable **1** · windowed **9** · needs-snapshot **5** · not-reconstructable **2** = **17**.

---

## 7. Metric Audit Count

- **17** investor-relevant historical metrics audited
- **6** classified as FACT (reconstructable from event/ledger data within window: newUserRegistrations, cashCollected, karyaPublished, ukbiTkaSessions, jalurCompletions, xpAwardedBySource)
- **4** classified as INFERENCE (engagement — DAU/WAU/MAU/retention; valid only via XP proxy from 2026-08-03)
- **5** classified as ASSUMPTION / needs-snapshot (MRR, MRR breakdown, active premium, premium-by-role, active trial)
- **2** classified as UNKNOWN / not reconstructable (growth-by-role, pre-migration history)

---

## 8. Architecture Verdict

**Evidence-driven hybrid is REQUIRED, not merely convenient.** The proof establishes:

1. **MRR & premium state are provably NOT reconstructable** from retained data — only mutable current-state survives. → **Keep the append-only `DailyBusinessSnapshot`** (its `mrr` and `activePremium` columns are correctly documented in the schema as "core snapshot data", "NOT reconstructable").
2. **User/engagement/content/learning metrics ARE reconstructable** from primary event/ledger tables — but only within each metric's recorded window. → **Derive these from the primary tables (facts)** rather than materializing them into the snapshot, because their natural floor (e.g., migration start) is earlier/independent of the snapshot start and they are genuine append-only histories.
3. **`ProductEvent` is empty (0 rows)** — it cannot serve as the event source today. It should either be activated and backfilled, or documented as inactive while engagement is sourced from `XPTransaction`.

---

## 9. Backfill Decision

| Metric class | Backfill | Decision |
|--------------|----------|----------|
| MRR, MRR breakdown, active premium, premium-by-role, active trial | ❌ | **DO NOT backfill** — point-in-time composition does not exist for any date before 2026-09-02. Snapshot from now forward only. |
| User growth (windowed) | ✅ | Backfillable from `User.createdAt` for ≥ 2026-06-28. |
| Engagement DAU/WAU/MAU (windowed) | ✅ | Backfillable from `XPTransaction` for ≥ 2026-08-03 (as INFERENCE). |
| Cash collected | ✅ | Fully backfillable from `Transaksi` SUCCESS (true ledger). |
| Karya / UKBI-TKA / Jalur / XP (windowed) | ✅ | Backfillable within each table's floor. |
| growthByRole, preMigrationHistory | ❌ | **UNKNOWN — never estimate.** |

---

## 10. Investor Metrics Contract (what CAN and CANNOT be shown)

**Can be reported historically (with window labels):**
- New user registrations/day (since 2026-06-28)
- Cash collected (full, from `Transaksi` SUCCESS)
- Karya published/day, UKBI-TKA sessions/day, Jalur unit completions/day, XP by source/day (each within its floor)
- DAU / WAU / MAU (as INFERENCE proxy, since 2026-08-03)
- Retention cohorts (only where registration ≥ 06-28 **and** activity ≥ 08-03; early cohorts are not measurable)

**CANNOT be reported as history (must snapshot going forward):**
- **MRR / MRR breakdown** — only the current value (Rp120,250) and the snapshot going forward
- **Active premium count / premium-by-role / active trial count** — only current state (4 / 2+2 / 273)

**NEVER report as history:**
- growth-by-role history (role is mutable/un-ledgered) — current role distribution is a fact, growth is not
- Any metric before 2026-06-28 (pre-migration) — genuinely UNKNOWN

---

## 11. Data-Quality Risks (must be disclosed to investors)

1. **Engagement is a PROXY, not measurement.** DAU/WAU/MAU derive from distinct users writing `XPTransaction` rows. Users whose activity does not emit XP are invisible. `ProductEvent` (the real intent) is empty.
2. **Engagement floor is late (2026-08-03).** No reliable engagement figure exists before the modern gamification engine started.
3. **Retention cannot be validated by timestamp alone.** D7/D30 requires both cohort date ≥ 06-28 and an XP-activity signal ≥ 08-03; many early cohorts lack a valid signal.
4. **Cash ≠ MRR.** Rp438,000 cash collected must never be presented as revenue run-rate; MRR is Rp120,250 (a different concept).
5. **Role is mutable.** The current 1956/484/2 MURID/GURU/ADMIN split is a fact-of-now; historical growth-by-role is not meaningful.
6. **`DailyBusinessSnapshot` has only 1 row** — it is a forward-looking mechanism, not yet a history.
7. **Legacy `XpLedger` (floor 07-28) is a different engine** from `XPTransaction` (floor 08-03); the two must not be summed.

---

## 12. Historical Coverage Summary

| Era | Coverage |
|-----|----------|
| Pre-2026-06-28 (before Supabase migration / VPS era) | **UNKNOWN** — no retained canonical history |
| 2026-06-28 → 2026-08-03 | User growth, cash, karya, UKBI/TKA, Jalur (windowed); **no valid engagement** (pre-XPTransaction) |
| 2026-08-03 → present | Adds engagement (DAU/WAU/MAU, retention) via XP proxy |
| 2026-09-02 → present | Adds **MRR/premium daily snapshot** (from `DailyBusinessSnapshot`) |

---

## 13. Confidence Assessment

| Claim | Confidence | Basis |
|-------|-----------|-------|
| MRR & premium state are NOT historically reconstructable | **High** | Mutable-field dependency confirmed in schema + live; no history ledger exists |
| Cash collected is fully reconstructable | **High** | Append-only `Transaksi` SUCCESS ledger (4 rows, Rp438,000) |
| Engagement is reconstructable only as XP-proxy INFERENCE from 08-03 | **High** | `ProductEvent` empty; `XPTransaction` is the only activity ledger |
| Snapshot MRR formula is internally consistent | **High** | Independent recompute = snapshot (120,250 = 120,250) |
| growthByRole & pre-migration history are UNKNOWN | **High** | No ledger + dead VPS; would require fabrication to estimate |
| Window floors (06-28, 07-07, 07-09, 08-03) | **Medium–High** | From table min timestamps + engine start dates; could shift if rows predating the canonical store are later re-imported |

---

## 14. Script Execution Result

```
npx tsx scripts/historical-metrics-proof.ts
DB status    : READ-ONLY CONNECTED
Reconciliation: snapshotMrr 120250 == liveRecomputedMrr 120250 (match: true)
Metric count : 17 metrics classified
∑ reconstructable=true  : 1
∑ windowed              : 9
∑ needs-snapshot        : 5
∑ not reconstructable   : 2   (1+9+5+2 = 17 ✓)
Wrote        : data/historical-metrics-proof-september-2026.json
```

**QA verification:**
- `npx tsc --noEmit` — **0 errors**
- `npm run test:historical-metrics-proof` — all assertions pass
- JSON validity + report↔JSON numbers cross-check — consistent
- Read-only: 0 writes, 0 migrations, 0 schema changes

---

## 15. Git Status

**No commit, no push.** Only the 3 Phase 9.1 deliverables are new:
```
?? scripts/historical-metrics-proof.ts
?? scripts/test-historical-metrics-proof.ts      (test, part of this QA)
?? data/historical-metrics-proof-september-2026.json
?? docs/HISTORICAL_METRICS_PROOF_SEPTEMBER_2026.md
```
(`scripts/test-historical-metrics-proof.ts` is the contract-mandated "appropriate test" for the forensic script.) No `prisma/`, `app/api/`, `lib/gamification/`, `lib/learning-loop/`, engine, payment, commission, or founder decision-layer files were modified. Out-of-scope local commit `7fd6ad5` and `origin/main` `608603b` are untouched.

---

## 16. Conclusion

The Phase 9.1 proof of correctness **delivers exactly what the contract asked**: it separates **FACT from INFERENCE from ASSUMPTION from UNKNOWN** across 17 investor-relevant historical metrics, **independently reconciles** the one cross-cutting formula that *can* be validated (MRR = 120,250, matching the snapshot), and lands a clear architecture verdict:

> **Keep the append-only `DailyBusinessSnapshot` for MRR/premium (core, non-reconstructable); derive engagement/user/content/learning from primary event tables (facts, windowed). Do not backfill MRR/premium. Never estimate UNKNOWN.**
