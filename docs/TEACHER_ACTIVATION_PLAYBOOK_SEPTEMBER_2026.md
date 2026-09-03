# Teacher Activation Playbook — BahasaCerdas.com

> **Phase 6** · Derived from `TEACHER_GROWTH_FORENSIC_SEPTEMBER_2026.md`
> Purpose: convert forensic findings into a repeatable onboarding flow, a first-week script, and measurable growth experiments.
> Guiding problem: **484 GURU registered but only 11.2% create a class and only 1.7% become engaged teachers.**

---

## 1. The Activation Ladder (the mental model)

Every action below is measured. A teacher moves UP the ladder or is lost.

```
[1] REGISTER        → 484 reached here
[2] CREATE CLASS    → 11.2% (54) reach here      ← THE CLIFF
[3] FIRST ARTIFACT  → 1.7% (8) reach here         ← THE RETENTION WALL
[4] STUDENT ACTIVATION (XP>0) → ~55–97% of a teacher's students
[5] WEEKLY RETURN   → nearly zero today
```

**Levers (in priority order):**
1. Raise REGISTER → CREATE CLASS (biggest, cheapest, most forgiving)
2. Raise CREATE CLASS → FIRST ARTIFACT (stop the 96% churn-after-class)
3. Convert teacher activity into student activation (the playbooks below do this for free)

---

## 2. Two Proven Winning Playbooks (teachable, repeatable)

The forensic isolated two non-founder teacher archetypes that outperform. **Both are behaviors BahasaCerdas can guide every new teacher through.**

### Playbook A — "The Class Operator"
*Reference teachers: Dorothea (169 st, 91 active), Ibrahim (117 st, 64 active), Elli (57 st, 33 active)*

| Step | Action | Why (from data) |
|------|--------|-----------------|
| 1 | Create the class, import student list | Class = the container for everything |
| 2 | **Within day 1: send one Pengumuman** (announcement) | Few teachers announce; those who do (Noormawati) get immediate 30d activity |
| 3 | **Within day 1–2: assign one Penugasan** | Assignments are the #2 artifact; correlates with 54–58% student XP activation |
| 4 | **Within week 1: run one Quiz** | Quiz adopters (Dorothea, Ibrahim) show the strongest closed loop |
| 5 | Repeat weekly: 1 announcement + 1 assignment + 1 quiz | Scheduled cadence = students keep a login habit |

**First-week target: 3 artifacts in 7 days.** Teachers who reach 3 artifacts have students with 2× the activation of passive creators.

### Playbook B — "The Literasi Publisher"
*Reference teachers: Karina (155 st, 149 active, 131 karya), Christanti (59 st, 56 active, 48 karya), Wahyu (36 st, 32 karya)*

| Step | Action | Why (from data) |
|------|--------|-----------------|
| 1 | Create class, import students | — |
| 2 | Launch a "Tulis Karya" challenge (puisi/cerpen) | **Karya culture = 96% student activation** — the single highest activation signal |
| 3 | Set a theme + due date | Creates a peer-pressured publishing cadence |
| 4 | Give feedback on submissions | Feedback feature exists; teachers who use it (5) deepen the loop |
| 5 | Feature/like student works | Visibility loop → students publish more → class stays active |

**Karya is the single highest student-activation feature in the entire platform.**

---

## 3. The First-Week Activation Script (Product UX)

A guided "First 7 Days" checklist presented to every teacher right after class creation — directly encoding Playbook A + B.

| Day | Guided Action | Product touchpoint |
|-----|---------------|--------------------|
| 0 | Create your class (Name + grade + student list) | Create-class wizard with "invite via code" |
| 1 | **Send your first announcement** | Empty-state CTA "Kirim Pengumuman Pertama" |
| 2 | **Assign your first material/task** | Recommended-action card → Penugasan |
| 3 | **Run your first quiz** | CTA → Bank Soal → "Kirim ke Kelas" |
| 4 | Choose a Playbook | "Pilih gaya mengajar: Kelas Aktif [A] atau Literasi [B]" |
| 5 | **Launch your first Karya challenge** (B) OR schedule weekly cadence (A) | Template-based karya prompt |
| 7 | Check your first student activity | "Lihat siapa yang sudah aktif" (XP>0 view) |

