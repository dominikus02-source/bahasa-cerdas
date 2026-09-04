# BahasaCerdas — Question Bank Quality Standard (v1.1, Draft for Review)

**Status**: SPECIFICATION (Phase 1A.2 — DESIGN/RESEARCH ONLY). v1.1 applies the Phase 1B conditional-go corrections V7 (misconception→evidence semantics, §4.8) and S2 (conjunctive publish rule + D10 states, §4.4/§4.9); correction log in §4.10. No DB writes, no bank edits, no production code changes.
**Companion docs**: `QUESTION_ITEM_DNA.md` (logical item structure) · `QUESTION_VALIDATION_SPEC.md` (pipeline) · `QUESTION_BANK_RESEARCH_BIBLIOGRAPHY.md` (every claim keyed `[S#]`).

---

## 4.1 Purpose

The forensic audit (`QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md`, 2026-09-04) found the 50-theme MASTER_BANK — 1,500 items — to be 98.7% template garbage: 1,480 RETIRE, 19 SALVAGE (recall-only, stimulus-less), 1 BROKEN, **0 KEEP**; 99.9% R1 recall; 1,330 exact duplicates; `levelBerpikir`/`difficulty` assigned arithmetically; metadata "APPROVED" that reviewed taxonomy but never content. Production containment (P0.6, commits `eef46d6`…`2488489`) guarantees **0 contaminated items can reach students** through any delivery path — but containment is not content.

BahasaCerdas therefore needs a standard that turns "an item that renders and has a key" into **an item that produces valid evidence about a named Indonesian-language skill**, so that future item authoring (human, AI-assisted, or hybrid) is governed by one contract. This standard is written to be:

1. **Evidence-first** — validity is an argument about intended interpretation and use ([S7]); every item must state what a correct/incorrect response means before it is written.
2. **Deterministic where possible** — hard-fail checks must be checkable by code (mirroring `bank-gate.ts` vocabulary), leaving to human review only what code cannot decide.
3. **Repo-grounded** — it extends existing machinery (`content-validation.ts`, `bank-gate.ts`, `delivery-gate.ts`, `validator.ts` R1–R16, QuestionMetadata statuses) instead of inventing a parallel system.
4. **Curriculum-honest** — skill claims must be defensible against the Kurikulum Merdeka Bahasa Indonesia elemen ([S1]–[S3]) and, where relevant, national/UKBI frameworks ([S4], [S6]) — without falsely claiming equivalence to those instruments.

## 4.2 Non-negotiable principles

Each principle below is binding on every item that may reach a student. Source/type per principle in parentheses.

