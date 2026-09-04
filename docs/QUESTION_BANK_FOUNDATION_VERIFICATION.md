# BahasaCerdas — Question Bank Foundation Verification (Phase 1B)

**Status**: REVIEW / VERIFICATION ONLY — Phase 1B. Zero DB writes, zero question generation, zero bank edits, zero production code changes. Only this document was created; the five foundation documents were not modified.
**Phase 1A.2 follow-up (2026-09-04)**: the two CRITICAL corrections this report identified — **V7** (misconception→evidence boundary) and **S2** (conjunctive publish rule, D10 never calibration-exempt) — were applied in Phase 1A.2 (Quality Standard v1.1 §4.4/§4.8/§4.9, Item DNA §7, Validation Spec stages 3/6/9/10, Blueprint §7.9–§7.12; correction log in Quality Standard §4.10). This document remains the historical review record; the body below is unchanged. The remaining conditions of the §16 decision are tracked against the updated docs.
**Reviewed documents**: `QUESTION_BANK_QUALITY_STANDARD.md`, `QUESTION_ITEM_DNA.md`, `QUESTION_VALIDATION_SPEC.md`, `QUESTION_BANK_RESEARCH_BIBLIOGRAPHY.md` (Phase 1A, untracked) and `QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md` (Phase 0, merged).
**⚠ Referenced-but-absent document**: the mission brief lists `docs/QUESTION_BANK_50_THEME_BLUEPRINT.md` as an input. **It does not exist** (verified on disk, 2026-09-04). Per-theme blueprint substance lives inside the audit doc (§12, §15–§17). §6 of this report therefore audits the blueprint *as carried in the audit doc + Quality Standard*, and the missing artifact is a correction item (§15.1).

---

## 1. Executive verdict

**CONDITIONAL GO.** The Phase 1A foundation is fundamentally sound and genuinely compatible with the existing BahasaCerdas assessment architecture (skill taxonomy ↔ `LearningSkillType` match exactly; `Difficulty` enum matches; the gate vocabulary the specs reuse exists and was code-verified). The standard's central lesson — automatic gates may reject, never approve; human review is mandatory for semantic dimensions; provenance must be honest — is correct and enforceable with existing machinery.

Four corrections are **required before any question generation**:
1. **Bound diagnostic/misconception claims** — a distractor's association with a misconception must be treated as a *theoretical signal* until empirically validated (Quality Standard D7/D10, DNA `misconception_target`); add response-process and post-hoc validation tiers.
2. **Close the publish-rule hole** — the calibration allowance on D10 (diagnostic value) lets a 14×3 + 1×1 item pass as "calibration"; remove D10 from that allowance and make publish *conjunctive*, mean only advisory.
3. **Add reliability, item-independence/testlet, and response-process requirements** the standard currently omits (shared-stimulus items are local-dependent evidence).
4. **Add a purpose-reuse gate** so PRACTICE items cannot silently enter DIAGNOSTIC/ADAPTIVE pools (the standard has `assessment_purpose` but no cross-purpose rule).

No critical construct problem found that would make the architecture *systematically* produce misleading evidence once these are applied; hence not NO-GO.

---

## 2. Primary-source verification matrix

Fetches this pass: OECD publications page → **403**; `ukbi.kemendikdasmen.go.id`, `pisa.hku.hk`, `bpmpbabel.kemendikdasmen.go.id` → **resolve to private addresses** (proxy-inaccessible). No claim was upgraded on the basis of a snippet alone.

