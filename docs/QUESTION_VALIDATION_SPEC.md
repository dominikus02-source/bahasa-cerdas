# BahasaCerdas — Question Validation Pipeline Specification (v1.1)

**Status**: SPECIFICATION (Phase 1A.2 — DESIGN ONLY). v1.1 applies the Phase 1B conditional-go corrections: V7 (distractor–misconception links are hypotheses until empirical validation — stages 3/6/10) and S2 (conjunctive publish gate at stage 9; D10 never calibration-exempt). This document defines the future pipeline through which every question must pass before it can reach a student. Nothing here is implemented; the pipeline will be built in a later code phase. It is written to **reuse** existing machinery (`bank-gate.ts`, `content-validation.ts`, `validator.ts`, leakage tests, QuestionMetadata statuses) rather than replace it.

**Contract**: No item is eligible for delivery unless it exits the pipeline at **PUBLISH**. Any failure at any stage is *rejected with a reason code* (never silently repaired, never downgraded to a warning without a human decision). Codes are server-side only.

---

## Pipeline overview

```text
AUTHORING CONTRACT        (who/what/evidence — before content)
   ↓
0. AUTHORING              (stimulus → prompt → options → key → explanation → rationales)
   ↓
1. STRUCTURAL VALIDATION  (deterministic; auto-reject)
   ↓
2. CONTENT VALIDATION     (deterministic template/leakage/tautology gates + factual sanity flags)
   ↓
3. PEDAGOGICAL VALIDATION (evidence-target consistency, ambiguity, single-best-answer, stimulus necessity)
   ↓
4. LANGUAGE VALIDATION    (PUEBI/grammar/register; Indonesian quality)
   ↓
5. ANSWER VALIDATION      (key integrity + explanation↔key consistency)
   ↓
6. DISTRACTOR VALIDATION  (plausibility, homogeneity, uniqueness, misconception value)
   ↓
7. DUPLICATE DETECTION    (exact/near/stem/option-set collisions, cross-theme filler)
   ↓
8. DIFFICULTY / COGNITIVE VALIDATION  (cell vs content; metadata honesty)
   ↓
9. HUMAN REVIEW           (semantic dimensions; APPROVED semantics)
   ↓
10. CALIBRATION           (empirical stats; difficulty confirmation + response-pattern evidence for misconception links — D10 upgrade path, never a D10 exemption)
   ↓
11. PUBLISH               (delivery allowlist + pool eligibility)
```

Stages 1–2 and most of 5–8 are **code-decidable**; stages 3–4, 6 (plausibility), 9, and 10 require **human or empirical judgment**. Per the Quality Standard §4.4: automatic gates may reject; they may never approve.

---

## Stage-by-stage specification

### AUTHORING CONTRACT (pre-stage)
Checks that the ITEM DNA authoring contract (§6 of `QUESTION_ITEM_DNA.md`) is complete: theme, grade/phase, skill/subskill, assessment_purpose, evidence_target, cognitive_target, difficulty_target, stimulus_type, misconception_target.
- Gate: all required fields present and taxonomy-valid. **Fail → cannot author content.** (This alone would have prevented the 1,480 template items: none had an evidence_target.)
- Implemented: new authoring-surface validation (Phase 1B+).

### 0. AUTHORING
Human or AI-assisted draft of content fields. AI drafts are tagged `AI_ASSISTED` at capture ([S12]–[S14]).
- Rules: no item may be generated from a bare theme name; a generator must receive the authoring contract + one or more stimulus seeds.
- Deterministic tripwires at save: template prefixes (contoh X / jelaskan X / pernyataan X), filler-distractor options, key-position uniformity within a batch.

### 1. STRUCTURAL VALIDATION (deterministic — reuse `diagnosticSafeIssues`)
Checks: text present & ≥ min length; item_type in supported set (PG/BS/ISIAN/CONSTRUCTED); options is an array of strings; option count policy (PG ≥ 3 by default per [S11], BS exactly 2 in canonical shape, ISIAN **0** options); no empty/duplicate (normalized) options; BENAR_SALAH shape; ISIAN-with-options rejection; CONSTRUCTED must have a rubric reference (not auto-scored by key).
- Existing codes reused/extended: `TEXT_MISSING`, `TEXT_TOO_SHORT`, `TYPE_UNSUPPORTED`, `OPTIONS_SHAPE`, `OPTIONS_TOO_FEW`, `EMPTY_OPTION`, `DUPLICATE_OPTION`, `BS_SHAPE`, `ISIAN_HAS_OPTIONS`.
- Gate: any code ⇒ **REJECTED(STRUCTURAL)**; no human override without a corrected revision.