1. **Assessment before generation** (RESEARCH-INFORMED, [S10]). An item is created to update a stated evidence target (skill × subskill × cognitive process). Authoring an item without naming its evidence target is prohibited — it is how the 1,480-item recall machine was born.
2. **Evidence before score** (SOURCE-DERIVED via [S7], [S10]). A score point is a summary of observations; it is only meaningful if each observation is evidence for the construct. Items whose correct/incorrect tells us nothing about the target skill (terminology tautologies, "pernyataan X adalah bagian dari materi", self-answer "jelaskan X") are invalid *regardless of key validity*.
3. **Stimulus where the construct requires it** (SOURCE-DERIVED via [S1], [S9]). Reading/evaluation/inference constructs require a stimulus (passage, text, functional document, or at minimum a rich context sentence). Recall-of-definition items may exist only where the construct *is* recall (e.g., a spelling-form item), and must still carry enough context to be unambiguous.
4. **Single-best-answer discipline** (SOURCE-DERIVED via [S8]). Exactly one defensible key per selected-response item; every distractor must be defensibly wrong on the basis of the stimulus/task, not merely "less good-sounding". "Multiple defensible answers" and "no defensible answer" are both hard failures.
5. **No accidental clues** (SOURCE-DERIVED via [S8]). Prohibited: key-position patterns (e.g., always option A), grammatical/lexical concordance that gives away the key, key text echoed verbatim in the stem for non-passage items, "all of the above / none of the above".
6. **No tautology** (SOURCE-DERIVED via audit + [S8]). "Contoh X → option X", "Pernyataan: X adalah bagian dari materi", and any stem that hands the answer back in the options are hard failures. (Deterministic detectors exist: `TEMPLATE_STEM`, `FILLER_DISTRACTORS`, `KEY_IN_STEM`.)
7. **No meaningless distractors** (SOURCE-DERIVED via [S8], [S11]). Distractors must be (a) content-homogeneous with the key, (b) plausible, (c) mutually exclusive after normalization, (d) written, not padded. Cross-theme filler reuse (the "Menulis cerita pendek / Membaca puisi / Menyusun laporan" family) is banned. Better 3 strong options than 5 weak ones ([S11]).
8. **No fake difficulty** (SOURCE-DERIVED via audit). Difficulty must be an *empirical or reviewed* property of the item (length, vocabulary, inference distance, distractor proximity), never assigned arithmetically or by copying the difficulty of a sibling template. Metadata difficulty ≠ item difficulty until validated.
9. **No duplicate families** (SOURCE-DERIVED via audit). Byte-identical or near-identical items (same stem, permuted options) are a single item. Duplicate detection is a publish gate; a session/theme must not be able to serve the same content twice.
10. **No unsupported factual claims** (SOURCE-DERIVED via [S12]–[S14]). Any factual proposition in stimulus/key/explanation (including literary/historical/linguistic claims and "definition of X") must be verifiable; AI-drafted content carries a special obligation here (see Validation Spec).
11. **No answer-key ambiguity** (SOURCE-DERIVED via [S8]). Key must be an exact index/text; the explanation must be consistent with the key; a key that "could also be" a distractor is a hard failure.
12. **No taxonomy-only approval** (SOURCE-DERIVED via audit, [S15]). QuestionMetadata `APPROVED` is awarded only after content review by a human who read the item (provenance `HUMAN_REVIEW` means exactly that). Taxonomy approval alone must never gate delivery.
13. **Fairness & accessibility** (SOURCE-DERIVED via [S7]). Items must not disadvantage students on gender, region/dialect, religion, socioeconomic, or special-educational-needs grounds; reading vocabulary must not exceed the level needed to test the target construct; visual/audio features must have accessible alternatives.
14. **Security by construction** (INTERNAL REQUIREMENT). `correctAnswer`, `explanation`, `distractor_rationale`, `scoringRule`, and any internal validation metadata are server-side-only. Student payloads never carry them (existing leakage tests are part of the regression contract).
15. **Containment stays on** (INTERNAL REQUIREMENT). The delivery gates shipped in P0.6 remain the outer ring. This standard governs what may be *added to the eligible pool*; it does not weaken the gates.

## 4.3 Item quality dimensions (scoring framework)

Scale: **0 = fail · 1 = weak · 2 = acceptable · 3 = strong** (three points, not four, so reviewers cannot "split the difference" into a pass; 0 and 1 both mean "not publishable", 2 means "publishable with no known defect", 3 means "exemplary for this dimension").

Each dimension lists (i) what is being judged, (ii) what a 0/1/2/3 looks like, (iii) gate class (see §4.4), (iv) whether code can decide it today, and (v) notes.

### D1. Content correctness (HARD-FAIL dimension; code: partially)
Judge: every factual, definitional, and interpretive proposition in stimulus, options, key, and explanation is correct and verifiable.
- 0: any factual error, wrong key, or a claim contradicted by the stimulus/official definition ([S12]).
- 1: unverifiable claim, or "correct enough" but imprecise wording that could mislead.
- 2: all propositions correct and verifiable.
- 3: propositions are correct and optimally precise; explanation cites the stimulus evidence.
Notes: code can catch key-vs-options index faults and internal contradictions (`WRONG_ANSWER`); **factual truth requires human review** — mandatory dimension for any AI-drafted content ([S12]–[S14]).

