# Teacher Activation Analytics Specification

**Phase 8 deliverable · September 2026 · SPECIFICATION ONLY (no code/migration/writes/commit).**
This document specifies the **analytics/measurement layer** for the Operational Teacher Experiment: funnel instrumentation, dashboards (≤10 metrics), event audit, the launch gate, and a realistic measurement plan that confronts the RED event-tracking gap head-on.

---

## 1. Funnel Instrumentation

The funnel (F1–F10, defined in the experiment spec §3) maps to sources as follows:

| Stage | Source | Instrumentable today? |
|-------|--------|----------------------|
| F1 Registered GURU | `User.role="GURU"` | ✅ schema |
| F2 Onboarded | `User.onboarded` | ✅ schema |
| F3 Created first class (CLIFF) | `Group.teacherId` | ✅ schema |
| F4 Code shared | first `GroupMember.joinedAt` (proxy) OR new event | ⚠️ proxy / P0 #7 |
| F5 First student joins | `GroupMember.joinedAt` | ✅ schema |
| F6 Nth student (3/5) | `COUNT(GroupMember)` | ✅ schema |
| F7 First student activity | Z-evidence tables | ✅ schema |
| F8 Teacher returns (7d) | first artifact after class create (proxy) | ⚠️ proxy |
| F9 ACTIVATION | F3 reached | ✅ schema |
| F10 OPERATIONAL CLASSROOM | X∧Y∧Z composite | ✅ schema (composite) |

**Decision (from experiment spec §7):** derive everything schema-backed now; add an **additive `ProductEvent` persistence layer (P0 #7)** so F4 and F8 — and all future funnel stages — become first-class. The layer:
- is a **new table + write route** (additive-only; does NOT modify `lib/analytics/product-track.ts` behavior).
- keeps the existing console-logging behavior intact (no regression).
- is rate-limited with the existing `rateLimitRoute` guard (30 req/60s, session-scoped, not per-IP).
- **cannot backfill the past** — explicitly not attempted; historical funnel = schema-derivable stages only.

---

## 2. Dashboards (MAX 10 metrics per dashboard)

### 2a. Founder Control Tower addition (read-only widget, no change to protected files)
The protected `lib/admin/executive.ts` + `executive/page.tsx` are the single source of truth and **must not be modified**. The analytics spec therefore defines a **separate, additive** Operational-Teacher panel (own data-access module that *calls* — does not edit — `lib/admin/executive.ts`) with **≤10 tiles**:

| # | Tile | Metric def |
|---|------|-----------|
| 1 | Activation % (cohort) | O1 class-creation % |
| 2 | Operational Classrooms (30d) | O3 composite |
| 3 | Class→artifact % | S1 |
| 4 | Artifact velocity (teachers/wk) | S2 |
| 5 | Student XP-activation (avg over groups) | S3 |
| 6 | Weekly returning teachers | S4 |
| 7 | 30d teacher activation | S5 |
| 8 | Grouped students (non-founder) | absolute from `GroupMember` |
| 9 | Orphan groups (created >7d, 0 artifacts) | for P0 #5 |
| 10 | Current event/funnel health (event volume, proxy flags) | instrumentation health |

All tiles show **with-founders AND ex-founders (organic)** (guardrail G1). Tile count stays at 10 (global max).

### 2b. Teacher-facing activation visibility (drive behavior)
A compact per-teacher card (not a founder dashboard): **"X dari Y muridmu aktif minggu ini"** (S3 for that teacher's groups) + current Operational status of each of their groups. This is P0 #3c and closes the visibility loop.

---

## 3. Launch Gate (MAX 10 checks — quantified pass conditions)

Reuse the 10 checks in the experiment spec §10 (baseline frozen, protected files 0 diff, no prod writes, Activation≠NorthStar separated, founder separation, honest proxies, `/api/group` single source, XP idempotent, rate-limited, CI green). All 10 must pass before ship.

---

## 4. Realistic Measurement Plan (confronts the RED gap + power)

1. **T-0 freeze:** snapshot baseline (F1/F3/S1–S5/O3) from schema into `data/operational-teacher-experiment-spec-september-2026.json` **before** any P0 ships. This is the honest control.
2. **Pre/post cohort:** measure Activation (O1) for teachers onboarded in the N days pre-ship (control) vs post-ship (treatment). Report funnel stage-deltas per P0 (each P0's stage contribution) rather than one pooled lift.
3. **North Star tracking:** record first-ever Operational Classrooms (O3 > 0) and week-over-week count; this is a lagging target, expected to appear after 2–4 weeks, not in the first cycle.
4. **Statistical honesty:** population ≈ few hundred → **cannot reach powered p<0.05** from available data. Declared; PASS = directional lift on Activation + sustained O3 > 0 + class→artifact ≥ 30% target. No fake p-values.
5. **Event audit:** run `npm run audit`-style read-only check that any F4/F8 proxy is labeled, and that no historical fabricated event counts exist.

### 5. Validation Requirements (this phase — read-only)
- `data/...json` parses; exactly 18 keys.
- Every metric/event name in the JSON exists in §1/§2 tables (referential integrity).
- No unsupported claims, no internal contradictions.
- Protected files (6) → 0 diff. No production data modified (0 migrate, 0 `updateMany({})`).
- If a TS artifact is created it is `tsc`-checked (none created in this phase; the additions are spec docs + JSON data).

---

## 6. Do-Nots

- Do not modify `lib/analytics/product-track.ts`, `app/api/analytics/product-event`, or any protected file.
- Do not log correctAnswer/answer-key into any event payload.
- Do not fabricate backfilled event counts or a powered test.
- Do not exceed 10 dashboard tiles or 5 P0 changes or 5 guardrails or 10 launch-gate checks.
- No code, no migration, no production data write in this phase.