### 2. CONTENT VALIDATION (deterministic + flags — reuse `bank-gate` + `content-validation`)
Checks: tautology/template family (`TEMPLATE_STEM`, `FILLER_DISTRACTORS`, `KEY_IN_STEM` where applicable — note the KEY_IN_STEM carve-out for stimulus-quoting bank items already documented in `delivery-gate.ts`); answer leakage heuristics (`ANSWER_LEAKAGE`); missing-context heuristic for READING skills (`MISSING_CONTEXT`); trivial-option warnings for non-vocab/non-spelling items.
- Deterministic reject: template/tautology/filler/key-position-in-family. **Warn** (human stage must clear): leakage heuristic on passage items, trivial options, short answers.
- Gate: deterministic codes ⇒ **REJECTED(CONTENT)**; warnings forwarded to stage 9.

### 3. PEDAGOGICAL VALIDATION (human, rubric-based — Quality Standard D2/D5/D10)
Checks (each against the authoring contract): construct alignment — the item actually exercises `skill.subskill` at `cognitive_target` (D2); single-best-answer defensibility from the stimulus alone (D5); the item **requires** its stimulus (D4 trigger: an item answerable without the stimulus is rejected for reading constructs); diagnostic role is stated and believable (D10 — an explicit D10 state per Quality Standard §4.9 is required, never satisfied by a `CALIBRATION` tag).
- Artifacts: review fills `distractor_rationale` and records `misconception_target` as a **hypothesis** (V7); review flags whether the distractor design is *consistent with* the stated hypothesis — never asserts the link as fact.
- Gate: fail ⇒ **REJECTED(PEDAGOGIC)**; no auto-approval possible.

### 4. LANGUAGE VALIDATION (human, checklist)
Checks: standard Indonesian + PUEBI; no meaning-changing typos; register/vocabulary appropriate for `kelas` (vocabulary level below the construct when possible, [S8]); natural phrasing; options grammatically parallel to the stem ([S8]). The SPELLING_TYPES carve-out (options intentionally wrong only for spelling constructs) is preserved from `content-validation.ts`.
- Gate: fail ⇒ **REJECTED(LANGUAGE)**.

### 5. ANSWER VALIDATION (deterministic — D6)
Checks: key present; key is an in-range index for PG/BS (or exact expected text for ISIAN); explanation consistent with the key (`WRONG_ANSWER` detector); key not identical to a distractor; for PG, keyed option not a verbatim stem echo outside passage context.
- Reuse: `KEY_MISSING`, `KEY_NOT_INDEX`, `KEY_OUT_OF_RANGE`, `KEY_IN_STEM` + `content-validation` `WRONG_ANSWER`.
- Gate: fail ⇒ **REJECTED(ANSWER)**.

### 6. DISTRACTOR VALIDATION (deterministic + human — D7)
Deterministic: normalized-uniqueness (already stage 1); option length/vocabulary comparability flags; option-set reuse across items in the same batch/theme (filler detector).
Human: each distractor is plausible **and** wrong for a reason; ≥ 1 distractor is designed around a *hypothesized* predictable error where `misconception_target` is set (**V7**: hypothesis at this stage, never validated interpretation); no "all/none of the above"; homogeneity of content/grammar. Reviewer records the distractor–hypothesis link only as "consistent with" language.
- Gate: any deterministic code ⇒ **REJECTED(DISTRACTOR)**; human verdict "no defensible wrongness" ⇒ **REJECTED(DISTRACTOR)**.

### 7. DUPLICATE DETECTION (deterministic — D11)
Checks at three levels: exact (normalized text+options+key), stem-level (same normalized stem, any options), option-set level (same 3+ option texts in a different stem). Runs bank-wide, not just within the batch — the audit's 1,330 duplicates were in-file, but cross-theme filler is a bank-level defect.
- Output: `duplicate_group` hash assigned; colliding new items are **REJECTED(DUPLICATE)** unless the reviewer explicitly re-purposes the content with a materially different stimulus/task (recorded in lineage).
- Reuse: `CROSS_DUPLICATE` from `content-validation.ts`; stem-map logic.