### D2. Construct alignment (HARD-FAIL)
Judge: the item actually exercises the named skill × subskill and produces the evidence its `evidence_target` claims.
- 0: item tests something else (e.g., a "Membaca–inferensi" item answerable from general knowledge, or a "grammar" item that is really vocabulary recall).
- 1: construct overlap is partial or ambiguous.
- 2: clear, defensible alignment; response plausibly updates the target skill.
- 3: alignment is tight and the item discriminates *within* the subskill (e.g., distinguishes literal vs inferential reading).
Notes: code can flag obvious mismatches (MISSING_CONTEXT heuristic in `content-validation.ts`); judgment is human ([S10] student-model discipline).

### D3. Cognitive demand (SCORED; targets per theme)
Judge: the mental process required, on the PISA-informed process scale adopted here ([S9]; repo's R1–R6 in the audit doc):
R1 recognition/recall · R2 understand/locate explicit info · R3 apply (e.g., edit a sentence, use a rule) · R4 infer/analyze · R5 evaluate/reflect · R6 integrate/synthesize.
- 0: R1 where the construct needs R2+ (e.g., "ide pokok" asked as definition recall).
- 1: R2 where the theme blueprint targets R3–R4.
- 2: process matches the blueprint's target for the item's difficulty cell.
- 3: process is unambiguous and the strongest distractor demands one level *more* than the key to reject (without becoming a trap).
Notes: theme-level mix is a blueprint requirement (see audit §15: R2 40 / R3 30 / R4 25 / R5+ 5 for rebuilt themes); code cannot judge demand; cognitive *labels* (`levelBerpikir`, `AiCognitiveTarget`) must be set from this review, not arithmetic.

### D4. Stimulus quality (SCORED; required where construct demands)
Judge: the stimulus is authentic/suitable, self-contained (all needed evidence inside), correct register and difficulty for `kelas`, and well formatted.
- 0: no stimulus where one is required; or stimulus is a decoy that the item does not use.
- 1: stimulus present but weak (too short to require reading, telegraphs answers, or internally inconsistent).
- 2: adequate, self-contained, grade-appropriate.
- 3: authentic or near-authentic text; supports ≥2 independent items; no item is answerable without it.
Notes: the audit's core defect (0/1,500 stimulus-based items) makes this the highest-leverage dimension for reading themes ([S1], [S9], [S6] seksi III/IV style). "Item does not actually require the stimulus" is a hard trigger regardless of score ([S8] test-wiseness).

### D5. Question clarity (HARD-FAIL)
Judge: stem is unambiguous, singular, and readable on first pass.
- 0: unparseable, double-barreled, or answerable two ways from the wording.
- 1: requires re-reading to disambiguate; vocabulary above grade.
- 2: clear, concise, grade-appropriate.
- 3: exemplary; stem alone fully defines the task and the response form.
Notes: code can catch length/duplicate-stem but not ambiguity — human review required ([S8] stem rules).

### D6. Answer-key validity (HARD-FAIL; code: mostly)
Judge: exactly one key; it is an in-range index (PG/BS) or exact expected text (ISIAN); option text ≠ stem text where prohibited.
- 0: missing/out-of-range/non-index key; key = stem word (`BC-SINONIM-0003` pattern); duplicate keys.
- 1: key technically valid but "best-of-weak-set" rather than uniquely correct.
- 2: uniquely correct per stimulus.
- 3: uniquely correct and robust to the strongest distractor.
Notes: fully checkable by the existing `bank-gate`/`diagnosticSafeIssues` rules (`KEY_MISSING`, `KEY_NOT_INDEX`, `KEY_OUT_OF_RANGE`, `KEY_IN_STEM`, `DUPLICATE_OPTION`).

### D7. Distractor quality (HARD-FAIL)
Judge: each distractor is plausible, content-homogeneous, mutually exclusive, and built around a defensible error **hypothesis** (each encodes a *theoretical* common error, not random noise). Selecting a distractor is **consistent with** that hypothesis; it is **not by itself evidence** that the student holds the misconception (V7, §4.8).
- 0: off-topic/filler distractors, duplicates after normalization, or distractors reused across themes ([S8] homogeneity rule; filler family audit).
- 1: on-topic but obviously wrong or near-duplicates of each other.
- 2: plausible; at least one distractor encodes a *hypothesized* predictable error/misconception (V7: hypothesis, not validated signal).
- 3: all distractors are designed around defensible error hypotheses and the item is *usable diagnostically* — wrong answers are informative against those hypotheses ([S10] evidence model) **only after** the distractor–misconception link has empirical support (§4.8).
Notes: "distractor_rationale" (ITEM DNA) is mandatory at 2+ and records the *hypothesis* (author/design rationale); code can detect dup/empty/short; human judges plausibility and hypothesis value. Learner-facing text must say "jawaban ini konsisten dengan …" (consistent with), never "= kesalahan berpikir X", until the response-pattern tier (§4.8) validates the link.

### D8. Language quality (HARD-FAIL)
Judge: the Indonesian is natural, grammatical, standard (PUEBI), and register-appropriate for the grade; no typos that change meaning.
- 0: ungrammatical, incoherent, or a meaning-changing typo/ambiguity.
- 1: awkward but parseable.
- 2: natural standard Indonesian.
- 3: exemplary prose (esp. for stimulus themes like cerpen/puisi/editorial).
Notes: spelling/grammar of *options* may be intentionally wrong only when the tested construct is spelling/grammar (the SPELLING_TYPES carve-out in `content-validation.ts`). Human review; no code checker today.

### D9. Difficulty integrity (SCORED)
Judge: the item's difficulty *cell* (EASY/MEDIUM/HARD/VERY_HARD) is consistent with its content (length, vocabulary, cognitive demand, distractor proximity) and — once live — with its empirical statistics.
- 0: difficulty copied from a sibling/template, or wildly inconsistent (a HARD item that is an EASY duplicate).
- 1: plausible but unsubstantiated.
- 2: reviewed and consistent; calibration queue registered.
- 3: empirically confirmed (p-value/discrimination within target band after N responses; see Calibration in Validation Spec).
Notes: audit found difficulty was *arithmetic* — this dimension exists to kill that practice. Empirical stats come from `correctCount/wrongCount` telemetry already on `Soal`.

### D10. Diagnostic value (SCORED — the point of the product)
Judge: can a correct/incorrect response update the learner model meaningfully? Does the item separate the skilled from the unskilled on its target subskill ([S10])? **D10 carries an explicit state (§4.9) and is never calibration-exempt (§4.4).**
- 0: no (any correct answer is as likely from guessing/pattern as from skill).
- 1: weak (vocabulary/term recall where the skill is reading).
- 2: meaningful single-item evidence (item discriminates the target subskill); distractor hypotheses stated and human-reviewed but not yet empirically validated.
- 3: strong (works in an adaptive chain); the item's discrimination is *empirically supported* (response-pattern tier, §4.8) and its distractor–misconception hypotheses have response-data corroboration.
Notes: per-theme blueprints assign a target diagnostic role; a bank theme may legitimately mix HIGH-value items (reading) and supporting items (vocabulary), but *every* item must state its role **and its D10 state**. A "CALIBRATION" tag never satisfies D10 by itself — calibration evidence may *upgrade* D10 to EMPIRICALLY_SUPPORTED only after the response-pattern analysis in §4.8.

### D11. Originality / duplicate risk (HARD-FAIL; code: mostly)
Judge: the item is not an exact or near duplicate of any other item in the theme/bank (normalized text+options+key; same-stem-different-options counts as duplicate risk).
- 0: byte/normalized-identical to another item; or stem is a template slot.
- 1: near-duplicate stem or re-uses a whole distractor set from a different item.
- 2: unique stem; overlaps only incidental vocabulary.
- 3: fresh and contributes a new evidence cell not already covered.
Notes: run in the duplicate gate (Validation Spec §9); cross-theme filler reuse triggers D7 regardless.

### D12. Curriculum alignment (SCORED; class "must not contradict")
Judge: content sits inside a defensible Kurikulum Merdeka Bahasa Indonesia competency for the declared fase/kelas ([S1]–[S3]); references a real elemen/sub-elemen where claimed.
- 0: contradicts or lies outside the curriculum for the declared grade, or claims a CP/KD that doesn't cover the content.
- 1: adjacent but loosely mapped (mapping plausible but not stated).
- 2: stated mapping (elemen + fase-appropriate) is accurate.
- 3: mapping is precise to a CP point and the item is grade-faithful in vocabulary and text complexity.
Notes: mapping is metadata authored by a content person; UKBI/TKA-labeled content must carry its own framework tag and is out of this bank's curriculum field.

### D13. Cultural / contextual appropriateness (HARD-FAIL for the trigger)
Judge: content is appropriate for Indonesian school audiences (SMP/SMA): no region/dialect bias, respectful treatment of diversity, no gratuitous sensitive material, appropriate for the platform's all-ages arena too.
- 0: biased, stereotyping, or content a school would not print (without an educational purpose).
- 1: mild risk (dated references, niche regional assumption).
- 2: appropriate and neutral-positive.
- 3: exemplary inclusion (models respectful pluralism).
Notes: human review; checklists per theme (e.g., berita themes use realistic but non-alarming news).

### D14. Bias / fairness (HARD-FAIL)
Judge: item functions equivalently across genders, regions, and backgrounds — no group is advantaged by identity rather than skill ([S7] fairness pillar).
- 0: requires out-of-school cultural knowledge; or gender/regional vocabulary gives an unfair edge; or stereotype-confirming framing.
- 1: mild risk (e.g., culturally specific names assumed known).
- 2: neutral with respect to group identity.
- 3: actively fair; alternatives/accessibility provided for any non-text feature.
Notes: human review (fairness is not code-decidable), per [S7].

### D15. Security / answer-leakage risk (HARD-FAIL; code: yes)
Judge: item does not leak its key to a test-wise student and its key/rationale never enters student payloads.
- 0: key-position pattern in a family; key text in stem (non-passage); internal fields (correctAnswer/explanation/rationale) reachable client-side.
- 1: risk via keyed-option length/grammar mismatch or predictable family patterns.
- 2: no leakage vectors; sanitizers in place.
- 3: robust (passage keyed items cannot leak by construction); leakage regression tests green.
Notes: the existing leakage test suites (`test-murid-quiz-leakage`, `test-ukbi-tka-bank-soal-leakage`, jalur/ajal leak tests) are part of this dimension's gate.

## 4.4 Gate classes and publish rule (conjunctive — S2)

| Gate class | Meaning | Rule |
|---|---|---|
| **HARD-FAIL** | Any 0 on the dimension (or a listed trigger) | Item is rejected; no arithmetic can override. Automatic where code exists; human-confirmed otherwise. |
| **SCORED** | Contributes to the publish decision | Must reach the minimum score. |

**Publish rule — CONJUNCTIVE (every clause must hold; mean is advisory, never sufficient):**

1. **STRUCTURAL VALID = PASS** — no stage-1/2 deterministic reject code (Validation Spec).
2. **No HARD-FAIL dimension scores < 2** and no hard-fail trigger fires (D1, D2, D5, D6, D7, D8, D11, D13, D14, D15).
3. **Every SCORED dimension ≥ 2** (D3, D4, D9, D10, D12).
4. **D10 has an explicit valid state** for the item's `assessment_purpose` (§4.9). A `CALIBRATION` tag never satisfies D10 — calibration evidence may *upgrade* D10 state only through the response-pattern tier (§4.8). **D10 is never calibration-exempt.**
5. **HUMAN REVIEW = APPROVED** — provenance `HUMAN_REVIEW`, reviewer + reviewed_at recorded; the semantic dimensions (D1, D2, D4, D5, D7, D8, D13, D14) are human-scored (auto-gates may reject, never approve).
6. **Purpose-specific gates pass** (§4.9) — e.g., DIAGNOSTIC/ADAPTIVE additionally require evidence-target review and the stated D10-state floor.
7. **Mean ≥ 2.0 is an advisory tier metric, not a publish condition** — used only to tag published quality (Gold ≥ 2.6 / Silver ≥ 2.3 / Bronze ≥ 2.0). A 14×3 + 1×1 item (the Phase 1B edge case) **cannot pass**: clause 3 fails on the 1, and clause 4 fails regardless of score because D10 has no valid state.

- **D3/D9 calibration allowance (narrow)**: D3 (cognitive demand) and D9 (difficulty integrity) accept a documented 1 **only when** the item is an explicit field-test item marked `CALIBRATION` **and** D10 ≥ 2 **and** D2 ≥ 2. No other dimension may be 1 at publish. This allowance never extends to D10.
- **MUST-HAVE-STATED-ROLE (folded into clause 4)**: an item cannot reach PUBLISH without its `evidence_target` and D10 role/state on record (ITEM DNA) — previously a separate gate class, now an explicit publish clause.
- **Human-review-required dimensions (cannot be auto-approved)**: D1 (factual truth), D2 (construct), D4 (stimulus), D5 (ambiguity), D7 (plausibility), D8 (language), D13, D14 — i.e., the *semantic* half. Auto-gates may *reject*; they may never *approve*. This encodes the audit's central lesson: taxonomy approval ≠ content approval.
- **Code-decidable today**: D6 (fully), D11 (mostly), D15 (mostly), D3/D9 metadata sanity (partially), D2's MISSING_CONTEXT heuristic, template detectors (D6/D7 overlap).
- **Why 0–3**: three usable points force a real choice and keep inter-rater variance manageable; 0/1 both block, 2 is "clean publish", 3 is "model for the bank" — a single four-point-plus scale invites 4–7 noise and false precision (reviewed in §4.5 below, re-evaluated from the audit's own 10-dimension 0–3 rubric, which we keep but extend to 15 with gate semantics).

## 4.5 Rationale log for deviations from the audit's rubric

The Phase 0 audit scored 10 dimensions on 0–3. This standard:
- **keeps** 0–3 and most audit dimensions (content correctness, single-best-answer integrity → split into D5/D6, stimulus quality, cognitive demand, language, distractor, difficulty, diagnostic value, curriculum, security);
- **adds** originality/duplicate risk (audit tracked it separately — promoted to a dimension), cultural appropriateness and bias/fairness as separate dimensions (per [S7] fairness pillar), and construct alignment (audit had "relevance of stimulus" — broadened);
- **replaces** a flat "quality profile" with **gate classes** so a high mean can never rescue a single hard failure (the audit's "technically valid but pedagogically bad" warning is now a rule);
- **requires a stated diagnostic role** (D10) because BahasaCerdas is a diagnostic product — an item without a role is out of scope by design.

## 4.6 Mapping to existing repo machinery

| This standard | Existing artifact |
|---|---|
| Hard-fail template/tautology rules | `bank-gate.ts` codes (`TEMPLATE_STEM`, `FILLER_DISTRACTORS`, `KEY_IN_STEM`, …) — extend, don't fork |
| D6/D7 structural checks | `diagnosticSafeIssues`, `content-validation.ts` (`EMPTY_OPTIONS`, `DUPLICATE_OPTION`, `ANSWER_LEAKAGE`) |
| Metadata approval semantics (§4.2-12) | `QuestionMetadata` `status`/`provenance` enum (APPROVED only after human content read) |
| Skills & subskills | `question-metadata/taxonomy.ts` (7 skills × subskills) |
| Cognitive targets | `AiCognitiveTarget` (diagnostic) / R1–R6 (audit scale) — adopt the repo's existing enum names, map R-labels in ITEM DNA |
| Delivery boundary | `question-bank/delivery-gate.ts` (allowlist + content gate) — standard feeds the allowlist |
| Answer-key validation | `validator.ts` R1–R16 (AI diagnostic) |
| Fairness/language | new human checklists (no code yet) |

## 4.7 Explicit non-goals

- This standard does **not** make MASTER_BANK items publishable retroactively (they remain quarantined until the human content-review phase re-approves them per this rubric).
- It does **not** claim parity with UKBI/SNPMB instruments; it borrows structure (seksi coverage, process levels) and is explicit about the borrowing ([S6], [S4]).
- It does **not** define per-theme item counts (audit §15 targets stand) — it defines per-item *admissibility*.

## 4.8 Misconception → evidence semantics (V7)

**Progression (author intent → validated signal):**

```text
AUTHOR INTENT
   ↓
MISCONCEPTION HYPOTHESIS     (misconception_target = hypothesis/intended signal, §DNA)
   ↓
DISTRACTOR DESIGN            (distractor_rationale = why this option is tempting under the hypothesis)
   ↓
STUDENT RESPONSE PATTERN     (response_pattern = observed empirical behavior: distractor selection rates)
   ↓
EMPIRICAL ANALYSIS           (error analysis, interviews, response-process check on a sample)
   ↓
VALIDATED MISCONCEPTION SIGNAL  (validated_misconception = empirically supported interpretation)
```

**Definitions (logical, not physical schema):**

| Term | Meaning | Status tier |
|---|---|---|
| `misconception_target` | the *intended* error hypothesis an item is designed to probe (author/design intent, may be per-distractor) | HYPOTHESIS |
| `distractor_rationale` | the design rationale: why the option is plausible *under the hypothesis* | HYPOTHESIS (authoring data) |
| `response_pattern` | observed empirical behavior — e.g., distractor B chosen by X% of low-ability respondents | OBSERVED PATTERN |
| `misconception_evidence` | the accumulated record (response pattern + error analysis + any interview/response-process data) | EVIDENCE RECORD |
| `validated_misconception` | an interpretation supported by the evidence record per the calibration rules (§4.9, Validation Spec §10) | VALIDATED |

**Rules:**
1. A distractor selection is **never by itself** evidence of a misconception. Prohibited framing: "distractor B = misconception X" / "siswa memilih B berarti mengalami kesalahan X".
2. Permitted framing until validated: "pemilihan B **konsisten dengan hipotesis** miskonsepsi X" / "B is *consistent with* misconception hypothesis X".
3. HYPOTHESIS tags may drive **item selection and design**, and (post-validation policy) a *hypothesis-labeled* learner message at most; they may **not** drive confident learner-model claims, remediation routing, or reporting that asserts the misconception as fact.
4. OBSERVED PATTERN alone (high selection rate of B) is correlational, not diagnostic: a plausible distractor is selected for many reasons. It upgrades to VALIDATED only with the empirical-analysis tier (error analysis/interview/response-process on a sample) per Validation Spec §10 LEVEL 1–2.
5. Only VALIDATED misconceptions may feed confident learner-facing messaging and adaptive misconception routing.

## 4.9 D10 states and publish rule by purpose (S2)

**D10 allowed states** (never satisfied by a `CALIBRATION` tag alone; calibration may *upgrade* state via §4.8 tiers):

| State | Meaning | Who sets it |
|---|---|---|
| `NOT_APPLICABLE` | item carries no diagnostic claim (pure drill item) — only permitted for PRACTICE, and even then `evidence_target` must be a real performance discriminator, not zero-evidence trivia | author + review |
| `HYPOTHESIS` | evidence_target + distractor misconception *hypotheses* stated and human-reviewed; no empirical support yet | human review |
| `REVIEWED` | HYPOTHESIS plus a documented evidence record (response patterns from the item's own live use or a representative sample), reviewed | human review over evidence record |
| `EMPIRICALLY_SUPPORTED` | misconception/evidence interpretation validated per §4.8 empirical-analysis tier; item discrimination empirically confirmed | calibration (Validation Spec §10) |

**Publish rule by purpose** (each purpose lists: hard-fail handling / human review / D10 treatment / calibration state / evidence requirement):

| Purpose | Hard-fail & scored rule | Human review | D10 minimum state | Calibration state | Evidence requirement |
|---|---|---|---|---|---|
| **PRACTICE** | §4.4 clauses 1–3 | semantic dims human-scored | `HYPOTHESIS` (or `NOT_APPLICABLE` for pure drill with a real discriminator) | LEVEL 0 accepted | evidence_target recorded; no learner-model claim |
| **ACHIEVEMENT (kuis/latihan guru)** | §4.4 clauses 1–3 | semantic dims human-scored | `HYPOTHESIS` | LEVEL 0 accepted | evidence_target recorded; scoring against rubric, no misconception claim |
| **DIAGNOSTIC** | §4.4 clauses 1–3 + evidence-target review | semantic dims human-scored + evidence-target review | `REVIEWED` minimum (item's own or pooled response pattern documented) | LEVEL ≥ 1 for difficulty/discrimination routing | misconception claims only as *hypotheses* (§4.8) unless state = `EMPIRICALLY_SUPPORTED` |
| **ADAPTIVE** | §4.4 clauses 1–3 + routing-semantics review | as DIAGNOSTIC | `EMPIRICALLY_SUPPORTED` for any distractor- or misconception-routed behavior; `REVIEWED` for skill×difficulty routing | LEVEL ≥ 1 (item- or bucket-calibrated) | state-backed semantics for every inference the engine makes from the response |

Notes: these are the *minimum* states at publish; state may only increase over an item's life (HYPOTHESIS → REVIEWED → EMPIRICALLY_SUPPORTED), never decrease without a re-review. Practice-to-assessment reuse is allowed (upward); assessment/diagnostic items may flow down to practice; practice → diagnostic reuse requires full re-gating at the DIAGNOSTIC bar (Blueprint §3 reuse rule).

## 4.10 Correction log (Phase 1A.2)

| Correction | Original problem | New rule | Reason | Source |
|---|---|---|---|---|
| V7 | D7/D10/DNA treated distractor selection as misconception evidence ("misconception-attribution in diagnostic engine"); DNA called `misconception_target` "the predictable error the item is built to expose" | Distractor→misconception is a **hypothesis** until empirically validated; HYPOTHESIS / OBSERVED PATTERN / VALIDATED tiers; learner messaging bounded (§4.8); D7/D10 wording revised | A wrong distractor choice is correlational; treating it as a validated misconception overclaims diagnostic evidence | Phase 1B verification, finding V7-CRITICAL |
| S2 | Publish rule allowed a 14×3 + 1×1 item (D10 = 1) to pass under the `CALIBRATION` allowance (mean ≥ 2.0 + "no dimension < 2 except CALIBRATION D3/D9/D10") | **Conjunctive publish**: structural + no hard-fail < 2 + all scored ≥ 2 + D10 explicit valid state + human APPROVED + purpose gates; D10 **never** calibration-exempt; mean is advisory (tiers); MUST-HAVE-STATED-ROLE folded into clause 4 (§4.4, §4.9) | The calibration escape hatch on D10 recreates the "diagnostic bank of low-D10 items" failure | Phase 1B verification, finding S2-CRITICAL; scoring edge-case analysis §9 |