| # | Claim (from Phase 1A) | Classification | Basis & remaining caveat |
|---|---|---|---|
| P1 | CP Bahasa Indonesia organized in 4 elemen (Menyimak; Membaca dan Memirsa; Berbicara dan Mempresentasikan; Menulis); reseptif/produktif framing | **VERIFIED_CORROBORATED** | Decree BSKAP **032/H/KR/2024** title/number confirmed via registry + mirror PDF (contains "CAPAIAN PEMBELAJARAN BAHASA INDONESIA"); elemen wording consistent across many school/dinas republications. Caveat: full decree text not re-fetched (gov hosts blocked); a 2025 revision (BSKAP **046/H/KR/2025**) exists — element structure unchanged in scope. |
| P2 | Asesmen diagnostik/formatif/sumatif distinction in Kurikulum Merdeka guidance | **VERIFIED_CORROBORATED** | Corroborated across the `Panduan Pembelajaran dan Asesmen` distribution PDF (belajar.id) and multiple secondary republications. Caveat: primary PDF not fully parsed; used only for classification labels, not requirements. |
| P3 | UKBI has 5 seksi (I Mendengarkan, II Merespons Kaidah, III Membaca, IV Menulis, V Berbicara); 7 predikat bands, current 800-scale (Istimewa 725–800 … Terbatas 251–325) | **VERIFIED_CORROBORATED** | Official-site snippet (ukbi.kemendikdasmen.go.id, both the informasi and predikat pages) + consistent republication tables. Caveat: page body unfetchable; band *boundaries* for Terbatas lower edge rest on republications; full official page text not captured. |
| P4 | SNPMB UTBK has "Literasi dalam Bahasa Indonesia"; purpose = reading/information literacy over Indonesian texts; text types general/literary/saintek/humaniora | **NOT_VERIFIED** (beyond primary snippet) | snpmb.id snippet states the subtest purpose; secondary test-prep pages add text-type detail but are **not** authority. Caveat: full SNPMB framework (item blueprints, level definitions, sample counts) **not confirmed**; Phase 1A correctly avoided blueprint claims — keep it that way. |
| P5 | PISA reading literacy definition: "understanding, using, evaluating, reflecting on and engaging with texts" | **VERIFIED_CORROBORATED** | OECD.org's own summary page snippet quotes this definition; corroborated by OECD framework pages and ILSA gateway. Caveat: sub-process verb sets (locate/understand/evaluate/reflect) cited as indicative, not quoted per-cycle. |
| P6 | AERA/APA/NCME *Standards* 2014: validity-as-argument, reliability, fairness as foundational | **VERIFIED_CORROBORATED** | AERA, APA, NCME, and Buros pages all describe this (fairness elevated to a foundational pillar in the 2014 edition). Caveat: full standard not re-read this pass. |
| P7 | Haladyna/Downing/Rodriguez (2002) MC item-writing rules; distractor-quality findings | **VERIFIED_CORROBORATED** | Peer-reviewed record (Applied Measurement in Education) + university summary records. Caveat: journal PDF not re-fetched. |
| P8 | AI-generated MCQs valid only with expert review pipelines ([S12]–[S14]) | **VERIFIED_CORROBORATED** | Peer-reviewed systematic reviews (Oxford PMJ 2026; BMC Med Educ 2024) accessible in search record. Caveat: abstracts/methods summaries, not full-text re-read. |
| P9 | R1–R6 scale, 0–3 scoring, target cognitive mix (R2 40/R3 30/R4 25/R5+ 5), 3–5 option policy | **INTERNAL_DESIGN_DECISION** | BahasaCerdas decisions informed by P5/P7; not official requirements. |
| P10 | Audit numbers (1,500 / 1,480 RETIRE / 19 SALVAGE / 1 BROKEN / 1,330 dupes / 98.7% template) | **VERIFIED_REPOSITORY** | Re-derived from live DB + JSON and matched Phase-7 artifact (audit doc §18). |

---

## 3. Assessment validity findings

Framework used: construct/content/response-process/internal-structure/consequential/fairness/reliability/item-independence/difficulty/discrimination/distractor/stimulus-dependence/diagnostic-interpretation.

