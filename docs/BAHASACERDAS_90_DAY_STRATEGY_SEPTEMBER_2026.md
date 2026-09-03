# BAHASACERDAS 90-DAY STRATEGY — SEPTEMBER 2026

**Phase 7 companion · Operational roadmap derived from the Founder Decision Layer**
**Generated:** 2026-09-03 · **Status:** DOCUMENT ONLY (no execution yet, awaiting Founder Review) · **Read-only:** yes

---

## 0. Guiding Principle

The single highest-leverage lever is **ACTIVATION: teacher → operational classroom**. Do not add new features or spend on acquisition until activation is solved and measurable. Every initiative below is evaluated against one North Star: **Operational Classrooms (active teacher-classrooms, trailing 30 days)**.

---

## Days 0–30 — FOUND THE LOOP (≤3 initiatives)

### Initiative 1: Instrument the funnel (foundation — required first)
- **What:** Add event tracking so every loop is measurable. Ensure production capture of: `premium_viewed`, `checkout_abandoned`, `class_created`, `artifact_created` (penugasan / bank-soal quiz / karya-feedback), `student_activated`, `group_orphaned`.
- **Why first:** Today the funnel has no checkout/session instrumentation; nothing can be measured, so nothing can be learned.
- **Success:** `premium_viewed` and `class_created` events exist with non-null counts; a realtime funnel dashboard renders.
- **Failure:** If after 2 weeks no events are tracked, stop and fix instrumentation — nothing else can be trusted.

### Initiative 2: Ship "Operational Teacher" onboarding
- **What:** New GURU signups get a guided flow: **create first class → create first artifact (penugasan OR one bank-soal quiz OR a karya prompt) → invite/activate 5+ students** — all inside one session (~10 min).
- **Why:** It is the intervention in THE ONE EXPERIMENT. It converts the AI-magnet funnel into a classroom funnel.
- **Success:** class-creation rate moves from 11.2% toward 20%; artifact teachers from 8 toward 15; 30d teacher activation from 0.4% toward 1.5%+.
- **Failure:** If class-creation does not move after 30d, pivot the onboarding flow (not the AI tools).

### Initiative 3: Route AI-magnet into classroom
- **What:** Every AI-tool generation (rpp, soal, ppt) ends with a CTA: "Kirim hasil ini ke kelas Anda" → guided class creation.
- **Why:** AI is 9x classroom creation; this closes the gap between the magnet and the moat.
- **Success:** measurable % of AI-tool users who create a class within the same session; post-AI class-creation baseline recorded.

---

## Days 31–60 — PROVE REPEATABILITY AT SCALE (≤3 initiatives)

### Initiative 4: Resolve school identity
- **What:** Apply the controlled backfill policy (P1-C, CASE A/B/C: ALIAS_MATCH / NORMALIZED_EXACT / GROUP_EVIDENCE_BACKFILL) after explicit founder approval. Start with the dominant 683 raw names → canonical School table.
- **Why:** Unlocks school-level cohorts — a prerequisite for any school GTM and for a credible investor story.
- **Success:** SchoolId coverage rises from 0%; first school-cohort report (per-school activation + retention) rendered.
- **Failure:** Do NOT force-match ambiguous cases; leave them unresolved (no false inference). If coverage <50% proceed, document.

### Initiative 5: Launch non-founder activation nudge
- **What:** Reach top non-founder artifact teachers (Dorothea, Ibrahim, Karina, Christanti, etc.) with a repeatable-script nudge to replicate Playbook A/B with their classes; measure second-cohort adoption.
- **Why:** Proven playbooks need proof of **repeatability**, not just existence.
- **Success:** 2+ new non-founder "operational teachers" (class + artifact + active students).
- **Failure:** If no non-founder scales a playbook, pivot to a school-centric model in days 61–90.

### Initiative 6: Print clean retention curve
- **What:** Stand up D7/D30 learner + teacher activation cohort reports (cohort of new operational teachers; learner retention by first month).
- **Why:** Retention is currently unmeasured and scorecard-weak (2/10); a clean curve moves the score.
- **Success:** A reproducible D7/D30 report with real cohort numbers.

---

## Days 61–90 — TRIGGER MONETIZATION (≤3 initiatives)

### Initiative 7: Gate the first commission
- **What:** Enable a path for a student in a **non-founder** operational classroom to purchase Murid Premium, then verify the commission engine pays out the ~Rp1,900 (10% of Rp19,000, after 7-day holding).
- **Why:** It is the first-ever monetization repeatability signal and the flagship proof that the affiliate loop works.
- **Success:** First non-founder commission realized (Rp>0, AVAILABLE after holding).
- **Failure:** If no non-founder purchase occurs, run a controlled pilot with 1–2 partner classes and a direct link/CTA; document the friction.

### Initiative 8: De-risk founder concentration
- **What:** Migrate students out of founder-only classes where possible; instrument a "teacher-of-teacher" onboarding so classrooms are held by non-founder operational teachers.
- **Why:** ~32% of grouped students sit in 3 founder classes; this is a credibility + growth risk flagged in the scorecard (team/founder 5/10).
- **Success:** non-founder share of grouped students rises measurably.

### Initiative 9: Decide product/market direction + update narrative
- **What:** Based on days 0–60 evidence, choose the primary wedge: **classroom-operator-led** vs **school-led**. Update `docs/INVESTOR_NARRATIVE_V1_SEPTEMBER_2026.md` → v2 with real activation, retention, and monetization curves.
- **Why:** The 90-day mission's endpoint is a defensible decision on what to double down on.
- **Success:** A written decision memo + an investor narrative v2 with real numbers; readiness re-scored.
- **Failure:** If monetization stays zero AND retention flat, recommend **do not seek outside capital**; instead run a paid pilot with 1–2 partner schools.

---

## Decision Rules (Run at Day 90)

| Metric | Baseline | 90d Target | Decision if met |
|--------|----------|-----------|-----------------|
| Class-creation rate | 11.2% | >=25% | Proceed to monetization scale / consider capital |
| Active teacher-classrooms (30d) | ~2 | >=15 | Double down; prepare narrative v2 |
| Ever-taught teachers | 8 | >=20 | Proof of repeatability |
| First non-founder commission | 0 | Rp>0 (first payout) | Proof the affiliate loop works |
| SchoolId coverage | 0% | >0% + first cohort | Unlock school GTM |

**Kill rules (any single trigger):**
- Class-creation does not move after 30d → pivot onboarding (not AI tools).
- No non-founder scales a playbook by day 60 → test school-centric model.
- Monetization + retention both flat at day 90 → **do NOT raise**; run paid school pilot (option A/C).

---

## Guardrails
- **Additive-only, read-only evidence:** no destructive DB ops; no fake business data; no fabricated metrics; no claim of PMF.
- **Protected files untouched:** `FOUNDER_DECISION_LAYER.md`, admin executive/page, `lib/admin/*`, executive/founder-health test.
- **North Star discipline:** every initiative must trace to *Operational Classrooms* or the primary bottleneck (activation). If an idea doesn't, it's not this 90 days.
- **No commit/push** until Founder Review.