### 8. DIFFICULTY / COGNITIVE VALIDATION (deterministic sanity + human — D3/D9)
Deterministic sanity: `difficulty_target` is a valid cell; cognitive label is valid; item is not a copy of a sibling with a different difficulty (template-diff audit rule). Human: difficulty cell consistent with content (length, vocabulary, inference distance, distractor proximity); cognitive target reflects the actual demand (the audit showed `levelBerpikir` was arithmetic).
- Gate: mismatch flagged ⇒ human must adjust **the content or the metadata** (never just the label — §4.2-8); unadjusted ⇒ **REJECTED(DIFFICULTY)**.

### 9. HUMAN REVIEW (mandatory; semantic dimensions)
Scope (per Quality Standard §4.4, cannot be auto-approved): D1 content correctness, D2 construct, D4 stimulus, D5 clarity, D7 plausibility, D8 language, D13 cultural, D14 fairness. Reviewer scores 0–3 on every dimension; records `reviewer`, `reviewed_at`; sets `provenance=HUMAN_REVIEW`.
- **Publish gate — CONJUNCTIVE (S2; Quality Standard §4.4)**: the item exits stage 9 as APPROVED **only if** every clause holds: (1) structural/content/answer valid (no deterministic reject codes); (2) no HARD-FAIL dimension < 2 and no hard-fail trigger; (3) every SCORED dimension ≥ 2 — D3/D9 accept a documented 1 only for an explicit `CALIBRATION` item with D10 ≥ 2 and D2 ≥ 2; (4) **D10 has an explicit valid state (§4.9) — D10 is never calibration-exempt**; (5) human APPROVED with reviewer recorded; (6) purpose-specific gates (§4.9). Mean ≥ 2.0 is advisory (Gold/Silver/Bronze), never sufficient.
- The Phase 1B edge case (14 × 3 + 1 × 1 on D10, tagged CALIBRATION) **fails**: clause 3 (the 1) and clause 4 (no valid D10 state).
- Fairness pass specifically follows the [S7] fairness pillar; any "may disadvantage group X" finding ⇒ REJECTED(FAIRNESS) or revision.
- **Approval semantics**: `QuestionMetadata.status = APPROVED` is set only here, only by a human who read the content. This closes the audit's "83 template rows approved by taxonomy review" hole (§4.2-12).

### 10. CALIBRATION (empirical — D9, D10 evidence upgrade)
Purpose: (a) confirm difficulty/discrimination with live responses (D9) and (b) accumulate the **response-pattern evidence** that can upgrade a misconception *hypothesis* toward an evidence record (D10; V7). Bank telemetry already exists (`correctCount/wrongCount/usedCount` on `Soal`).
- Flow: new items publish in `CALIBRATION` status (eligible but flagged). After N responses (e.g., ≥ 30–50 per cell, LEVEL 1 floor; pool per skill×difficulty when item-N < 30), compute p-value and point-biserial/like discrimination from telemetry; p-value outside the intended band or non-positive discrimination ⇒ either re-cell the difficulty, revise the item, or RETIRE it (no silent re-use).
- **Calibration LEVELS (inlined from QUESTION_BANK_FOUNDATION_VERIFICATION.md §10 so this spec is self-contained)**: LEVEL 0 — author judgment (cell from the content rubric — length, vocabulary, inference distance, distractor proximity; arithmetic/sibling-copied cells rejected, D9; no statistics). LEVEL 1 — pilot proportion-correct + basic discrimination at first ~40–60 responses/item, floor **N ≥ 30 per item, or pooled per (skill, difficulty, kelas) bucket when item-N < 30**; decisions: confirm / re-cell with content re-review (never silent) / retire. LEVEL 2 — larger-sample calibration (item-N ≥ 100 per cell, or exposure-capped rotation); items earn trusted "calibrated" difficulty and enter difficulty-routed pools. LEVEL 3 — IRT (future-state, explicitly labeled; justified only at thousands of responses per skill scale with controlled exposure — do not build now).
- **D10 upgrade path (V7)**: a `CALIBRATION` tag or p/discrimination statistics alone **never** validate a misconception. A distractor–misconception link upgrades from HYPOTHESIS only when: response-pattern data are recorded (`response_pattern`), an empirical-analysis tier (error analysis / interview / response-process sample) is run and reviewed, and the evidence record (`misconception_evidence`) supports the interpretation → `validated_misconception`. Only then may confident learner-facing messaging or misconception routing use the link.
- Output: difficulty becomes *empirical* (D9); D10 state may rise HYPOTHESIS → REVIEWED → EMPIRICALLY_SUPPORTED (§4.9). Item may move to full PUBLISHED; feeds the evidence model for adaptive routing.