| Aspect | Phase 1A coverage | Finding |
|---|---|---|
| Construct validity | DNA `evidence_target` + D2; ECD vocabulary | Sound skeleton. **V1-HIGH**: no *construct definition* artifact exists per skill (what "Membaca–inferensi" means, its boundaries, its response processes). Without it, reviewers cannot consistently judge D2. Add a one-page construct definition per rebuilt skill before Phase 2. |
| Content validity | D12 curriculum alignment + blueprint archetypes | Adequate; needs the missing blueprint artifact (§6) to be complete. |
| Response process | Not addressed | **V2-HIGH**: no requirement that items be checked for the *actual* cognitive process they elicit (e.g., think-aloud or expert response-process review for a sample of items per theme). Cognitive labels on the audit's own evidence are untrustworthy; a sample-based response-process audit must be in the pilot. |
| Internal structure | Calibration stage (p, discrimination) only | **V3-HIGH**: no reliability/measurement-precision requirement; no internal-consistency expectation at bank or scale level. Must be added at calibration Level 1–2 (§10). |
| Consequential validity | Present implicitly (diagnostic use → recommendation/learning-loop) | **V4-MEDIUM**: the standard never states what may *not* be concluded from a single-item or single-session diagnostic (no high-stakes inference). Add an explicit "interpretation bounds" clause (diagnostic = low-stakes formative signal only; [S2]). |
| Fairness | D13/D14 + human review | Adequate structurally; operational checklist not yet written (§13). |
| Reliability | See V3 | Unaddressed → V3. |
| Item independence | **Not addressed** | **V5-HIGH**: shared-stimulus testlets (D4 even rewards ≥2 items per stimulus) create local dependence; treating N testlet items as N independent evidence updates overstates precision. Diagnostic/adaptive engines must treat a testlet as a single evidence unit or model the dependence; per-item independence for single-stimulus items must be an inclusion criterion. |
| Difficulty/discrimination | D9 + calibration | Sound direction; numeric targets missing (§10). |
| Distractor behavior | D7 + theoretical misconception value | **V6-HIGH** (boundedness): see diagnostic-interpretation row. |
| Stimulus dependence | D4 trigger ("item answerable without the stimulus is rejected for reading constructs") | Good; must be a *verified* property (expert + optionally cloze/answer-without-stimulus experiment on a sample), not only heuristic (`MISSING_CONTEXT` is a weak proxy). |
| Diagnostic interpretation | D10 + `misconception_target` | **V7-CRITICAL (boundedness)**: The standard (D7 3-anchor, D10, DNA misconception_target, Validation stage 6) implies a wrong distractor selection *means* the student holds that misconception. That is a **theoretical misconception signal** until proven. Distractor-choice → misconception inference requires empirical validation (response data, error analysis, interviews). Corrections: (a) relabel as hypothesis; (b) only empirically supported misconception tags may drive learner-model messaging; (c) D10 wording must not promise per-misconception diagnosis from a single item. |

---

## 4. Cognitive framework findings

- R1–R6 (audit) ↔ `AiCognitiveTarget` (MENGINGAT…MENCIPTAKAN) mapping in DNA §5 is **clean** — the enum values literally translate Bloom-revised verbs and line up 1:1. **Compatibility confirmed** (no code change needed).
- **F1-MEDIUM**: R1–R6 is an *internal* scale inspired by Bloom-revised + PISA processes; it is **not** the PISA process taxonomy. DNA §5 already centralizes it; add an explicit line "internal scale; informed by, not equivalent to, Bloom/PISA" so downstream authors do not cite it as a national/international framework.
- **F2-NO_CHANGE**: the standard already separates cognitive demand (D3) from difficulty (D9) — R-level alone is not treated as difficulty. The audit's own mistake (levelBerpikir assigned arithmetically) is explicitly barred.
- **F3-LOW**: "R6 Create" cannot exist in selected-response items; DNA already restricts R6/MENCIPTAKAN to CONSTRUCTED. Preserve that restriction and make the MCQ cognitive ceiling R5 explicit in the standard (currently implied).
- Problematic mapping to watch: "ide pokok" items labelled R2 (literal) vs R4 (if the main idea must be inferred across a long text) — the R-cell must be assigned per item from content, not per theme label (D3 already says this; reinforce in blueprint).

---

## 5. Practice / assessment / diagnostic / adaptive separation

| Dimension | PRACTICE | ASSESSMENT (kuis/latihan guru) | DIAGNOSTIC (Tes Awal / adaptive) |
|---|---|---|---|
| What to measure | fluency/consolidation of taught skill | curriculum mastery per assignment | subskill-level ability estimate + misconception hypotheses |
| Evidence produced | correctness + speed | score vs rubric | ability update per skill × difficulty; distractor signal (theoretical) |
| Mandatory gates | structural + content + answer + language | practice gates + difficulty fit + (fairness) | all of assessment + evidence-target match + misconception bounded + calibration-backed difficulty for routing |
| Reusable? | yes, upward | yes, upward | **no downward reuse** (diagnostic-calibrated items are the *most* valuable; reuse in practice is fine, reverse is not) |
| Reuse risk | weak-distractor or off-construct item enters diagnostic/adaptive pool and corrupts ability estimate | same | over-exposure of calibrated items |

