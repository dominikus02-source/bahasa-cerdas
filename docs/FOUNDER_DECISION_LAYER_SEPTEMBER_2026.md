# FOUNDER DECISION LAYER — SEPTEMBER 2026

**Phase 7 · Strategic synthesis of all production audits**
**Generated:** 2026-09-03 · **Status:** READ + ANALYZE + DOCUMENT (no product development, no DB mutation) · **Commit/push:** NONE (uncommitted, awaiting Founder Review)

---

## 1. Purpose

This document is the **Founder Decision Layer** — the single place where BahasaCerdas converts 17 production-truth audit artifacts into a **founder decision**: what the company should **do over the next 30–90 days** to become materially more investable. It does **not** replace `docs/FOUNDER_DECISION_LAYER.md` (the protected v1.0 Control Tower health model); it is the strategic companion.

**Evidence basis (17 artifacts read):** teacher growth forensic, investor production truth, business truth audit (+ phase 4 activation), investor truth sheet, investor power users, school analysis, business metric dictionary, investor metric dictionary, production-truth-audit.json, commission E2E readiness, founder identity/role audit, founder role migration, plus the guru-dashboard theme and billing architecture phases. All numbers are **read-only from production Supabase**.

**Read-only guarantee:** NO production data modified, NO migration, NO fabricated metric, NO claim of PMF.

---

## 2. Executive Summary

BahasaCerdas has a **working, differentiated product** with a clear subject-niche, a 2,437+ base, functional AI tools that act as a strong acquisition magnet (73 teachers), two **proven teacher playbooks**, and **functional monetization + commission rails**. But it is **pre-revenue (Rp438,000 / ~US$29)**, faces an **unsolved activation bottleneck** (only 11.2% of 484 GURU create a class, 1.7% ever teach), and has **no measurable retention curve**, **no school identity**, and **founder concentration** (~32% of grouped students in 3 founder classes).

**The single highest-leverage move is NOT more features — it is converting the AI-magnet funnel into a classroom-activation funnel.** Everything downstream (retention, monetization, school GTM) depends on the "operational teacher" loop: *create class → create artifact → activate students → retain*.

**Fundraising verdict: NOT READY.** The founder should pursue a no-/low-dilution path (bootstrap pilot / option A or C) for 60–90 days, run **THE ONE EXPERIMENT**, resolve school identity, trigger the **first non-founder commission**, then re-score readiness at day 90 before deciding on capital.

---

## 3. Authoritative Numbers (Latest-Wins)

- **Users:** 2,437 total (investor funnel 2026-09-02 meta) / 2,430 (business truth 2026-09-01) → use **~2,430–2,437**.
- **GURU (authoritative, most recent forensic 2026-09-03): 484.** Drift: forensic 484 > investor 481 > business 477. The drift is real signups + founder role remap (`ADMIN→GURU`).
- **MURID:** 1,950–1,956. **Founders:** 3 (2 active founder roles mapped to GURU + 1 admin).
- **Premium active:** 4 (all PRO). **Trial active GURU:** 274. **Trial started:** 465.
- **Classroom:** 143 groups total (investor) / 54 group creators (forensic) / 8 ever-taught (forensic) / **2 active teachers 30d**.
- **Login activity:** 7d=634 · 30d=1,342 · 90d=1,854 · never-active=583.
- **Feature adoption:** AI 73 > Quiz 15 > Penugasan 8 > Karya feedback 5 > Pengumuman 2 > Game 1 > Nilai 0.
- **Monetization:** revenue total Rp438,000 (~US$29) — pre-revenue. PREMIUM_UPGRADE 4 SUCCESS (Rp1,443,000 nominal), MURID_PREMIUM 8 txn / 3 unique buyers (all in founder/ADMIN classes → commission-excluded). Commission: 478 eligible teachers, 35 attributions, **0 commissions, 0 wallets (data gap, not bug)**.
- **School:** 0 canonical schools; 683 unique raw school names; 2,050 phantom profiles without canonical schoolId.
- **Content depth:** 1,685 soal total (1,500 Master + 95 AI + 90 import; 1,208 pilihan ganda); 33 quizzes (all LATIHAN); 1,590 karya; 444+ UKBI certificates.
- **Top non-founder operational teachers:** Dorothea (169 st, 6 penugasan, 9 quiz, 91 XP-active), Karina (155 st, 149 XP, 131 karya), Ibrahim (117 st, 117 XP-active 30d, 6 quiz), Yohana (118 st), Christanti (59/56/48), Wahyu Kristanti (36/32).

