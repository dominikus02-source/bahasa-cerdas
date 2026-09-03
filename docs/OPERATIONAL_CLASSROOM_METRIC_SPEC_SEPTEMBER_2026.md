# Operational Classroom Metric Specification

**Phase 8 deliverable · September 2026 · SPECIFICATION ONLY (no code/migration/writes/commit).**
This is the precise, mechanically-verifiable definition of the **Activation metric** (primary) and the **North Star operational metric** (Operational Classrooms), plus every secondary metric and guardrail, and the exact SQL/Prisma derivations. Every figure here must be reproducible from the existing schema (`prisma/schema.prisma`) as of September 2026.

---

## 1. Metric Inventory (all derive from existing schema unless marked "event")

### O1 — ACTIVATION (primary experiment metric)
> **% of GURU in a cohort who created ≥1 class.**

- Numerator: distinct `userId` with `Group.teacherId = userId` (class created), among cohort members.
- Denominator: cohort = distinct `User.role = "GURU"` (non-founder for the organic figure), `User.onboarded = true`.
- Baseline (2026-09-03): **11.2%** (54/484). Target: **≥25%**.
- Schema: `User` (`role`, `isFounder`, `onboarded`), `Group` (`teacherId`, `createdAt`).
- Reported: with-founders and ex-founders.

### O2 — ACTIVATION sub-stage: first-code-share (F4)
- **Derivable proxy (default):** first `GroupMember.joinedAt` for the group (a code was shared ⇒ a student was able to join). If the additive `ProductEvent` layer ships, the canonical event is the code-share click.
- Because the join is the *observable* act, we never claim a "share" happened without at least a join or the event.

### O3 — NORTH STAR OPERATIONAL METRIC — Operational Classrooms (trailing-30d)
> A `Group` where **X** (teacher shipped ≥1 artifact, 30d) **AND Y** (≥3 distinct active students) **AND Z** (student activity evidence, 30d), all within the trailing-30d window.

Defined precisely in the companion experiment spec §2. **Computed = 0 today (uncomputed).** This is the single North Star number for the strategy doc's *"Operational Classrooms (active teacher-classrooms, trailing 30 days)."*

### Secondary metrics (max 5 — choose these)
| # | Metric | Definition | Schema source | Baseline 2026-09-03 |
|---|--------|-----------|---------------|---------------------|
| S1 | Class→artifact | % class-creators with ≥1 artifact (any type, all-time). | `Penugasan`/`QuizAssignment`/`MateriKirim`/`Pengumuman`/`StudentKarya` | **14.8% (8/54)** |
| S2 | Artifact velocity | Avg artifacts per teacher per week (trailing-30d). | X artifacts' `createdAt` | ~0 |
| S3 | Student XP-activation | % grouped students with ≥1 Z-evidence (30d), per group / per teacher. | `XPTransaction` + Z-rows | ~30–97% (by teacher) |
| S4 | Weekly returning teachers | Teachers with ≥1 X-artifact in trailing-30d (the "artifact-producing, active teachers" proxy). | X artifacts | **2 (30d)** |
| S5 | 30d teacher activation | % GURU with ≥1 Z/X-activity in trailing-30d. | composite | **0.4% (2/484)** |

These 5 are the dashboards' secondary set (kept under the max-5 cap; Operational Classrooms and Activation are the two primary tiles and are not counted inside the "5 secondary").

### Guardrails (max 5)
| # | Guardrail | Purpose |
|---|-----------|---------|
| G1 | Founder separation (with/ex founders on every cohort tile) | Prevent founder data from masking organic market pull. |
| G2 | No Double-Award | Teacher XP on join is idempotent via `@@unique[userId, source, reference]` — replay-safe. |
| G3 | Honest proxies | F4/F8 approximations are labeled; never fabricate historical events. |
| G4 | Rate-limit discipline | Any new event/API uses the existing `rateLimitRoute` (30/60s, session-scoped). |
| G5 | Protected zones | 6 protected files + `User.xp` denormalized flag are read-only; no prod data written. |

---

## 2. North Star Definition — exact Z (student-activity evidence)

A `GroupMember` (non-teacher member) counts toward **Y** and **Z** in window `W = [now - 30d, now]` if ANY of the following exists with `createdAt`/`joinedAt`/`completedAt` in `W`, joined via `GroupMember.userId = <student>` and `GroupMember.groupId = <group>`:

1. **`XPTransaction`** `userId` with `createdAt ≥ W.start` (source-agnostic — Jalur Cerdas, ARENA, UKBI, etc. all count student learning).
2. **`QuizSubmission`** completed in `W` (student answered a class quiz).
3. **`UserUnitProgress`** or **`ProgresKompetensi`** completed in `W` (student finished a unit/portal).
4. **`StudentKarya`** published in `W` (student wrote a karya; Karya is the highest-activation feature).

**Y** requires ≥3 *distinct* students (distinct `userId`) each with ≥1 Z-evidence in `W`. **X** requires ≥1 teacher artifact (X-type record) with creator `userId = Group.teacherId` (or, for `StudentKarya`, the karya is timed + the group association via the teacher's class) in `W`. All legs use the **same** `W`.

### Deterministic tie-break
Where a group could satisfy a leg via multiple rows, use the earliest qualifying timestamp to define `operationalSince = max(earliestX, earliestY, earliestZ)`. A group re-enters/leaves Operational status as trailing-W rolls; the dashboard reports **currently-Operational** (point-in-time) plus a count of **groups that were Operational at least once in the last 90d**.

---

## 3. Verified Measurability (every metric is truly derivable — no assumptions)

| Metric | Direct schema field | Assumption? |
|--------|---------------------|-------------|
| Activation (F3) | `Group.teacherId` | No — deterministic. |
| Onboarded (F2) | `User.onboarded` | No. |
| First join (F5/F6) | `GroupMember.joinedAt` | No — deterministic. |
| Z evidence | 5 transactional tables' timestamps | No — deterministic. |
| X artifact | 5 artifact tables' `createdAt` | No. |
| Operational Classroom | composite X∧Y∧Z | No — spec'd, deterministic. |
| Code-share (F4) | — | **YES — proxy via join, or new event.** |
| Teacher session (F8) | — | **YES — no auth table → artifact proxy.** |

The two **assumption** metrics are the only ones not strictly schema-derivable, and both are explicitly handled (proxy + optional persistence layer) rather than hidden.

---

## 4. Refresh Cadence & Timezone

- All date windows use **Asia/Jakarta (WIB, UTC+7)**, day boundaries at 00:00 WIB, consistent with `lib/admin/analytics-timezone.ts`.
- Operational-Classroom + secondary tiles refresh at most every **5 minutes** (cache); the frozen baseline is a point-in-time snapshot written once at T-0 and never recomputed for the cohort-period comparison.

---

## 5. Metric Anti-Patterns (Do-Nots)

- **Do not** use the denormalized `User.xp > 0` flag as the Z proxy — it is a stale denormalized flag, not an event log (forensic note). Use the transactional Z-rows.
- **Do not** count the same student twice in Y (distinct `userId`).
- **Do not** count a founder teacher's class toward the *activation experiment denominator*; their classes are reported under "with founders" only.
- **Do not** present class-creation (Activation) as if it were Operational Classes — keep separate definitions, separate tiles (`O1` vs `O3`).