**Finding P1-HIGH**: the standard defines `assessment_purpose` (DNA) but has **no gate matrix and no reuse rule**. A PRACTICE item (acceptable distractors, no evidence_target scrutiny) can satisfy all current gates and enter the diagnostic pool. Add: (a) purpose is assigned at authoring and locked at PUBLISH; (b) DIAGNOSTIC/ADAPTIVE eligibility requires purpose ≥ ASSESSMENT + evidence_target review + D10 ≥ 2; (c) practice→assessment reuse allowed, reverse reuse only through full re-gate. **P2-MEDIUM**: the standard correctly refuses to treat all item types as equivalent in *structure* (ISIAN/BS rules) but does not yet differentiate them by *evidence value*; add per-type evidence notes (e.g., BS items are weak evidence carriers and should be a small share of diagnostic banks).

---

## 6. 50-theme blueprint audit

Base: audit doc §12 (all 50 themes) + §15 archetype/cognitive/difficulty targets. Findings below **do not rename or merge files** — they are recommendations for the future blueprint artifact.

**Overlap clusters (B1-HIGH — must be resolved in the blueprint, not by file edits):**
- `Editorial` vs `Teks Editorial`; `Kalimat` vs `Kalimat Efektif` vs `SPOK` (syntax family); `Ide Pokok` vs `Gagasan Utama` (near-synonyms, both exist); `Makna Kata` vs vocabulary themes.
- Recommendation: blueprint defines a **construct map** over the 50 labels (which skills/subskills each exercises, which share evidence targets) so item budgets don't double-count the same ability; shared-evidence themes may share a common item pool with different topic framing.

**Too narrow for a large bank (B2-MEDIUM):** `Slogan`, `Poster`, `Iklan` (functional-adjacent; recommend 10–15 items each, or one "Iklan/Slogan" evidence cell); `Gurindam`, `Syair` (5–15 each with shared literary-evidence cell with Pantun/Puisi). Do not force 30/thm.

**Better treated as subskills (B3-MEDIUM):** `Sinonim` + `Antonim` already map to taxonomy subskill `VOCABULARY_SINONIM_ANTONIM` — build as *one* vocabulary evidence cell with two topic labels; `Kata Baku` splits between GRAMMAR_KATA_BAKU and VOCABULARY_KATA_BAKU — the blueprint must pick one evidence home per item. `Slogan` fits under an Iklan-type construct.

**Stimulus-based assessment inappropriate or special (B4-MEDIUM):**
- Vocabulary/recall themes (Sinonim, Antonim, Kata Baku, Tanda Baca, Ejaan, Imbuhan): stimulus = **sentence-level context**, not passage (Quality Standard D4 already allows SHORT_CONTEXT). Requiring passages here would inflate difficulty and test reading, not the construct — **construct contamination risk if over-applied**.
- `Teks Berita` may eventually want data/image-based items (J archetype) — requires multimodal stimulus architecture (future special case, flagged, not built).
- None of the 50 themes is listening/speaking — fine; those live in UKBI/TKA banks. Keep them out of this bank.

**Volume (B5-NO_CHANGE):** adopt audit §15 guidance (P0 10 launch / 20–30 full per theme), but make volume *per evidence cell*, not per theme label, after B1.

---

## 7. Teks Berita pilot review

**Construct coverage requested vs proposed architecture** (audit §16 + blueprint stub): explicit info (5W+1H), info relationships, main idea, inference, summary, vocabulary-in-context, fact/opinion, evidence evaluation, structure, critical interpretation. Architecture is sound for all ten **provided**:
- **(TB1-HIGH)** items are built on **short authentic-or-derived news texts (75–200 words SMP / 100–250 SMA)** so vocabulary is load-controlled; if stems lean on rare journalistic vocabulary, an "inference" item silently becomes a vocabulary item — **construct contamination**. Success criterion: expert agreement that every inference item is answerable from the text by a grade-appropriate reader who has never seen the passage vocabulary list.
- **(TB2-HIGH)** no item may require outside current-affairs knowledge; all key evidence inside the text. Contamination check: the item must be solvable with the passage alone (expert + reviewer).
- **(TB3-MEDIUM)** fact/opinion and evidence-evaluation items must not depend on real-world truth of the (possibly adapted) news event — the text is the sole authority.
- **(TB4-MEDIUM)** "critical interpretation" risks R5+R6 blur: keep R5 (evaluate) in MCQ; route synthesis items to CONSTRUCTED only.