### 11. PUBLISH
Final step: item enters the **delivery allowlist / eligible pool** only if: (a) exited stage 9 with APPROVED by a human; (b) passed stage 10 CALIBRATION where required; (c) passes the *current* delivery gates (`isMasterBankDeliverable` / `isDiagnosticSafeItem`) at every surface — the P0.6 gates remain the outer ring forever.
- After PUBLISH, content is immutable in versioned lineage: any edit creates a new version that must re-enter at the affected stages (structural change ⇒ stages 1–9; explanation-only change ⇒ stages 5+9).
- Revocation path: `publication_status = RETIRED` is immediate and reversible only through a fresh review (mirrors the quarantine pattern from P0.6).

---

## Reason-code vocabulary (stable; server-side only)

`STRUCTURAL_*`, `CONTENT_TEMPLATE`, `CONTENT_FILLER`, `CONTENT_LEAK`, `PEDAGOGIC_NO_ALIGNMENT`, `PEDAGOGIC_AMBIGUOUS`, `PEDAGOGIC_NO_STIMULUS_NEEDED`, `PEDAGOGIC_D10_STATE_MISSING` (S2), `PEDAGOGIC_MISCONCEPTION_UNVALIDATED` (V7 — distractor link asserted without evidence record), `LANGUAGE_*`, `ANSWER_*`, `DISTRACTOR_*`, `DUPLICATE_*`, `DIFFICULTY_MISMATCH`, `FAIRNESS_*`, `CALIBRATION_FAIL`. Existing gate codes from `bank-gate.ts` are reused verbatim where they already express the rule (see stage maps above); new codes are additive.

## Mapping to Quality Standard dimensions

| Stage | Dimensions gated |
|---|---|
| 1 Structural | D6 (partial), D15 (shape) |
| 2 Content | D5/D6/D7 templates, D2 missing-context heuristic, D15 leakage |
| 3 Pedagogical | D2, D4 (stimulus necessity), D5, D10 |
| 4 Language | D8 |
| 5 Answer | D1 (internal consistency), D6 |
| 6 Distractor | D7 |
| 7 Duplicate | D11 |
| 8 Difficulty/cognitive | D3, D9 |
| 9 Human review | D1, D2, D4, D5, D7, D8, D13, D14, D10 state verification (+ approval semantics §4.2-12; conjunctive gate S2) |
| 10 Calibration | D9 (empirical difficulty); D10 evidence upgrade (V7 — calibration never validates a misconception by itself; only the response-pattern + empirical-analysis tier does) |
| 11 Publish | D15 + delivery-gate (containment) |

## AI-specific guardrails (Stages 0–2, 9)

- AI output is always `AI_ASSISTED` at capture; deterministic stages 1–2 run unchanged; **AI-generated content never skips stage 9** ([S12]–[S14]: validity arises from the review pipeline, not the model).
- Additional AI checks before human review: hallucination spot-check flags (unverifiable names/dates/quotes), answer-key re-verification against the stimulus, distractor plausibility sample, and provenance/audit capture of model + prompt version (for reproducibility). These are *pre-screeners that reduce reviewer load*, never substitutes.
- No realtime AI questions in the item bank pipeline (the diagnostic engine's live-AI path is a separate, already-gated feature and out of this spec's scope).

## Explicit non-goals & next-step notes

- This spec does **not** modify the database, Prisma, delivery behavior, or scoring — implementing it is a future, separately-approved code phase.
- Known open design points to resolve in that phase (recorded, not decided): physical mapping of new DNA fields; calibration N and formulas; reviewer workflow UI/roles; how `CONSTRUCTED` items (Menulis/Berbicara, [S6] seksi IV/V) enter auto-scored vs human-scored pipelines; PISA/UKBI vocabulary reuse limits ([S4], [S6] caveats).
