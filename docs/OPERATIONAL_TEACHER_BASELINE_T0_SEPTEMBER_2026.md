# Operational Teacher Baseline — T-0 (September 2026)

**Snapshot:** `OPERATIONAL_TEACHER_BASELINE_T0` · version 1.0
**Frozen:** 2026-09-08 · **Timezone:** Asia/Jakarta (WIB, UTC+7)
**Immutable.** Do NOT mutate — future snapshots must be new versioned files compared against this one.
**Machine-readable:** `data/operational-teacher-baseline-t0-september-2026.json`

---

## 1. Purpose

Frozen pre-experiment baseline for the **Operational Teacher Experiment (P0 #7)**. Every figure here is the state BEFORE the experiment starts, so post-launch deltas are attributable. Two headline metrics are kept **separate** (never collapsed, per `scorecardItem16Baseline = 3`):

| Metric | Value @ T-0 | Target |
|--------|-------------|--------|
| **O1 — Activation** (% cohort GURU with ≥1 class) | **11.2%** (54 / 484) | ≥ 25% |
| **O3 — Operational Classrooms** (X∧Y∧Z trailing-30d) | **0** | first-ever → growth |

Plus the **Class→Artifact Wall**: only **14.8%** (8 / 54) of class-creators have shipped ≥1 artifact.

---

## 2. Canonical Definition (locked at T-0)

All computed via `lib/analytics/operational-classrooms.ts` (require production DB access):

- **Z evidence** — NEVER legacy `User.xp`. Only: `XPTransaction`, `QuizSubmission(submittedAt)`, `UserUnitProgress(completedAt)`, `ProgresKompetensi(finishedAt)`, `StudentKarya(createdAt)`.
- **Y** — ≥3 DISTINCT `GroupMember.userId` each with ≥1 Z evidence (studentFloor 3, target 5).
- **X** — teacher artifact for the group: `Penugasan`, `MateriKirim`, `Pengumuman`, `QuizAssignment` (whose `Quiz.creatorId = group.teacherId`), OR ≥1 `StudentKarya` into the group by a member.
- **Operational Classroom (30d)** = Group where **X AND Y AND Z** over the same trailing-30d WIB window.
- **Founder separation** — every cohort reported with-founders AND ex-founders (organic). Non-founder = `role GURU && !isFounder`.
- **Activation** = % GURU (onboarded, non-founder for organic) with ≥1 `Group`.

---

## 3. Figures at T-0

| Stage | Value |
|-------|-------|
| F1 Registered GURU | 484 (ex-founder), 486 (with founders) |
| F2 Onboarded | pending live count |
| F3 Created first class (CLIFF) | 54 → **11.2%** of F1 |
| F4 Code shared | proxy = F5 (native `ProductEvent.class_code_shared` capture begins at deployment) |
| F5 First student joined | pending live count |
| F6 3rd/5th student joined | pending live count |
| F7 Student Z-evidence | pending live count |
| F8 Teacher session | proxy = first artifact after class create (native `ProductEvent.teacher_session` begins at deployment) |
| F9 Class used | pending live count |
| F10 Operational Classroom | **0** |

Confirmed at T-0: **484 / 54 / 11.2%** (source: `data/teacher-growth-forensic-september-2026.json`, `B_teacherFunnel`). Operational Classroom baseline = **0** (definition locked; no live calc existed at T-0).

---

## 4. Honest Data Note

Local production DB is **unreachable** (`.env.local` holds `[SENSITIVE]`). Therefore T-0 freezes the **methodology** and the **confirmed** figures (F1, F3, O1, O3, Class→Artifact wall) drawn from prior read-only forensics, while leaving F2/F5/F6/F7/F8/F9 as `null` "pending live canonical recomputation". When production DB access is available, `getTeacherActivation()` / `getOperationalClassrooms()` / `getTeacherFunnel()` will fill these — and MUST be recorded in a NEW versioned snapshot for comparison, never by editing this file.

---

## 5. Protected / Not Modified

- No prod DB writes. No migrations applied (ProductEvent table pending explicit approval).
- Protected files verified 0 diff: `docs/FOUNDER_DECISION_LAYER.md`, `app/(dashboard)/admin/executive/page.tsx`, `app/(dashboard)/admin/page.tsx`, `lib/admin/executive.ts`, `lib/admin/founder-health.ts`, `scripts/test-founder-health.ts`.
- No `git add` / `git commit` / `git push`.