**Measurable pilot success criteria (Phase 2 acceptance):**
1. Authoring-contract completeness: 100% of pilot items carry evidence_target + cognitive_target + misconception_target-or-explicit-non-misconception flag.
2. Deterministic gates: 0 items rejected at structural/content/answer stages after authoring fixes (i.e., no template/tautology/leak codes).
3. Human review: all 15 dimensions scored; mean ≥ 2.0; **no dimension < 2**; 100% of semantic dims human-scored; 0 FAIRNESS/LANGUAGE hard-fails.
4. Stimulus-dependence: ≥95% of reading items judged (by 2 reviewers) as not answerable without the stimulus.
5. Expert agreement (first pilot, n ≥ 20 items): ≥ 0.80 agreement on key + ≥ 0.70 on cognitive cell (targets for the two-reviewer rubric calibration, not guarantees).
6. Calibration (LEVEL 1, §10): after ≥ 40 responses/item: p ∈ [0.30, 0.90]; point-biserial r ≥ 0.15 (target ≥ 0.20) for ≥ 80% of items; flagged items revised or retired, never silently re-celled to mask.
7. Security: 0 leaked fields in student payload scans (existing leakage suites extended to the new surface).
8. Coverage: per theme cell targets met (e.g., Teks Berita: 2 eksplisit / 2 gagasan utama / 2 fakta-opini / 2 struktur / 1 vocab-in-context / 1 evaluasi) at the 10-item launch floor.

---

## 8. AI governance findings

Phase 1A's binding rules (auto gates may reject, never approve; HUMAN_REVIEW only after a real read; AI never reaches PUBLISH alone) are **correct and match the empirical literature** ([S12]–[S14]). Residual items:

| Decision | AI may DRAFT/propose | Deterministic validation mandatory | Human review mandatory | AI may DECIDE ALONE? |
|---|---|---|---|---|
| Factual correctness | yes (flagged) | contradiction checks only | **yes** | **NO** |
| Answer-key correctness | yes | **yes** (index/range/uniqueness/echo) | confirmation | **NO** |
| Ambiguity detection | yes (advisory) | heuristic flags | **yes** | **NO** |
| Cognitive classification | yes (proposal) | enum validity | **yes** (confirm cell) | **NO** |
| Difficulty prediction | yes (proposal) | no arithmetic/dedup-from-sibling rule | **yes** (confirm) + calibration | **NO** |
| Misconception inference | yes (proposal) | no | **yes** + empirical validation (V7) | **NO** |
| Bias detection | advisory screener only | no | **yes** | **NO** |
| Final publication | no | no | **yes** (human APPROVED) | **NO** |

**AI1-LOW**: the "AI spot-check pre-screeners" in Validation Spec §AI-guardrails risk *over-trust in green flags*; they must be labeled advisory and must never shorten the mandatory human review. **AI2-NO_CHANGE**: realtime AI diagnostic generation is a separate already-gated feature; this standard governs the authored bank, and the two must stay decoupled (realtime AI never writes to the bank pool).

---

## 9. Question quality scoring review

- **Dimension overlap**: D1 vs D6 (both touch the key), D7 vs D11 (distractor sets), D3 vs D9 (cognitive vs difficulty) — overlaps are acceptable *if* the scoring guide says where one ends and the other begins. **S1-MEDIUM**: add one-line disambiguation per overlapping pair in the scoring guide; otherwise reviewers double-penalize (deflating) or double-credit (inflating).
- **Mean can hide critical failure**: current rule already blocks any dimension < 2 for non-calibration items — but the **calibration escape hatches on D3/D9/D10 create the exact hole the mission hypothesizes**:
  - Edge case: 14×3 + 1×1 (the 1 on D10) with `CALIBRATION` tag → **passes today** (mean 2.87, all ≥2 except D10=1 allowed under calibration). **This must not pass.** Diagnostic value is the product's core; a diagnostic bank full of calibration-tagged low-D10 items is the 1,480-item lesson again.
- **S2-CRITICAL (scoring rule)**: rewrite §4.4 as **conjunctive publish**:
  1. Every HARD-FAIL dimension ≥ 2 and no hard-fail trigger.
  2. Every SCORED dimension ≥ 2 — **D10 is never eligible for the calibration allowance**; D3/D9 may accept a documented 1 **only** when the item is CALIBRATION **and** D10 ≥ 2 **and** D2 ≥ 2.
  3. Human APPROVED (provenance HUMAN_REVIEW, reviewer recorded).
  4. Mean ≥ 2.0 becomes an **advisory tier metric** (Gold ≥ 2.6 / Silver ≥ 2.3 / Bronze ≥ 2.0), not a publish condition.
