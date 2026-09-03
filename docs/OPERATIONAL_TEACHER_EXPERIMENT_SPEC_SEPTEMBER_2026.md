# Operational Teacher Experiment — Implementation Specification

**Phase 8 deliverable · September 2026**
**Status: SPECIFICATION ONLY — no code, no DB changes, no migrations, no production writes, no commit/push.**
This document translates the Founder Decision Layer into a precise engineering/product implementation specification for the **Operational Teacher Experiment**. It is deliberately non-log-line — it does **not** build anything; it tells the implementer exactly what to build, how to measure it, and how to gate the launch.

Companion documents:
- `docs/OPERATIONAL_CLASSROOM_METRIC_SPEC_SEPTEMBER_2026.md` — the precise definition of the Activation vs North Star metrics and how each is computed.
- `docs/TEACHER_ACTIVATION_ANALYTICS_SPEC_SEPTEMBER_2026.md` — the analytics/dashboard spec (funnel instrumentation, dashboards, launch gate, measurement plan).
- `data/operational-teacher-experiment-spec-september-2026.json` — machine-readable digest of every section.

---

## 1. Problem Frame (from Phase 7 evidence — do not re-derive, preserve)

- Readiness **3.2/10 — NOT READY TO RAISE**; the investor scorecard's #16 "De-risk milestone clarity" is scored 3 because *the primary bottleneck + the ONE experiment* is defined but **not yet executed**.
- Primary bottleneck = **teacher activation**, not registration, not features.
- **North Star operational metric (the strategy doc's definition, preserved verbatim):** *Operational Classrooms (active teacher-classrooms, trailing 30 days).*
- Registration→activation cliff: **484 registered GURU → only 54 (11.2%) ever created a class → only 8 (1.7%) ever produced a teaching artifact.**
- Class→artifact wall: **8/54 creators (14.8%) produce any artifact; 96% of creators go inert after class creation.**
- Only **2 teachers active in the last 30d**; **1,254 grouped students** held by the engaged few.
- **Founder dependence:** 3 founder teachers (Alexander 180, Dominikus 133, Washadi 90) hold **32%** of grouped students.
- No "operational classroom" is currently computed anywhere; the North Star is currently **uncomputed**.

### Playbook evidence (do not gamify arbitrarily)
Success is rare, decoupled from registration, but **highly repeatable** and demographically real:
- **Playbook A — "Class Operator"** (assignments + quizzes): Dorothea 169st/91 active, Ibrahim 117st/117 active (30d), Elli 57st/33 active.
- **Playbook B — "Literasi Publisher"** (karya): Karina 155st/149 active / 131 karya, Christanti 59st/56 active, Wahyu 36st/32 karya.
- Artifact-producing teachers see **54–97% student XP-activation** vs **~30%** for passive creators.

### Non-negotiable framing principle
> **Do NOT collapse the Activation metric into the North Star operational metric.** They are two different quantities that must be tracked separately:
> - **Activation metric** = class-creation rate (the cliff). Phase 7 explicitly warns: *"If evidence only supports class-creation as the first experiment metric, do NOT collapse Activation metric vs North Star operational metric."*
> - **North Star operational metric** = Operational Classrooms (trailing 30 days), which requires artifacts + student XP activity — evidence only supports measuring this once a class is genuinely operational.

---

## 2. The Operational Classroom Definition (X / Y / Z)

The North Star must be **measurable from existing schema** today (no ProductEvent table exists — see §7), grounded in the forensic evidence.

An **Operational Classroom** is a `Group` (class) that simultaneously satisfies **X, Y, Z** within a fixed **trailing-30-day window**:

| ID | Condition | Definition | Schema source | Forensic grounding |
|----|-----------|------------|---------------|--------------------|
| **X** | Teacher ships ├≥1 teaching artifact™ in the last 30d | A `Penugasan` (assignment) **or** `QuizAssignment` **or** `MateriKirim` **or** `Pengumuman` **or** ≥1 student `StudentKarya` published in the group, created by the teacher (or into the group) within trailing-30d. | `Penugasan`, `QuizAssignment`, `MateriKirim`, `Pengumuman`, `StudentKarya` (joined via group). | Playbook A/B both require ≥1 artifact; 96% of creators fail here. Artifact is the retention wall. |
| **Y** | ├≥3 distinct active students in the group | ├3 distinct `GroupMember` rows (non-teacher) whose student has **student-activity evidence** in trailing-30d (see Z definition). | `GroupMember`, `XPTransaction`, `UserUnitProgress`, `ProgresKompetensi`, `QuizSubmission`, `StudentKarya`. | "invite/activate 5+ students" is the strategy's operational target; the *minimum legible* threshold is 3 (evidence: Dorothea/Elli/Ibrahim all far exceed it; a class with ≥3 XP-active students is unambiguously "in use"). **3 is a floor, not a target** — target cohort behavior is 5+. |
| **Z** | Student-activity evidence | A student with any of: ≥1 `XPTransaction` row in trailing-30d, OR completed a `QuizSubmission`, OR completed a `UserUnitProgress`/`ProgresKompetensi` unit, OR published a `StudentKarya`, in the trailing-30d window (joined via `GroupMember`). | See Y column. | Aligns with forensic proxy `User.xp > 0`, but replaces the denormalized `User.xp` flag with **explicit transactional/activity rows** so it is date-bounded and does not lie on legacy `User.xp` (which is not event-logged). |

**Operational Classroom (trailing-30d) = `Group` where (X) TRUE AND (Y) TRUE AND (Z) TRUE**, all measured over the same trailing-30-day window.

### Why X∧Y∧Z and not a subset
- **X without Y/Z** = a class with artifacts but no students doing anything — this is the "dead-on-arrival" class the forensic says 96% of creators make. Excluded.
- **Y/Z without X** = a passive class where students happen to earn XP on their own (Jalur Cerdas/arena). Excluded — the teacher is not operating it.
- **X∧Y∧Z together** = a teacher actively running a living classroom. This is the only definition that matches every playbook reference teacher and is the correct North Star.

### X/Y/Z dashboards
Per-metric X, Y, Z counts are reported separately so the founder can see *which* leg is missing (gap isolation) — never only the composite.

---

## 3. Teacher Conversion Funnel (each stage maps to a schema-derivable source)

| # | Stage | Definition | Source (existing schema) | Event-gap? |
|---|-------|------------|--------------------------|-----------|
| F1 | **Registered GURU** | `User.role = "GURU"` (excludes ADMIN/founder from population denominator **for activation-rate reporting**, but founder teachers ARE counted for raw absolute class counts — see §6). | `User` | none |
| F2 | **Onboarded** | `User.onboarded = true` AND redirected past `/guru/onboarding`. | `User.onboarded` | none |
| F3 | **Created first class** ← **THE CLIFF** | `Group` created with `teacherId = user.id`. Baseline 54 creators / 484 = **11.2%**. | `Group.teacherId` | none |
| F4 | **Invited / code shared** | Teacher copied or viewed their class `accessCode` (the onboarding share step). **Not persisted today** — no "code viewed/copied" event exists. | **Spec: new event** (P0 #3g), or infer via first `GroupMember` join. | ⚠️ see §7 |
| F5 | **First student joined** | First `GroupMember` row for a non-teacher `userId` in that `Group` (`joinedAt`). Count students via `GroupMember` — join does **not** currently award teacher-XP or celebrate; that is exactly the moment we instrument. | `GroupMember.joinedAt` | none (derivable) |
| F6 | **Nth student joined (3 / 5)** | `COUNT(GroupMember)` for the group reaches 3 (legibility floor), then 5 (strategy target). | `GroupMember` | none (derivable) |
| F7 | **First learning activity by a student** | First Z-type evidence for the group's students (see §2). | `XPTransaction`, `QuizSubmission`, `UserUnitProgress`, `ProgresKompetensi`, `StudentKarya` | none (derivable) |
| F8 | **Teacher returns within 7d** | Teacher has ≥1 X-type artifact OR explicit teacher session in the 7d after class creation. Teacher "session" is **not** reliably persisted (no auth-event table → use artifact as the proxy, or spec a lightweight `SESSION` event). | `Penugasan`/`QuizAssignment`/etc. `createdAt` | ⚠️ proxy (no session table) |
| F9 | **ACTIVATION (primary metric)** | Class created — i.e., **F3 reached** by ≥25% of a cohort's non-founder GURU (against ~11.2% baseline). This is the **experiment's primary Activation metric**. | `Group.teacherId` | none |
| F10 | **OPERATIONAL CLASSROOM (North Star)** | X∧Y∧Z within trailing-30d (i.e., **F7→F8 sustained** + Z). This is the **North Star operational metric**. | composite (§2) | none (composite) |

**Instrumentation reality (must be called out):** F4 and F8 have **no reliable timestamp in existing schema** (code-share and teacher "session" are not persisted). Everything else is derivable today. The analytics spec therefore: (a) derives F1–F3/F5–F7/F9/F10 from existing schema with zero product changes, and (b) **starts a small, additive persistence layer** (a `ProductEvent` table — P0 #7) so F4/F8 and all future funnel stages become first-class. The sovereign choice is **not to fake F4/F8 from guesses**; it is to persist real events moving forward (backfill impossible for the past).

---

## 4. Population, Control, Treatment

### Population
- **Cohort definition (inclusion):** `User.role = "GURU"` and `User.isFounder = false` (non-founder, operational teachers only — the population the investors care about; founder teachers are excluded from the *activation experiment denominator* because their traffic is not organic).
- **Exclusion:** founder/ADMIN userids (Alexander, Dominikus, Washadi and any `isFounder=true`). A clean seed-ready definition lives in the analytics spec §3.
- **Sample frame at T-0 (Sept 2026):** 484 GURU total → ~481 non-founder → ~54 who created a class (of which ~51 non-founder). **Statistical power caveat:** with a population on the order of a few hundred registrations and only ~11.2% crossing F3, we **cannot compute a conventional powered A/B on F9/F10 in a short window**. The spec therefore uses a **before/after cohort + funnel-lift** design (see §5) and explicitly states power cannot be reached from available data — consistent with the founder-decision realism requirement.

### Control
- **No-treatment group = the baseline cohort.** For the first experiment (an onboarding experience shipped to all new teachers — not a per-user flag, see §5 treatment), the cleanest honest control is the **pre-ship baseline**: the T-0 registered/created/first-artifact/operational rates (11.2% → 1.7% → ~0). The launch gate requires the baseline to be frozen and snapshotted **before** any of the 5 P0 product changes ship.

### Treatment
- **Group:** all **new** non-founder GURU who reach the guru onboarding after go-live (T0) receive the new "Operational Teacher" onboarding experience (P0 #1/#2/#3). **Existing/legacy teachers are in the control baseline and are not re-onboarded** (avoid re-running a one-time moment — but existing creators who no-op can also serve as a staggered lagging control).
- **Randomization:** full random assignment to treatment vs control is **not available** for a product-onboarding change without a feature-flag framework. We therefore use a **staggered/time cohort design**: (control) teachers onboarded in the N days *before* go-live vs (treatment) teachers onboarded *after*. If the founder later wants a true A/B on a *narrow* decision (e.g., Playbook A vs B selection), we spec that as a **flag-gated** sub-experiment (P0 #3f) — that one CAN be randomized because it's a widget choice, not a one-time onboarding.

---

## 5. Coarse Design & Hypothesis (the ONE experiment)

### The one de-risking experiment (scorecard #16)
> **Hypothesis H1 (activation lift):** Routing new non-founder GURU through an "Operational Teacher" onboarding that (a) creates the first class, (b) shares the access code, and (c) guides ≥1 artifact + ≥3 student activation in the first ~10 minutes **raises the class-creation (activation) rate from the 11.2% baseline toward ≥25%** for new-teacher cohorts, and raises operational-classroom count thereafter.

**Success criteria (Activation vs North Star kept separate):**
| Metric | Baseline (2026-09-03) | Success threshold |
|--------|------------------------|-------------------|
| **Activation** — % GURU in cohort who create ≥1 class | 11.2% | **≥25%** (strategy target) |
| **North Star** — Operational Classrooms (trailing-30d) | 0 (uncomputed) | First N>0 operational classrooms sustained; strategy target 2 → 15 artifact-teachers |
| Class→artifact (% creators producing ≥1 artifact) | 14.8% (8/54) | ≥30% |
| 30d teacher activation | 0.4% (2/484) | ≥1.5% |

### Design realism
- Cannot compute statistical power from available data (population ≈ few hundred; low crossing rate). **Explicitly stated**, not faked.
- The first experiment's **primary metric is Activation (class creation)** because that is the only stage with *both* (a) enough baseline signal to measure and (b) a clear causal path from the treatment. The **North Star (Operational Classrooms) is the lagging outcome** tracked in parallel but not expected to reach significance in the first 2-week cycle — it compound from activation.

---

## 6. Founder-Concentration Policy (Measurement & Ethics)

- **Founder teachers are NOT gamified and are NOT part of the activation experiment denominator** (they are `isFounder=true`), but their **absolute** class/student numbers are tracked separately (they currently hold 32% of grouped students) so the investor narrative can show **ex-founder** ("non-founder organic") operational-classroom WAU/MAU, isolating real market pull from founder data.
- **Rule:** every North Star / activation dashboard MUST report two figures for the primary cohort rows: *"with founders"* and *"ex-founders (organic)"*. The scorecard and investor narrative consume the **ex-founders** figure as the decisive one.
- Risk signal: `lib/guru/risk/signals.ts` already produces P8C teacher-risk/withdrawal events; the analytics spec keeps risk signals separate from the experiment metrics (guardrail, not a metric).

---

## 7. RED Event-Tracking Gap (must inform measurement, not be glossed over)

- `lib/analytics/product-track.ts` (`trackProductEvent`) is **client fire-and-forget** `POST /api/analytics/product-event`.
- The route enforces an **ALLOWED_EVENTS allowlist** (main + `gcs_*` + P8C `teacher_risk`/`withdrawal` events) and **only logs to structured console — NO DB persistence; NO `ProductEvent` table exists in `prisma/schema.prisma`**.
- Consequence: **the funnel cannot be measured retroactively from events.** All historical/baseline metrics MUST be derived from the existing transactional schema (Group, GroupMember, XPTransaction, QuizSubmission, UserUnitProgress, ProgresKompetensi, StudentKarya, Transaksi). This is fully feasible for F1–F3/F5–F7/F9/F10.
- F4 (code shared) and F8 (teacher session) have **no persisted timestamp**. Two options (both in-scope decisions for the founder):
  - **Default (recommended):** derive everything from schema today; add a spec'd **additive `ProductEvent` persistence layer** (P0 #7 — a new table + a route that writes, additive-only, no tolerance on existing events) so F4/F8 and future funnel stages become measurable going forward. **Backfill is impossible for the past** — accept this, do not fabricate.
  - Alternative: treat F4/F8 as **proxies** (first `GroupMember` join for F4; first artifact after class create for F8) and mark them clearly as approximations in dashboards.

---

## 8. P0 Product Changes (MAX 5 — do not exceed)

The experiment requires at most **five** P0 product changes. Nothing here is built in Phase 8; each is a crisp, buildable spec. (The persistence layer is counted as a sixth additive system change below — see note.)

| # | P0 Change | What it does | Why it's P0 | Metric it moves |
|---|-----------|--------------|-------------|-----------------|
| **1** | **"Operational Teacher" onboarding rewrite** (`/guru/onboarding`) | Reorder the existing 4-step flow so "Create class + 'Bagikan Kode Kelas'" is step 1–2, visibly the value, and guides a **~10-minute** path: name → grade → create class → auto-copy access code → "Kirim ke murid" → "Buat materi/tugas pertama". Reuse existing `/api/group` POST; keep single source of truth. | Directly attacks the F3 cliff with the highest-leverage moment. | Activation (F3), F4 |
| **2** | **First-week "3-artifact in 7 days" checklist** | Empty-state CTA on uniform surfaces (Pengumuman/Materi/Tugas/Bank Soal) encoding Playbook A/B; completes day-7 = "≥1 artifact + ≥1 student activated". | Targets the artifact retention wall (96% churn). | F7→F8, X leg |
| **3** | **Teacher reward/feedback on class-join + first student activity** | (a) award teacher XP on first `GroupMember` join via existing `XPTransaction` idempotent pattern (`@@unique[userId, source, reference]`); (b) celebrate "Murid pertamamu bergabung!"; (c) surfacing "X dari Y muridmu aktif minggu ini" (XP-activation visibility), Playbook A/B choice, code-copy event. | The join moment is currently silent (RED gap); this rewards value-creating behavior the evidence supports (student density → activation). | F5–F7, Z leg |
| **4** | **AI→Class routing CTA** | After first AI generation (RPP/Soal/PPT) → "Kirim hasil ke kelas?" → create-class CTA for the 73 AI users who never made a class. | Reuses the widest door; attacks the ~430 non-creator pool. | F1→F3 |
| **5** | **Orphan-group re-activation** (post-ship, not launch-blocked) | Detect class created >7d with 0 artifacts (orphan) → email/push "3-step starter". Target the existing ~108 orphan groups. | Cheapest LTV win; re-activates dormant creators rather than new DDA. | F8→F9 |

**Sixth (additive, recommended but counted against architecture not the 5-customer-facing P0s):** a minimal **`ProductEvent` persistence** layer (new table + write path) so F4/F8 and all future funnel stages are first-class going forward. This is additive-only and does not alter any existing event/logging. Keep it **outside the 5 P0 product changes** if the founder wants exactly 5 customer-facing changes; it is a behind-the-scenes telemetry addition. Decide explicitly to avoid ambiguity.

---

## 9. UX Journey (target ~10-minute first session)

New non-founder GURU after login → `/guru/onboarding`:

1. **Welcome + why** — "Siapkan kelas pertamamu dalam ~10 menit."
2. **Create class** (name + grade + tahun ajaran) → POST `/api/group` → **auto-copy access code** (F4 code-share icon + "Bagikan Kode Kelas") — instant value, no dead-end.
3. **Invite students** — modal "Bagikan kode / tautan gabung ke murid" (murid join via `/murid/gabung-kelas` or `/arena/gabung-kelas`). State the 5-student target.
4. **First artifact CTA** — "Buat Materi/Tigas/Pengumuman pertama" (empty-state, Playbook A) OR "Luncurkan Tantangan Menulis" (Playbook B one-click template with theme + due date). Choose-your-playbook widget.
5. **Visibility loop** — "Lihat murid yang sudah aktif" (XP>0) + "X dari Y muridmu aktif minggu ini."
6. **First-week checklist** persists as a card on `/guru/beranda` until ≥3 artifacts and ≥1 active student.

No page is rewritten here — Phase 8 only *specifies*; the journey is the target behavior for the P0 build.

---

## 10. Launch Gate (MAX 10 checks)

Shipment of the 5 P0 changes is blocked unless ALL of the following are true:

| # | Check | Pass condition |
|---|-------|----------------|
| 1 | Baseline frozen | T-0 activation/operational/artifact baselines snapshot to `data/operational-teacher-experiment-spec-september-2026.json` + to the executive page (read-only helper) BEFORE any P0 ships. |
| 2 | Protected files untouched | `git diff` shows zero changes to the 6 protected files. |
| 3 | No prod data modified | All metrics derivable from read-only schema; no migration, no `updateMany({})`, no data write in the experiment path. |
| 4 | Activation ≠ North Star | Dashboard renders Activation (class-creation %) and Operational Classrooms as distinct tiles with distinct definitions. |
| 5 | Founder separation | Every cohort row shows with-founders AND ex-founders figures. |
| 6 | Event audit honest | Any F4/F8 proxy is labeled "approximation"; no fabricated historical event counts. |
| 7 | Onboarding reuses `/api/group` | No parallel class-creation path created; single source of truth. |
| 8 | XP reward idempotent | Teacher XP on join uses `@@unique[userId, source, reference]`; replay-safe (no double award). |
| 9 | Rate limits respected | Any new event/API under the existing `rateLimitRoute` guard (30/60s pattern), session-scoped, not per-IP. |
| 10 | CI green | `npx tsc --noEmit`, ESLint, the existing test suite (gamification-engine, guru-phase, AI-tools-audit) are green with the P0 build. |

---

## 11. Implementation Order

1. **Instrument** (foundation, required first): add `ProductEvent` persistence + funnel event hooks (F4 code-share, teacher session) — Initiative 1. *No behavior change.*
2. **Derive baseline** from schema into the frozen snapshot; wire Activation + Operational-Classroom tiles into the (protected, read-only) executive page via `lib/admin/executive.ts`.
3. **Ship P0 #1** (Operational Teacher onboarding rewrite) + **#3** (class-join reward/XP-activation visibility).
4. **Ship P0 #2** (7-day checklist) + **#4** (AI→Class CTA).
5. **Ship P0 #5** (orphan re-activation) after 2-week cycle data.
6. **Measure** — funnel + North Star dashboards; 2-week cohort cycles (Initiative 6).

---

## 12. Biggest Remaining Uncertainty

1. **Statistical power is not reachable** from available data (population ≈ few hundred, 11.2% cross rate). The experiment is designed as a before/after cohort + funnel-lift, and PASS means a directional lift + a sustained Operational Classroom count > 0, **not** a powered p<0.05.
2. **No persisted teacher-session or code-share event** (F4/F8) — must be proxied or newly instrumented; backfill is impossible.
3. **F3's 11.2% → ≥25% target is ambitious** for a single onboarding change; the real mechanism may be a combination of P0 #1 + #4 (AI routing). The design tracks each P0's contribution via funnel stage deltas rather than one monolithic lift.
4. **Operational Classroom is currently zero/uncomputed** — the "before" for the North Star is literally 0; the first experiment's realistic win is **first-ever operational classrooms**, then sustained count.

---

## 13. Investor Impact (why this de-risks to 3.2 → measurable)

- **Scorecard #16 (De-risk milestone clarity, 3):** executing Experiment H1 with a clear Activation metric + North Star, shipped within this 90-day window, moves this score from 3 upward — the ONLY score that can move purely on *execution of the defined experiment*.
- **Scorecard #1 (Market/problem clarity, 6):** a non-founder Operational Classroom baseline + playbook evidence converts "no quantified TAM evidence" into a concrete, date-stamped market signal (MGMP/KKG reach via live classrooms).
- **North Star discipline:** every P0 change traces to Operational Classrooms or the activation bottleneck (strategy Initiative rule) — nothing ships that doesn't.
- **Narrative:** ex-founder operational classroom WAU + activation 11.2%→≥25% becomes the headline number for an investor narrative v2 (strategy Initiative 9).

---

## 14. Non-Negotiables / Do-Nots

- Do NOT collapse Activation into North Star. Keep separate tiles/definitions.
- Do NOT add a second theme provider, second shell, or parallel class creation.
- Do NOT touch: the 6 protected files; `User.xp` denormalized flag (keep the transactional proxy); any product event's existing behavior.
- Do NOT fabricate historical events, statistical power, or "with founder" hiding. Report ex-founders honestly and separately.
- Do NOT gamify a moment without evidence — the class-join/3-student reward is justified by the student-density→activation finding, and 3 is a *floor* (5+ is the target), never hard-coded as the win condition.
- No code, no migration, no production data write in this phase.