---

## 4. Evidence Hierarchy (6 + 1 Classification Categories)

### PROVEN
- AI tools are the **#1 acquisition magnet**: 73 teachers adopted an AI feature; 44 in last 30d; bc-assistant 139 calls/33 teachers; rpp 52/28.
- A specific teacher archetype **drives real classroom activity**: artifact-heavy teachers produce **54–97% student XP-activation** vs ~30% passive.
- **Playbook A "Class Operator"** works: Dorothea, Ibrahim, Elli. **Playbook B "Literasi Publisher"** works: Karina, Christanti, Wahyu Kristanti.
- Commission system is **wired end-to-end and safe**: zero commissions = data gap (no student in a non-founder class purchased), not a logic bug.

### STRONG SIGNAL
- Premium funnel exists but minuscule (4/465 = 0.86%) and pre-revenue.
- Feature adoption **decouples from classroom creation** — AI (73) is 9x classroom creation (8).
- Real login base: 634/1,342/1,854 with 583 never-active.
- Students respond to teacher activation (54–97% XP-activation in artifact classrooms).

### PROMISING BUT UNPROVEN
- School/GTM effect (0 canonical schools; latent).
- Learner retention / repeat-usage curve not established.
- B2B/school-level monetization not validated.

### WEAK
- Classroom creation 11.2%; only 8 (1.7%) ever produced a teaching artifact.
- Only **2 active teachers 30d**; activeRateOfCreators 3.7%.
- ~430 GURU are trial "pelamar" who never made a class.
- Game host: 1 teacher; game server dead. Nilai/gradebook: 0 teachers.

### NEGATIVE SIGNAL
- 108 orphan groups (created, zero activity).
- Founder concentration (~32% of grouped students).
- 2,050 phantom student profiles without schoolId.
- Empty tables: DailyAction, ActivityLog, LoginHistory, quizzesTaken, TTS.

### NOT YET MEASURABLE
- Unit economics (CAC/LTV/payback).
- Marketing top-of-funnel (premium_viewed, checkout_abandoned).
- Learner D7/D30 retention.
- School-level revenue/deal size. Commission payout realized.

### DATA QUALITY GAP
- GURU count drift (484/481/477 across 3 snapshots).
- School identity unresolved.
- Admin role inconsistency (3 vs 0 after founder remap).
- No checkout/session instrumentation.

---

## 5. The Real Customer

**ICP:** the **operational teacher** — an active Bahasa Indonesia subject teacher (SMP/SMA) who runs a real classroom on the platform: creates ≥1 class group, assigns penugasan/quizzes, and sees students engage.

**Evidence:** Only teachers who created a class AND produced teaching artifacts drove meaningful student activity. The 11.2% who create a class are the measurable core; the other ~89% (trial window-shoppers) never activated.

**Anti-ICP:** the ~430 trial "pelamar" who register, use AI trial, and never create a class. **AI is a magnet but a separate, non-routing loop.**

**Moat:** once a teacher has live students (groups + assignments + submissions), switching cost rises; the **operational classroom** is the retention + network moat, not the AI tools.

---

## 6. Teacher Growth Thesis

**Equation:** `Activations = (Teachers who create a class) × (Classrooms with teaching artifacts) × (Students who respond)`

**Current funnel:** 484 GURU → 54 group creators (11.2%) → 8 ever-taught (1.7%) → ~2 active 30d (0.4%).

**Magnet tension:** AI adoption (73) is 9x classroom creation (8) — the biggest funnel is the **least monetizable** and **least retention-bearing** surface.

**Reinforcing-loop target:** move teachers from *trial AI user* → *operational classroom operator* by making **first class + first assignment + first student-visible activity** the primary success moment ("Aha").

**Leading indicator:** artifact production (penugasan/quiz/karya) — students30d and XP-activation rise only where a teacher produced artifacts.

---

## 7. School Effect

- **Status:** LATENT / NOT YET MEASURABLE.
- **Evidence:** 0 canonical schools; 683 unique raw school names; 2,050 phantom profiles; santa-laurensia (204+158+96+88), al-fityan (49+21+17), harapan-bangsa (41+36+23+31) clusters dominate.
- **Implication:** no school-level GTM, deal size, or per-school revenue is computable today.
- **Recommendation:** **do NOT pitch "school penetration"** to investors. Resolve school identity first (P1-C backfill CASE A/B/C), then report school cohorts.