- **S3-NO_CHANGE**: hard-fail set (D1,D2,D5,D6,D7,D8,D11,D13,D14,D15) is defensible and matches "auto-gates reject, humans approve."
- **S4-LOW**: MUST-HAVE-STATED-ROLE class has exactly one member (D10); the class name/mechanics add little beyond the D10 ≥ 2 rule — fold it into the publish rule and delete the class to reduce machinery.

---

## 10. Difficulty / calibration review

Practical progression (matching BahasaCerdas realistic volumes — per item per evidence cell, class-level exposure, not national-test N):

- **LEVEL 0 — author judgment (always)**: cell assigned from content rubric (length, vocabulary, inference distance, distractor proximity); arithmetically assigned or sibling-copied cells are rejected (Quality Standard D9). No statistics.
- **LEVEL 1 — pilot proportion-correct + basic discrimination (new items, first ~40–60 responses/item)**: p = correct/(used) from existing `Soal.correctCount/wrongCount`; point-biserial or high-low discrimination from the same telemetry. **Realistic with BahasaCerdas volumes** only if aggregated per (cell, kelas) once an item passes ~30 responses — small classes will not reach N per item; define the floor as **N ≥ 30 per item OR pooled per (skill, difficulty, kelas) bucket when item-N < 30**. Decisions: cell confirm / re-cell (with content re-review, never silent) / retire.
- **LEVEL 2 — larger-sample calibration (item-N ≥ 100 per cell, or exposure-cap rotation)**: item p/discrimination bands per difficulty cell; internal-consistency contribution checks (alpha/delta if item removed — computed per scale, low-N honest). This is where items may earn "calibrated" difficulty and enter difficulty-routed pools as **trusted** cells.
- **LEVEL 3 — IRT (future-state, explicitly labeled)**: only justified when a skill scale accumulates thousands of responses across a stable item pool with controlled exposure (BahasaCerdas adaptive diagnostic could reach this per major skill, not per theme). Do not build IRT now; design telemetry (item id, ability proxy, response time, exposure) so LEVEL 3 is reachable without schema rework.

**C1-MEDIUM**: Validation Spec §10 currently implies per-item calibration without the N-floor realism above; replace with LEVEL 0–3 and the pooling fallback. **C2-MEDIUM**: add reliability expectation (e.g., scale-level consistency tracked from LEVEL 2; single-session diagnostic precision bounds published in the interpretation clause, V4).

---

## 11. Duplicate / template defense review

Forensic baseline: 1,330 exact dupes / 150 families / 98.7% template. Defense tiers and **false-positive risks**:

| Duplicate class | Detection | Auto-reject? | False-positive risk |
|---|---|---|---|
| Exact (normalized text+options+key) | hash | **yes** | minimal — only false if normalization is lossy (keep punctuation-insensitive, case-insensitive, whitespace-normal) |
| Lexical near-duplicate | stem/option n-gram similarity (e.g., ≥ 0.9) | **yes at ≥0.95; WARN 0.85–0.95** | e.g., two SPOK items with same frame but different sentences must NOT collide on frame text — compare *content-bearing* tokens, exclude instructions ("Tentukan subjek pada kalimat") |
| Structural duplicate (same template family) | template detectors (existing bank-gate codes) | **yes** | low for the audited families; new templates must be added by evidence, not by regex proliferation |
| Semantic duplicate (same construct, different surface) | human review (flagged) | **no** | **must not auto-reject**: same misconception tested in a different text is legitimate |
| Same stimulus / different question | stimulus-signature grouping | **no — legal testlet** | rejecting these would kill multi-item passages (D4 anchor 3) |
| Same misconception / different context | human | **no** | legitimate content; only exposure/rotation applies |
| Legitimate reuse (calibrated item re-used across purposes) | n/a | **no** | see §5 reuse policy |