**Success metric for day 7: teacher has produced ≥3 artifacts AND ≥1 student activated.**

---

## 4. Filling the Two Gaps the Data Exposes

### Gap 1 — The Registration → Class Cliff (11.2%)
Most of the ~430 non-creating GURU are AI-tool users. **Route AI users into the classroom:**
- After an AI generation (RPP/Soal) → "Sendirikan hasil ke kelas?" → if no class → **create-class CTA**.
- AI `bc-assistant` is the #1 feature (33 teachers) → add a "Buat Kelas" suggestion in AI chat replies.
- **Goal: AI is already the widest door; make it open onto the classroom.**

### Gap 2 — The Post-Creation Churn (96% of creators go inert)
- **Trigger the moment a class is created**: start the 7-day checklist.
- **Detect "orphan group"** (class created >7d, 0 artifacts) → email/push "We notice your class hasn't started yet — here's a 3-step starter."
- **Re-activate dormant creators** (108 orphan groups) before chasing new registrations — cheaper, higher-LTV.

---

## 5. Proposed Experiments (measurable, 2-week cycles)

Each experiment maps to a forensic lever. Keep them small; measure activation rate, not vanity signups.

| # | Experiment | Hypothesis | Success Metric | Control |
|---|-----------|------------|----------------|---------|
| E1 | **AI→Class routing**: CTA to create class immediately after first AI generation | AI users (73) will cross the class cliff at >11.2% | Group-creation rate among AI users | Cohort without CTA |
| E2 | **First-week checklist** shown to new class creators | Check-list teachers produce ≥3 artifacts in 7d | % reaching 3 artifacts by day 7 | No checklist |
| E3 | **Orphan-group re-activation** email (108 groups) | Re-activate ≥15% of dormant creators | % dormant creators w/ new artifact in 14d | No outreach |
| E4 | **Karya launch template** (Playbook B one-click) | Karya-led teachers hit ≥80% student activation | % students XP>0 per class | Template A-only |
| E5 | **XP-activation visible to teacher** ("X of your Y students are active this week") | Visibility drives teachers to do one more artifact | Avg artifacts/teacher/week | No visibility |
| E6 | **Pengumuman nudge** on day 1 (Playbook A step 2) | Announcement on day 1 lifts artifact velocity | % teachers w/ artifact by day 7 | No nudge |

**Priority: E1 first** (attacks the biggest CLIFF and reuses the already-largest feature). **Then E3** (cheapest LTV win — 108 orphan classes already exist).

---

## 6. Metrics Dashboard (define these before shipping)

| Metric | Definition | Current Baseline (2026-09-03) |
|--------|-----------|-------------------------------|
| Registration→Class | % GURU who create ≥1 class | **11.2%** |
| Class→Artifact | % class-creators who produce ≥1 artifact | **14.8% (8/54)** |
| Artifact velocity | Avg artifacts per teacher / week | ~0 |
| Student activation | % grouped students with XP>0 | var ~30–97% by teacher |
| Weekly returning teachers | Teachers active 30d | 2 |
| AI→Class conversion | % AI users who create a class | ~0 (decoupled) |

**North-star teacher metric: "teachers who created a class AND produced ≥1 artifact in the last 7 days."** Not registrations, not even class count — artifact-producing, active teachers are the leading indicator of student growth.

---

## 7. Summary

The forensic told us success is **rare, decoupled from registration, but highly repeatable**:

1. **Class creation is the unlock** — only 1 in 9 teachers crosses it.
2. **Artifacts are the retention wall** — 96% of creators stall here.
3. **Two teachable playbooks win** — Class Operator (assignments+quizzes) and Literasi Publisher (karya), driving 54–97% student activation.
4. **AI is the biggest untapped funnel** — 73 teachers use AI but it never routes to the classroom.
5. **The cheapest growth is re-activating 108 orphan classes**, not chasing new signups.

Ship E1 and E3 first, wire the first-week checklist, and let every teacher see their student XP-activation. That closes the loop from "registered" to "weekly active teacher" — the only metric that compounds.

---

*Phase 6 · Data: `scripts/teacher-growth-forensic.ts` (read-only) · Read-only analysis, no DB mutations*