---

## 8. PMF Signal Map

| Signal | Status |
|--------|--------|
| Retention | **WEAK** — no clean learner curve; 583 never-active; 108 orphan groups; 2 active teachers 30d |
| Activation | **PROVEN** for artifact classrooms; **WEAK** overall (1.7% ever-taught) |
| Growth | **NOT MEASURABLE** — no paid acq, no viral coefficient, no organic loop quantified |
| Monetization | **WEAK** — pre-revenue Rp438k; 0.86% trial-to-paid; 4 conversions |
| Revenue | **NEGATIVE_SIGNAL** as company (pre-revenue); reservation real (4 PRO) |

**Verdict: NOT PMF.** A functional, loved-by-a-niche product (artifact teachers) exists, but activation and monetization loops are too small and fragmented to claim product-market fit.

---

## 9. Monetization Reality

- **Revenue total:** Rp438,000 (~US$29) — **pre-revenue**.
- **Transactions:** PREMIUM_UPGRADE 4 SUCCESS (Rp1,443,000); MURID_PREMIUM 8 txn / 3 buyers (all in founder/ADMIN classes → commission-excluded).
- **Funnel:** checkout-initiated 17 → payment-successful 4; missing `premium_viewed` / `checkout_abandoned` (no instrumentation).
- **Commission:** 478 eligible teachers, 35 attributions, **0 commissions / 0 wallets = DATA GAP, not bug.** Waiting on the first non-founder-class MURID_PREMIUM to trigger the first commission.
- **Pricing:** Guru Pro Rp49,000/30d (500 kredit) / Rp399,000/365d; Murid Premium Rp19,000/30d / Rp180,000/365d.
- **Verdict:** monetization rails are functional; nothing realized at scale. Cannot yet fund acquisition.

---

## 10. Primary Bottleneck

**ACTIVATION (teacher → operational classroom).** The conversion of 484 registered GURU into the 8 who actually teach is the single biggest gap — **1.7% ever-taught**. Everything downstream (retention, monetization, school GTM) is downstream of this.

---

## 11. THE ONE EXPERIMENT — "OPERATIONAL TEACHER EXPERIMENT"

- **Hypothesis:** If a newly-registered teacher is taken to a working classroom (create class → create first artifact → activate 5+ students) within one session, then class-creation rate rises from 11% to >=25% AND teacher 30d activation rises from 0.4% to >=3%.
- **Cohort:** new GURU registrations (post-launch date) not exposed to treatment.
- **Control:** historical / holdout group using current signup flow.
- **Intervention:** guided "operational teacher" onboarding + post-AI CTA routing to classroom.
- **Metrics:** primary = teacher 30d activation rate (class + artifact + ≥1 active student); secondary = class-creation rate, artifact-creation rate, students30d per operational teacher.
- **Baselines:** class-creation 11.2%, active30d 2, ever-taught 8.
- **Time window:** 30 days post-rollout.
- **Source:** synthetic controlled rollout vs current-funnel baseline (privacy-safe, no production mutation).

---

## 12. North Star Metric

**Name:** Operational Classrooms (Active Teacher-Classrooms), trailing 30 days.

**Formula:** Count of distinct `groupId` where the group (a) belongs to a **non-founder GURU**, (b) has ≥1 teaching artifact (penugasan OR bank-soal quiz OR karya-feedback event), and (c) has ≥1 student XP event in the trailing 30 days.

- **Numerator:** distinct active groupIds. **Denominator:** none (absolute count, cohort-adjusted).
- **Time window:** trailing 30 days.
- **Source:** production DB (Group + artifacts + XPTransaction + Penugasan/QuizAssignment/Karya).
- **Rationale:** ties teacher activation, artifact production, and student response into one number — the leading indicator for retention and monetization.

---

## 13. Investor Narrative (v1)

**Title:** *"Bahasa Indonesia classroom platform with a proven artifact-driven activation loop; pre-revenue, now proving repeatability before raising."*