**D1-HIGH (false-positive control)**: the duplicate gate must compare **content-bearing tokens with the instruction/template frame stripped** (the audit's own filler stems show frames repeat across legitimately different items). The existing `CROSS_DUPLICATE` first-80-chars stem map in `content-validation.ts` is **too coarse** and would false-positive on legitimate frame-sharing items — do not reuse it as-is for auto-reject; rework to content-token comparison (reuse opportunity flagged; code change deferred).
**D2-NO_CHANGE**: semantic-dup = human WARN only is correct. **D3-NO_CHANGE**: bank-level filler detection (cross-theme option-set reuse) should stay a hard gate (Quality Standard D7) — that was a *defining* audit defect.

---

## 12. Authoring vs delivery security review

The DNA §2 separation is conceptually correct and matches existing code (`sanitizeSoalForStudent`, `toPublicQuestion`, leakage suites). Verdict: **sound**; add the conceptual DTO boundary explicitly.

**Conceptual DTO boundary (no implementation):**
- `PublicQuestionView` (student, before/while answering): `item_id`/`kodeSoal` (public), `topic/theme` label, `skill/subskill` labels, `grade`, `difficulty` **label only**, `stimulus`, `stimulus_type`, `prompt`, `item_type`, `options`.
- `PostAttemptFeedbackView` (only via product-sanctioned results path, never during an attempt): adds sanitized `explanation` (no rubric internals, no per-distractor rationale).
- **Never in any student payload**: `answer_key`, full `explanation` (pre-attempt), `distractor_rationale`, `misconception_target`, `evidence_target`, `curriculum_mapping` internals, `validation_status`, `review_status`, `reviewer`/`reviewed_at`, `provenance` (where it implies human reviewer identity), calibration statistics (`p`, `discrimination`, `exposure`), internal reason codes.
- **SEC1-MEDIUM**: `provenance` can reveal reviewer identity indirectly; student surfaces must expose the *publication tier* (e.g., "bank soal", "AI-assisted") at most — never reviewer fields. Existing sanitizers already drop these; extend the leakage regression to assert the full DNA §2 list on any new delivery surface.
- **SEC2-NO_CHANGE**: answer keys remain server-side-only (existing suites); post-submit `correctOptionIndex` in results is an accepted product feature and is out of the bank scope.

---

## 13. Expert review checklist (engineering vs content expert)

| Checklist item | Validated by | Method |
|---|---|---|
| Structural integrity, key index, option count/dupes, template/tautology/leak codes, duplicate collision, DTO leakage | **ENGINEERING** (deterministic) | existing + planned gates, leakage suites |
| Difficulty-cell sanity vs content signals (length/vocab/inference), calibration stats, item-exposure | **ENGINEERING** (statistics) | telemetry, calibration LEVEL 0–2 |
| Curriculum alignment (CP elemen/fase fit, claimed mapping accuracy) | **CONTENT EXPERT** | per-item mapping review against CP |
| Linguistic correctness & natural Indonesian (PUEBI, register, grade-fit vocabulary, typos that change meaning) | **CONTENT EXPERT** | checklist review |
| Stimulus authenticity (texts read like real Indonesian news/literature/functional texts) | **CONTENT EXPERT** | source audit (original vs adapted) |
| Cultural appropriateness & fairness (regional/dialect/gender/socioeconomic neutrality) | **CONTENT EXPERT** | fairness checklist per theme |
| Ambiguity & single-best-answer (two defensible answers? outside knowledge required?) | **CONTENT EXPERT** (double review for pilot) | independent second review + adjudication |
| Answer-key validity (semantic, incl. explanation↔key consistency) | **CONTENT EXPERT** (engineering checks the mechanics) | review + deterministic re-check |
| Distractor plausibility + misconception hypothesis | **CONTENT EXPERT** (hypothesis) → empirical | review; empirical validation separate (V7) |
| Cognitive cell alignment (R2–R5 as actually elicited) | **CONTENT EXPERT** + response-process sample | rubric scoring + think-aloud sample in pilot |
| Diagnostic interpretation wording (learner-facing claims) | **CONTENT EXPERT** | bounds clause review (V4) |
| Testlet/item-independence consequences for shared stimuli | **ENGINEERING + EXPERT** | evidence-unit treatment review |

---

## 14. Findings classification (severity summary)

| ID | Severity | Finding | Fix owner |
|---|---|---|---|
| V7 | **CRITICAL** | Distractor→misconception treated as evidence without empirical validation | standard/DNA revision (§15) |
| S2 | **CRITICAL** | Calibration allowance on D10 lets a 14×3+1 item pass | scoring rule revision (§15) |
| V1 | HIGH | No per-skill construct definitions → D2 unreviewable consistently | blueprint/standard |
| V2 | HIGH | No response-process audit requirement | standard/pilot |
| V3 | HIGH | No reliability/internal-structure requirement | calibration spec |
| V5 | HIGH | Testlet local dependence unhandled | standard/engine note |
| P1 | HIGH | No purpose-reuse gate (practice→diagnostic) | standard |
| D1 | HIGH | Duplicate false-positive risk; existing CROSS_DUPLICATE too coarse | duplicate spec/engine |
| TB1/TB2 | HIGH | Teks Berita contamination risks (vocab load; outside knowledge) | pilot spec |
| B1 | HIGH | Theme overlap clusters unresolved in a blueprint | blueprint artifact |
| V4, P2, B2–B4, C1, C2, F1, F3, S1, S4, SEC1, AI1, TB3, TB4 | MEDIUM | see sections 3–12 | various |
| F2, B5, AI2, D2, D3, SEC2, S3 | NO_CHANGE / LOW | see sections | — |

No finding was manufactured; each is anchored to a repository artifact or an explicit reasoning chain above.

---

## 15. Recommended Phase 1A revisions (before generation)

1. **Create the missing `QUESTION_BANK_50_THEME_BLUEPRINT.md`** (or formally designate audit §12–§18 + a construct map as it) resolving the B1 overlap clusters and B2–B4 volume/architecture flags. *(BLOCKING for blueprint-dependent work.)*
2. **Quality Standard §4.3 D7/D10 + DNA `misconception_target`**: relabel distractor-misconception links as **theoretical signals**; add an empirical-validation tier (response data → validated tag) before any learner-facing misconception claim (V7). *(CRITICAL)*
3. **Quality Standard §4.4**: conjunctive publish rule — all HARD-FAIL ≥ 2, all SCORED ≥ 2, **D10 never calibration-exempt**, D3/D9 calibration-1 only when D10 ≥ 2 and D2 ≥ 2; mean becomes advisory tier metric; fold MUST-HAVE-STATED-ROLE into the rule (S2, S4). *(CRITICAL)*
4. **Quality Standard**: add reliability expectation and **item-independence/testlet clause** (shared-stimulus items = one evidence unit for diagnostic use) (V3, V5); add interpretation-bounds clause (V4); add per-purpose gate matrix + reuse rule (P1, P2).
5. **Validation Spec §10**: replace implied per-item calibration with LEVEL 0–3 + N-floor/pooling fallback (C1, C2).
6. **Validation Spec §7**: duplicate gate = content-bearing-token comparison with instruction-frame stripping; exact = auto-reject, semantic/same-stimulus/same-misconception = human-only (D1).
7. **Validation Spec §13**: add expert-review checklist split (this report §13) and response-process sample requirement (V2).
8. **Bibliography**: add an explicit "internal scale ≠ PISA/Bloom/UKBI" note (F1) and keep the P4 SNPMB NOT_VERIFIED caveat until the official framework is fetchable.

---

## 16. Decision

**CONDITIONAL GO.**

The foundation is fundamentally sound: compatible with the repo architecture (verified against `LearningSkillType`, `Difficulty`, `AiCognitiveTarget`, `bank-gate`/`content-validation` vocabularies and the existing sanitizer/DTO patterns), aligned with assessment science on its core claims, and — after the four corrections in the Executive verdict (§1) — will not systematically produce misleading assessment evidence. It does **not** warrant NO-GO: no major construct/validity defect makes the architecture itself unsound.

Conditions (must be satisfied before Phase 2 question generation):
1. V7 + S2 corrections merged into the Phase 1A docs (items 2–4 above).
2. Blueprint artifact or equivalent pointer exists (item 1).
3. Teks Berita pilot spec encodes §7 success criteria and the §10 LEVEL 0–3 calibration path.
4. Primary-source caveats remain on record (P4 stays NOT_VERIFIED; P1/P3 stay VERIFIED_CORROBORATED) — acceptable for proceeding because no binding requirement depends on unverified detail.

**HARD STOP OBSERVED.** This verification report is the only artifact created. No questions generated, no bank/DB/schema/validator/factory changes, no allowlist population, no production code modified. Next phase requires founder review of this report.

---

*Files inspected this pass: the four Phase 1A docs, the Phase 0 audit doc, `prisma/schema.prisma` (LearningSkillType/Difficulty/QuestionMetadata), `lib/question-metadata/taxonomy.ts`, `lib/diagnostic-ai/bank-gate.ts`, `lib/question-bank/content-validation.ts`, `lib/question-bank/delivery-gate.ts`, `lib/diagnostic-ai/types.ts`; plus 15 external sources (all classified in §2). Working tree: only this document plus the four untracked Phase 1A docs — no edits made.*