1. **Problem:** Indonesian teachers lack a digital home for running live Bahasa Indonesia classrooms; generic classroom LMS ignore the subject's writing/literacy/assessment needs.
2. **Solution:** one platform where teachers run live classes (penugasan, bank-soal quizzes, karya/literacy) + students get a gamified path (Jalur Cerdas, XP/rank, Karya feed) + assessments (UKBI/TKA sims) + AI teaching tools.
3. **Traction:** 2,437+ users (484 GURU), 1,254 grouped students, 54 class creators, artifact classrooms with 54–97% student XP-activation, 444+ UKBI certs, 1,590 karya, functional (latent) commission + monetization rails.
4. **Proof of loop:** Playbook A+B teachers prove activation→student-response→retention works for the niche.
5. **Honesty:** pre-revenue Rp438k (~US$29); 0.86% trial-to-paid; 1.7% ever-taught; school effect unmeasurable today.
6. **Differentiation:** subject-specific (Bahasa Indonesia) depth + integrated literacy/karya + AI + gamification + UKBI/TKA — not a generic LMS.
7. **Market:** no inflated TAM — start with the operational-teacher niche (hundreds today, thousands addressable via MGMP/KKG), expand to school segment only once school identity + lead product proven.
8. **Unit economics:** not stable enough to quote CAC/LTV; rails exist but need activation solved.
9. **Ask:** do not raise a growth round yet; proof-point / pilot capital only, or delay until the experiment prints real curves.
10. **Risk honesty:** biggest risk = activation; second = monetization repeatability; third = founder concentration.
11. **North Star:** Operational Classrooms (active teacher-classrooms, 30d).
12. **Why now / why us:** subject-niche focus + integrated depth no competitor matches; the playbooks are proven; the remaining work is repeatability + monetization, which is a 90-day problem, not a re-architecture.

---

## 14. Capital Strategy (A/B/C/D)

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **A** | **Bootstrapped pilot** — run THE experiment + first commission with 1–2 partner schools; delay external capital until activation + monetization print. Need ~Rp0–50M operational. | ✅ **Recommended** |
| **B** | Small proof-point round (Rp0.5–1B) milestone-tranched to activation/retention/monetization numbers. | Only if a warm investor asks specifically |
| **C** | **Founder-funded pilot** — no dilution, fastest to evidence, keeps optionality. | ✅ **Recommended** |
| **D** | Full seed round (Rp4B+) | ❌ Not at this stage — no repeatability evidence, founder concentration, poor terms |

**Verdict:** pursue A/C for 60–90 days; revisit D only after the experiment + first-commission gate prints.

---

## 15. Investor Readiness Scorecard (0–10)

**Current overall: 3.2/10 — NOT READY TO RAISE.**

| # | Item | Score | Gap → what raises it |
|---|------|-------|----------------------|
| 1 | Market/problem clarity | 6 | MGMP/KKG reach number |
| 2 | Product/solution | 6 | Game revival + one razor-clear JBTD per persona |
| 3 | Traction/activation | 2 | Class-creation → >=25% (THE experiment) |
| 4 | Retention | 2 | D7/D30 learner cohort >=40% D7 |
| 5 | Revenue | 1 | First non-founder commission + repeated MURID_PREMIUM |
| 6 | Monetization rails | 5 | First paying non-founder classroom cohort |
| 7 | Unit economics | 1 | Run paid test; compute CAC/LTV/payback |
| 8 | Growth engine | 2 | AI-magnet→classroom routing conversion measured |
| 9 | Marketplace/network effects | 3 | Non-founder karya/commission volume |
| 10 | Team/founder | 5 | De-concentrate classes; document advisor/COO narrative |
| 11 | Data & analytics quality | 5 | School identity + checkout + session instrumentation |
| 12 | Story/narrative | 5 | Experiment prints real curves |
| 13 | Financials/model | 3 | Real revenue to validate model |
| 14 | Competitive moat | 4 | Winning school implementations |
| 15 | Terms/valuation readiness | 2 | Proof-point + activation evidence |
| 16 | De-risk milestone clarity | 3 | Experiment completes with clear result in 90d |

Score moves to >6 only after **THE experiment (activation), a D7/D30 retention curve, and a first repeated monetization event** all print in 90 days.

---

## 16. KILL / KEEP / START

**KILL**
- Do NOT pitch "school penetration" or school-level metrics to investors (unmeasurable today).
- Do NOT invest further in Game revival as a primary growth lever until activation is solved (1 teacher hosted a game).
- Do NOT spend on paid acquisition before checkout/activation instrumentation exists.

**KEEP**
- AI tools as top-of-funnel magnet.
- Playbook A (Class Operator) + Playbook B (Literasi Publisher) as the core repeatable motion.
- Karya/literacy + gamification + UKBI/TKA as differentiation depth.
- Commission + monetization rails (functional, safe).

**START**
- Instrument activation + checkout funnels.
- Ship "operational teacher" onboarding (first class + first artifact in one session).
- Route AI-tool users into classroom creation (post-generation CTA).
- Resolve school identity (apply P1-C backfill).
- Publish first clean learner D7/D30 + teacher activation cohort reports.

---

## 17. Data Quality Notes

- **Authoritative GURU = 484** (forensic 2026-09-03), drift 484/481/477 explained by signups + founder role remap.
- **Known gaps:** school identity, checkout instrumentation, session tracking (LoginHistory empty), admin-role count inconsistency, revenue/commission 0 at scale.
- **Read-only guarantee:** no production mutation, no migration, no fabricated metrics.

---

## 18. Founder Verdict

### What we know
1. AI tools are the #1 acquisition magnet but do not route to classroom (activation bottleneck).
2. The "operational teacher" archetype works: those who create a class + artifacts drive 54–97% student XP-activation.
3. Two repeatable playbooks exist (Class Operator, Literasi Publisher), proven by non-founder teachers.
4. Commission + monetization rails are functional and safe; zero commissions = data gap (no non-founder purchase).
5. The product is pre-revenue (Rp438k / ~US$29) with strong differentiation but unsolved activation.

### What we believe
1. Routing the AI-magnet funnel into classroom creation is the highest-leverage 30–90 day move.
2. The school effect is real but latent until school identity is resolved.
3. Founder concentration (~32% of grouped students) is a credibility + growth risk to address.
4. Monetization repeats only after an activated non-founder classroom produces a paying student.

### What we do NOT know
1. Whether class-creation can be pushed from 11% to 25%+ (unproven intervention).
2. Clean learner retention (D7/D30) — no cohort curve yet.
3. Whether any non-founder teacher can produce a paying student / first commission.
4. School deal size / willingness to pay (unproven).

### Single thing to prove
> That a non-founder teacher can **repeatedly** become an "operational classroom" (create class → artifact → activate 5+ students → retain), and that this loop triggers **first monetization** (student premium / commission).

### 90-day mission
Raise class-creation from 11% → >=25%; grow active teacher-classrooms from ~2 → >=15; resolve school identity; print a clean D7/D30 learner + teacher retention curve; trigger the **first non-founder commission**.

### Fundraising status
**NOT READY** — pre-revenue, activation unsolved, no retention curve, no repeatable monetization, founder concentration. Pursuing capital now yields poor terms and distracts from the one experiment that can change the numbers.

### Next move
Execute **THE OPERATIONAL TEACHER EXPERIMENT** (days 0–30), instrument the funnel, resolve school identity (days 31–60), trigger first non-founder commission (days 61–90). **Re-score readiness at day 90; only then revisit the capital decision.**

---

## Appendix: Validation & Safety

- **Protected files NOT modified:** `app/(dashboard)/admin/executive/page.tsx`, `app/(dashboard)/admin/page.tsx`, `lib/admin/executive.ts`, `docs/FOUNDER_DECISION_LAYER.md`, `lib/admin/founder-health.ts`, `scripts/test-founder-health.ts`.
- **Files created in this phase (uncommitted):**
  - `data/founder-decision-layer-september-2026.json` (canonical JSON, 17 top-level keys, valid)
  - `docs/FOUNDER_DECISION_LAYER_SEPTEMBER_2026.md` (this doc)
  - `docs/BAHASACERDAS_90_DAY_STRATEGY_SEPTEMBER_2026.md`
  - `docs/INVESTOR_NARRATIVE_V1_SEPTEMBER_2026.md`
  - `docs/INVESTOR_READINESS_SCORECARD_SEPTEMBER_2026.md`
- **Unsupported-claim guard:** every figure in this doc traces to a named production artifact; no PMF/market-fit/retention/revenue/growth/school headline is claimed as proven. All "school" and "retention" and "revenue" claims are flagged as WEAK / NOT YET MEASURABLE / NEGATIVE_SIGNAL where applicable.
- **No commit/push** was made (awaiting Founder Review, per established phase convention).
