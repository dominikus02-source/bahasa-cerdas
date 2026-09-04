# P2.1 — Teks Berita Pilot V1 Human Review Report

**Mode**: STRUCTURED REVIEW GATE (read-only) · **Reviewer**: structured AI-assisted review — **no human founder/reviewer approval claimed**
**Date**: 2026-09-04 · **Subject**: `docs/question-bank-pilot/TEKS_BERITA_PILOT_V1.md` (12 items, 5 stimuli)
**Scope lock honored**: 0 DB writes · 0 question generation · 0 bank edits · 0 schema changes · 0 production code changes · 0 allowlist population · pilot artifact **not modified**

---

## 1. Executive Verdict

| Dimension | Verdict |
|---|---|
| **Pilot status** | **REVISE_PILOT** — 9/12 items pass this structured review as-is; **3 items require revision** (TB-010 has a publish-blocking clarity defect, TB-003 and TB-008 need quality revisions). The pilot's own claim of "0 rejects / no item fails a quality gate" (§11-3) is **not sustained**: TB-010 scores D5 = 1 (clarity) and D4 = 1 (stimulus) on hard-fail dimensions. |
| **Human review status** | **NOT_COMPLETED** — no qualified Indonesian assessment/content expert has read these items; `HUMAN_APPROVED` is claimed nowhere. This report is a structured pre-review, not the human gate. |
| **F1 status** | **OPEN_FOUNDER_DECISION** — no explicit founder decision on Blueprint §7.3 vs §7.4 exists anywhere in the repository (verified: `FOUNDER_DECISION_LAYER_SEPTEMBER_2026.md`, `PHASE_1E_FOUNDER_DECISION_GATE.md`, Verification §16 contain no F1-for-Blueprint-§7 decision). The pilot's §2.1 choice (archetype list binding) is an *authorial* decision, not a founder decision. |
| **Systemic defect status** | **Content: FALSE** (largest content-failure class = TB-010 alone, 8%, well under 25%). **Metadata/taxonomy: TRUE** — cognitive labels on 5/12 items (42%) depend on the unresolved F1 conflict plus a second cross-doc inconsistency (DNA §5 vs Blueprint §7.3 R-mapping); the kosakata subskill mapping (TB-004) contradicts the canonical taxonomy; artifact conventions are systemic (key positions 12/12 at index 0; stale word-count headers 5/5). |
| **Overall recommendation** | **B. REVISE_PILOT** — apply the 3 item revisions + artifact hygiene below, re-run this structured review, then and only then proceed to founder/human review. The foundation is sound; this review found no item whose core construct is unsalvageable and no REJECT. |

**One-sentence verdict**: the foundation (Blueprint + DNA + Quality Standard + Validation Spec) demonstrably produced 12 non-template, stimulus-based, single-best-answer items — better than anything in the 1,500-item MASTER_BANK — but the authoring pass over-scored itself (missed TB-010's non-existent paragraph referent) and the cognitive/metadata layer is not yet internally consistent (F1 + DNA§5-vs-BP§7.3 + taxonomy alignment).

---

## 2. Scope & Evidence

**Items reviewed**: all 12 — TB-001…TB-012 (`BC-TEKS-BERITA-0001…0012`), 5 stimuli (STIM-01…05).

**Documents used** (all read in full or at governing sections):
- `QUESTION_BANK_QUALITY_STANDARD.md` (§4.1–§4.10: 15 dimensions, gate classes, conjunctive S2 rule, V7 semantics, D10 states)
- `QUESTION_ITEM_DNA.md` (§1–§7: field contract, authoring-vs-delivery separation, V7 semantics)
- `QUESTION_VALIDATION_SPEC.md` (stages 1–11, LEVEL 0–3, reason codes)
- `QUESTION_BANK_50_THEME_BLUEPRINT.md` (§7 pilot contract; §2 allocation; §9 master table)
- `QUESTION_BANK_FOUNDATION_VERIFICATION.md` (§10 LEVEL framework; §16 CONDITIONAL-GO record)
- `QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md` (historical evidence only)
- `lib/question-metadata/taxonomy.ts` (canonical skill/subskill list — checked, not assumed)

**Validator/tests executed (read-only)**:
| Command | Result |
|---|---|
| `npx tsx` throwaway script re-running the **production bank-gate** (`lib/diagnostic-ai/bank-gate.ts`, pure function) on all 12 pilot items + 2 broken controls | ✅ 12/12 SAFE (empty reasons); controls rejected `TEMPLATE_STEM`+`FILLER_DISTRACTORS`+`KEY_IN_STEM` and `KEY_OUT_OF_RANGE` — gate confirmed non-vacuous. Throwaway script deleted after run; tree unchanged. |
| `npx tsc --noEmit` | ✅ 0 errors, exit 0 |
| Leakage suites (`test-murid-quiz-leakage` etc.) | **Not applicable** — the pilot is delivered nowhere (no Soal row, no bank, no API); the §9 student-delivery view is conceptual. Flagged as a limitation, not run. |

**Limitations**: (1) no human reviewer — every "PASS" below is a structured-review verdict, not `HUMAN_APPROVED`; (2) no response data — difficulty and D10 remain LEVEL 0 / HYPOTHESIS; (3) Indonesian linguistic quality (D8) was assessed by AI-assisted review, not by a native-content expert — flagged per item where any doubt exists; (4) factual-content correctness of the fictional stimuli (D1) verified only for internal consistency (dates/numbers), not by a human.

---

## 3. Founder Decision F1

**The exact conflict** (located, not assumed):
- **Blueprint §7.3** (cognitive architecture): "R2 ~25% (eksplisit/lead) · R3 ~25% (struktur, kosakata-dalam-konteks) · R4 ~35% (gagasan, inferensi, fakta/opini halus) · R5 ~15% (evaluasi dukungan klaim)" → for 12 items: R2=3, R3=3, R4=4, R5=2.
- **Blueprint §7.4** (archetype architecture): 2× eksplisit · 2× gagasan utama/lead **(R3)** · 2× inferensi dua-bukti · 2× fakta/opini · 2× struktur (headline–lead–body) · 1× kosakata-dalam-konteks · 1× klaim tidak didukung **(R5)** → with §7.4's own labels: R2=2, R3=5, R4=4, R5=1.
- **Why they cannot both hold**: (a) §7.4 labels gagasan utama/lead R3 while §7.3 places "gagasan" in R4; (b) the archetype list forces 5 items into R3 (2 gagasan + 2 struktur + 1 kosakata) vs §7.3's 3; (c) R2 and R5 end 1 short each.
- **Compounding cross-doc inconsistency found by this review** (new, beyond the pilot's own F1 note): **DNA §5** — which declares itself "single source of truth for the bank" — maps **struktur → R4** and **fakta-opini → R5** and **gagasan utama (literal) → R2**, all contradicting Blueprint §7.3's cells (struktur=R3, fakta/opini halus=R4, gagasan=R4). So there are effectively **three** incompatible readings: §7.3 %, §7.4 archetypes, and DNA §5.

**Evidence of no stored decision**: `grep F1` across the repo returns only the Verification doc's **different** F1 (an R1–R6 internal-scale note, §67) and the pilot's own authorial choice. `FOUNDER_DECISION_LAYER_SEPTEMBER_2026.md` and `PHASE_1E_FOUNDER_DECISION_GATE.md` contain no decision on Blueprint §7.3/§7.4.

**F1_STATUS: OPEN_FOUNDER_DECISION** (distribution verdicts in §4 are marked CONDITIONAL accordingly).

**Recommended interpretation** (most coherent with Quality Standard §4.3-D3, Item DNA §5, Validation Spec stage 8, and the blueprint's own claim that "R4 carries the diagnostic signal"):
1. **Keep §7.4's archetype list as the binding item architecture** — it is concrete, satisfiable (proven: the pilot hit it exactly), and matches the §7.1 construct.
2. **Adopt DNA §5 as the single canonical R-mapping** (it already self-declares single source of truth): gagasan literal/lead = R2; kosakata-dalam-konteks = R3; struktur = R4; inferensi dua-bukti = R4; fakta/opini = R5; evaluasi klaim = R5.
3. **One-line fix to Blueprint §7.3** so it agrees with DNA §5: "R2 = eksplisit + gagasan lead · R3 = kosakata-dalam-konteks · R4 = struktur + inferensi · R5 = fakta/opini + evaluasi klaim."
4. Under this reading the 12-item pilot distributes **R2=4, R3=1, R4=4, R5=3** (33/8/33/25%) — R4+R5 = 58% carrying the diagnostic signal, consistent with the blueprint's stated intent.
- This does **not** close F1; it is the review's recommendation for the founder.

---

## 4. Item-by-Item Review

*Common facts (all 12): theme Teks Berita · Fase D (SMP VIII) · PILIHAN_GANDA 4-opsi · assessment_purpose DIAGNOSTIC · source MANUAL/AI_ASSISTED-draft · provenance human PENDING · D10 state **HYPOTHESIS** · difficulty evidence **LEVEL 0** · review_status PENDING_HUMAN_REVIEW · stimulus_type PASSAGE · curriculum Fase D elemen Membaca (CP-point attestation deferred to content expert, correctly).*

---

### ITEM TB-001 — `BC-TEKS-BERITA-0001` (5W+1H eksplisit, STIM-01)

- **Construct**: READING / READING_INFORMASI_TERSURAT · R2 · EASY · evidence = explicit-date retrieval.
- **Stimulus Review — PASS.** STIM-01 is self-contained, grade-fit, fictional, time-independent; internal date consistency verified (3 Maret 2025 was a Monday). No filler.
- **Construct Review — PASS.** The task genuinely requires locating the explicit date in the lead; not answerable from general knowledge (distractor dates are all wrong for the text).
- **Stem Review — PASS.** "Kapan … diresmikan?" — singular, unambiguous, natural.
- **Answer Key Review — PASS.** "Senin, 3 Maret 2025" is the only option consistent with the text; B month-swap, C wrong date, D day-swap. Uniquely correct.
- **Distractor Review — PASS with note (D7=2).** B (month swap) and D (day swap) are plausible scanning errors. **C's rationale is mis-stated**: the pilot claims C "mengambil tanggal dari stimulus berbeda (STIM-03)" — but in single-testlet delivery a student sees only STIM-01, so the "mencampur isi dua berita" hypothesis cannot operate. The distractor still functions as an arbitrary wrong date; the *rationale* must be rewritten (e.g., "weekend-date association with school events").
- **Cognitive Review — MATCH PASS.** Claimed R2 = observed R2 (locate explicit info). Clean.
- **Diagnostic Value — MEDIUM.** Wrong answers indicate scanning/attention error — a weak but real retrieval signal (blueprint's accessibility role). D10 = 2.
- **Language Review — PASS.** Natural standard Indonesian.
- **Provenance — PASS.** Fictional stimulus, `fictional: true`, no real claims; PROVENANCE adequate.
- **Duplication — PASS.** Pair with TB-006 (same archetype) differs in stimulus, question ("kapan" vs "siapa"), and key logic — legitimate.
- **15-Dimension Rubric** (independent scores; vs pilot's authoring scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 Content correctness | 3 (3) | date/facts all verifiable in text | HARD |
| D2 Construct alignment | 3 (3) | true explicit retrieval | HARD |
| D3 Cognitive demand | 2 (3) | R2 matches target; not exemplary | SCORED |
| D4 Stimulus quality | 2 (2) | adequate, self-contained | SCORED |
| D5 Question clarity | 3 (3) | unambiguous | HARD |
| D6 Answer-key validity | 3 (3) | uniquely correct | HARD |
| D7 Distractor quality | 2 (2) | C rationale mis-stated (hypothesis non-operable in single-testlet) | HARD |
| D8 Language quality | 3 (3) | natural | HARD |
| D9 Difficulty integrity | 2 (2) | EASY consistent; LEVEL 0 only | SCORED |
| D10 Diagnostic value | 2 (2) | retrieval signal; state HYPOTHESIS | SCORED |
| D11 Originality | 3 (3) | fresh cell | HARD |
| D12 Curriculum alignment | 2 (2) | elemen-level; CP attestation pending | SCORED |
| D13 Cultural appropriateness | 3 (3) | neutral-positive | HARD |
| D14 Bias/fairness | 3 (3) | neutral | HARD |
| D15 Security/leakage | 2 (3) | no leak vectors; **but key at index 0 like all 12** (artifact pattern; delivery-shuffle promise unproven) | HARD |

Mean **2.53** (author 2.8) · hard-fail <2: none · mandatory: none · publish gate: **BLOCKED (D10=HYPOTHESIS, human PENDING)** — correct per S2.

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None. (Note: rewrite distractor-C rationale; key-position convention handled at artifact level, §7.)

---

### ITEM TB-002 — `BC-TEKS-BERITA-0002` (gagasan utama/lead, STIM-01)

- **Construct**: READING / READING_IDE_POKOK · R3 (label per §7.4; **F1-conditional**) · MEDIUM · evidence = lead-vs-detail discrimination.
- **Stimulus Review — PASS.** Same stimulus, sufficient.
- **Construct Review — PASS.** Distinguishing the lead + stated purpose from supporting details is genuine main-idea reading, not recall.
- **Stem Review — PASS.** "Pernyataan berikut yang paling tepat sebagai gagasan utama berita tersebut adalah …" — clear; the "paling tepat" qualifier correctly signals best-answer selection.
- **Answer Key Review — PASS.** Key (peresmian + tujuan) is the strongest summary; B (1.500 judul), C (perwakilan dinas), D (evaluasi) are true-but-supporting details. Uniquely defensible.
- **Distractor Review — PASS (D7=3).** B tests numeric-salience bias, C tests surface ceremonial reading, D tests "last sentence = conclusion" misreading — all plausible, all wrong, each with a distinct hypothesis.
- **Cognitive Review — MATCH CONDITIONAL.** Claimed R3 per §7.4; observed operation = locate lead + weigh against detail = R2/R3 boundary (DNA §5 places gagasan literal at R2). Label integrity depends on F1; item content unaffected.
- **Diagnostic Value — HIGH.** Main-idea-vs-detail is a core reading skill with real learner-model value. D10 = 2.
- **Language Review — PASS.** Natural.
- **Provenance — PASS.**
- **Duplication — PASS.** TB-010 (same archetype) uses a different stimulus and paragraph-level task.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct, verifiable | HARD |
| D2 | 3 (3) | true ide-pokok task | HARD |
| D3 | 2 (2) | label F1-conditional; operation R2/R3 | SCORED |
| D4 | 2 (2) | adequate | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 3 (2) | three distinct, plausible hypotheses | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | MEDIUM consistent | SCORED |
| D10 | 2 (2) | HIGH value; HYPOTHESIS state | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 artifact pattern | HARD |

Mean **2.60** (author 2.7) · publish gate: **BLOCKED (D10=HYPOTHESIS, human PENDING)** — correct.

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None (cognitive label to be finalized on F1 resolution).

---

### ITEM TB-003 — `BC-TEKS-BERITA-0003` (fakta/opini langsung, STIM-02)

- **Construct**: READING / READING_INFERENSI *(fakta/opini — taxonomy gap, mapped with flag)* · R4 (label per §7.3; DNA §5 would put fakta/opini at R5) · MEDIUM · evidence = fact/opinion discrimination.
- **Stimulus Review — PASS.** STIM-02 sufficient and self-contained.
- **Construct Review — PASS.** The task genuinely requires text-verifiability judgment.
- **Stem Review — PASS.** Clear, singular.
- **Answer Key Review — REVISE (precision).** The key states "Pemerintah Desa Sukamaju menyediakan 500 buku bacaan…" but the text says **"Gerakan ini menyediakan 500 buku bacaan"** (the *gerakan* provides them; the government only *launched* the gerakan). The key is a defensible paraphrase (government runs the gerakan) but is **not verbatim-supported** — and for a fact/opinion item whose entire point is verifiability, the subject shift invites a legitimate challenge and weakens D1. **Fix (one line)**: key → "Gerakan 'Sukamaju Membaca' menyediakan 500 buku bacaan di pos ronda dan balai desa." (verbatim-supported).
- **Distractor Review — PASS (D7=3).** B future-prediction ("akan"), C superlative ("terbaik" without text basis), D normative advice ("sebaiknya") — three distinct opinion types with distinct hypotheses (positive-tone=fact; superlative=fact; moral-right=fact).
- **Cognitive Review — MATCH CONDITIONAL.** Claimed R4 per §7.3; DNA §5 maps fakta/opini to R5. Operation = classify verifiable vs evaluative = R4/R5 boundary. Label depends on F1/DNA resolution; content unaffected.
- **Diagnostic Value — HIGH.** Fact/opinion is a high-value news skill; wrong answers discriminate the "moral/predictive judgment substituting for verifiability" pattern. D10 = 2.
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** TB-009 is the deliberate subtle counterpart (documented; different difficulty cell) — legitimate construct variation.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 Content correctness | **2 (3)** | correct but imprecise: key subject shifted from gerakan → government | HARD |
| D2 Construct alignment | 3 (3) | true fact/opinion task | HARD |
| D3 Cognitive demand | 2 (2) | R4/R5 boundary; F1-dependent | SCORED |
| D4 Stimulus quality | 2 (2) | adequate | SCORED |
| D5 Question clarity | 3 (3) | clear | HARD |
| D6 Answer-key validity | 3 (3) | uniquely correct (as paraphrase) | HARD |
| D7 Distractor quality | 3 (3) | three distinct opinion-type hypotheses | HARD |
| D8 Language quality | 3 (3) | natural | HARD |
| D9 Difficulty integrity | 2 (2) | MEDIUM consistent | SCORED |
| D10 Diagnostic value | 2 (2) | HIGH value; HYPOTHESIS | SCORED |
| D11 Originality | 3 (3) | fresh | HARD |
| D12 Curriculum alignment | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.53** (author 2.7) · no hard-fail trigger (D1 = 2, not < 2) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT **REVISE** (key wording) · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: REVISE**
**Required revision**: reword the key to mirror the text's subject ("Gerakan 'Sukamaju Membaca' menyediakan 500 buku bacaan di pos ronda dan balai desa"), then re-verify D1.

---

### ITEM TB-004 — `BC-TEKS-BERITA-0004` (kosakata dalam konteks, STIM-02)

- **Construct**: READING (makna kata dalam konteks) · **subskill mapping defect (see below)** · R3 · MEDIUM · evidence = context-driven meaning.
- **Stimulus Review — PASS.** Short context sentence supplied; construct is meaning-in-context so the minimal stimulus is appropriate.
- **Construct Review — PASS with note.** The item is a genuine vocabulary-in-context task; but the key "menyampaikan keluhan tentang sesuatu" reuses the root word (**mengeluhkan → keluhan**), so a student can answer via morphological recognition without deep context processing. This blurs the construct toward lexical recognition (R2) rather than context application (R3). Not the banned template tautology (that is "contoh X → option X"); acceptable for a vocab item, but slightly weaker than claimed.
- **Stem Review — PASS.** Clear, quotes the target sentence.
- **Answer Key Review — PASS.** "menyampaikan keluhan" is the correct meaning; context sentence + following sentence (harapan bantuan) disambiguate.
- **Distractor Review — PASS (D7=2).** B is a good context-bleed distractor (merges meaning with the consequence sentence); C/D are weaker form-guessing distractors but on-topic and wrong.
- **Cognitive Review — MATCH CONDITIONAL.** Claimed R3; observed operation closer to R2 (root-word recognition) for the key path. The strongest defense (a paraphrase avoiding the root) would lift the item to genuine R3.
- **Diagnostic Value — MEDIUM.** Word-in-context evidence for READING is real but weaker than comprehension items; blueprint assigns kosakata a supporting role. D10 = 2.
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** Only L-archetype item in the set.
- **Subskill mapping finding (metadata, NOT item content):** the pilot maps this item to `READING_INFERENSI` following Blueprint §7.2's 4-subskill list — but the **canonical taxonomy (`lib/question-metadata/taxonomy.ts`) has 5 READING subskills including `READING_MAKNA_KATA` ("Makna Kata dalam Bacaan")**. The correct mapping already exists and costs nothing: **TB-004 → READING_MAKNA_KATA**. Blueprint §7.2's list is stale (omits READING_MAKNA_KATA); the pilot §2 contract repeated the stale list. This is not a taxonomy *gap* — the gap claim applies only to fakta/opini and claim-support (§9).
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | meaning correct | HARD |
| D2 Construct alignment | **2 (2)** | partially blurs toward morphology (key reuses root) | HARD |
| D3 Cognitive demand | 2 (2) | R3 claim vs R2-ish key path | SCORED |
| D4 Stimulus quality | 2 (2) | short-context appropriate | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | correct meaning | HARD |
| D7 | 2 (2) | B strong; C/D weak but wrong | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | MEDIUM consistent | SCORED |
| D10 | 2 (2) | supporting role | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.47** (author 2.7) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None for item content. (Metadata: remap subskill to `READING_MAKNA_KATA`; optional improvement: paraphrase the key without the root word to sharpen R3 context-dependence.)

---

### ITEM TB-005 — `BC-TEKS-BERITA-0005` (inferensi dua-bukti, STIM-03)

- **Construct**: READING / READING_INFERENSI · R4 · HARD · evidence = two-evidence integration.
- **Stimulus Review — PASS.** STIM-03 carries exactly the two evidence points needed.
- **Construct Review — PASS.** The key is supported by two distinct actions (planting + cleaning); genuine inference with textual grounding.
- **Stem Review — PASS.** Clear; the date anchor is harmless.
- **Answer Key Review — PASS.** "peduli terhadap kelestarian lingkungan di sekitar sekolah" follows from both actions; B contradicts ("bagian dari program Adiwiyata" ≠ "mengganti program"), D contradicts (they cleaned, not refused), C is unsupported. Uniquely defensible.
- **Distractor Review — PASS (D7=3).** B = negation-of-program misreading; C = stereotype/outside-knowledge substitution; D = action-reversal from careless reading. Distinct, plausible, all wrong.
- **Cognitive Review — MATCH PASS.** Claimed R4 = observed R4 (integrate two evidences, reject contradiction and overclaim). One of the cleanest items in the set.
- **Diagnostic Value — HIGH.** Two-evidence inference is a strong learner-model signal. D10 = 2.
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** TB-011 shares the archetype with different stimulus/data.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 | 3 (3) | tight alignment | HARD |
| D3 | 3 (3) | strongest distractor demands rejecting contradiction | SCORED |
| D4 | **2 (3)** | adequate; supports 2 items (2 is the right score) | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 3 (3) | three distinct hypotheses | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | HARD consistent | SCORED |
| D10 | 2 (2) | HIGH value; HYPOTHESIS | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.67** (author 2.9) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None.

---

### ITEM TB-006 — `BC-TEKS-BERITA-0006` (5W+1H eksplisit, STIM-04)

- **Construct**: READING / READING_INFORMASI_TERSURAT · R2 · EASY · evidence = explicit retrieval.
- **Stimulus Review — PASS.**
- **Construct Review — PASS.** Requires locating the quoted "sebagian besar pengunjung adalah pelajar sekolah dasar"; not answerable from general knowledge.
- **Stem Review — PASS.** "Menurut teks, siapakah pengunjung terbanyak …?" — clear; "terbanyak" correctly maps to "sebagian besar".
- **Answer Key Review — PASS.** Uniquely correct.
- **Distractor Review — PASS (D7=2).** B/C/D are all plausible outside-knowledge substitutions, but they share **one** hypothesis (stereotype substitution) rather than three distinct error hypotheses — acceptable for an R2 accessibility item, weaker than the R4 items.
- **Cognitive Review — MATCH PASS.** R2 = R2.
- **Diagnostic Value — LOW-MEDIUM.** Pure retrieval; serves the blueprint's accessibility role. D10 = 2 (role-honest).
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** TB-001 same archetype, different stimulus/query.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 | 3 (3) | true retrieval | HARD |
| D3 | 2 (3) | R2 matches target | SCORED |
| D4 | 2 (2) | adequate | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 2 (2) | single shared hypothesis | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | EASY consistent | SCORED |
| D10 | 2 (2) | accessibility role | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.53** (author 2.8) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None.

---

### ITEM TB-007 — `BC-TEKS-BERITA-0007` (struktur: headline–lead, STIM-02)

- **Construct**: READING / READING_STRUKTUR_TEKS · R3 (per §7.3; DNA §5 maps struktur to R4 — **F1-adjacent**) · MEDIUM · evidence = headline↔lead mapping.
- **Stimulus Review — PASS.**
- **Construct Review — PASS.** Selecting a headline that matches the lead requires genre-structure awareness, not current-affairs knowledge.
- **Stem Review — PASS.** Clear.
- **Answer Key Review — PASS.** Key mirrors the lead exactly; B and C contradict the text (minat meningkat, not menurun/ditutup); D is wish-as-fact (bantuan belum tiba). Uniquely correct.
- **Distractor Review — PASS (D7=3).** B/C = sensational/contradictory-headline bias; D = "harapan dibaca sebagai kejadian" (wish-as-fact, one of the blueprint's misconception model entries). Distinct hypotheses.
- **Cognitive Review — MATCH CONDITIONAL.** Claimed R3 (apply headline conventions); DNA §5 would place struktur at R4. Operation = map lead to genre convention = R3 defensible; label depends on the F1/DNA resolution.
- **Diagnostic Value — HIGH.** Structure awareness is a distinct, valuable signal. D10 = 2.
- **Language Review — PASS.** Headline style "Luncurkan" (me- dropped) is standard Indonesian headline convention.
- **Provenance — PASS.**
- **Duplication — PASS.** TB-008 shares the H-archetype but tests a different structural function (lead identification vs headline mapping).
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 | 3 (3) | true structure task | HARD |
| D3 | 2 (2) | R3 vs DNA §5 R4; F1-dependent | SCORED |
| D4 | 2 (2) | adequate | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 3 (2) | three distinct hypotheses incl. wish-as-fact | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | MEDIUM consistent | SCORED |
| D10 | 2 (2) | HIGH value; HYPOTHESIS | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.60** (author 2.7) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None (cognitive label finalized with F1/DNA resolution).

---

### ITEM TB-008 — `BC-TEKS-BERITA-0008` (struktur: fungsi lead, STIM-04)

- **Construct**: READING / READING_STRUKTUR_TEKS · R3 (claimed) · EASY *(F2 deviation: §7.6 puts "struktur" at Medium)* · evidence = lead-function identification.
- **Stimulus Review — PASS.** Sentence 1 of STIM-04 is a genuine lead.
- **Construct Review — REVISE.** The item is *almost* a terminology test: the correct option ("lead yang memuat informasi pokok berita") and the three wrong options ("tubuh berita", "penutup", "judul") require the student to know structural terms. Blueprint §7.1 explicitly says the construct is **not** "journalism vocabulary". The key's gloss ("yang memuat informasi pokok berita") rescues answerability for students who know structure without the word "lead", but the framing still risks vocabulary dependence. D2 = 2 (borderline, not failing).
- **Stem Review — PASS.** "Berdasarkan struktur teks berita, kalimat pertama … berfungsi sebagai …" — clear (the referent "kalimat pertama" exists, unlike TB-010).
- **Answer Key Review — PASS.** First sentence = lead; B/C/D wrong.
- **Distractor Review — REVISE (D7=2).** B (lead-vs-body confusion) is a good distractor; **D ("judul yang menarik minat pembaca") is too obviously wrong** — no student will believe the first sentence of a text is its title; **C's rationale is contrived** ("kalimat terakhir = kesimpulan dibalik menjadi kalimat pertama = kesimpulan" — the reverse pattern is not a documented error). Two of three distractors carry the item; D should be replaced with a detail-function distractor (e.g., "tubuh berita pada bagian tengah" or a lead-vs-ringkasan confusion).
- **Cognitive Review — MATCH REVISE.** Claimed R3; the pilot itself concedes the task "hampir retrieval" (the basis of F2). Observed operation = recognize the first sentence's function ≈ **R2**, not R3. Either accept R2 (and resolve F2 formally) or strengthen the item (e.g., ask about a later sentence where lead-vs-body discrimination is subtler).
- **Diagnostic Value — MEDIUM.** Structure awareness signal, but the near-retrieval task and terminology framing weaken the learner-model update. D10 = 2.
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** H-archetype pair with TB-007, different function.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 Construct alignment | **2 (2)** | borderline journalism-terminology dependence | HARD |
| D3 Cognitive demand | **2 (2)** | claimed R3, observed ≈R2 (self-admitted in F2) | SCORED |
| D4 Stimulus quality | 2 (2) | adequate | SCORED |
| D5 Question clarity | **2 (3)** | clear, but terminology load blurs the task for non-initiated students | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 Distractor quality | **2 (2)** | D obviously wrong; C rationale contrived | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 Difficulty integrity | 2 (2) | EASY defensible but deviates from §7.6 (F2 pending) | SCORED |
| D10 | 2 (2) | MEDIUM value; HYPOTHESIS | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.40** (author 2.7) · no hard-fail trigger (all hard-fail ≥ 2) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT PASS · PEDAGOGY **REVISE** · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: REVISE**
**Required revision**: (a) resolve the cognitive cell — either accept R2/EASY (formalize F2) or strengthen the task to genuine structure application; (b) replace distractor D with a plausible detail-function distractor; (c) rewrite distractor-C rationale; (d) ensure option A's gloss carries the task for students unfamiliar with "lead" (keep the "memuat informasi pokok berita" qualifier).

---

### ITEM TB-009 — `BC-TEKS-BERITA-0009` (fakta/opini halus, STIM-04)

- **Construct**: READING / READING_INFERENSI *(fakta/opini — gap flag)* · R4 (per §7.3; DNA §5 → R5) · HARD · evidence = evaluative-claim identification despite quoted framing.
- **Stimulus Review — PASS.**
- **Construct Review — PASS.** The item tests the exact blueprint misconception pair in reverse: "a quoted source makes a claim true" and "opinion only when signposted 'menurut'" both fail here (the opinion IS quoted and signposted). Genuinely diagnostic.
- **Stem Review — PASS.** "Pernyataan berikut yang merupakan opini Ibu Lestari dalam teks tersebut adalah …" — clear; the attribution is explicit in the text.
- **Answer Key Review — PASS.** "sangat membantu" is Ibu Lestari's evaluation; B/C/D are verifiable facts. Uniquely correct; the twist (opinion behind "menurut") is the item's strength, not a defect.
- **Distractor Review — PASS (D7=3).** B/C/D are true-but-fact options that punish the "terlihat benar/ada di teks" heuristic; D specifically tests the "angka = fakta" bias. Distinct, deliberate, effective.
- **Cognitive Review — MATCH CONDITIONAL.** Claimed R4 per §7.3; DNA §5 maps fakta/opini to R5. Operation = evaluative-vs-factual classification = R4/R5 boundary; content strong under either label.
- **Diagnostic Value — HIGH (best in set).** Wrong answers (choosing the quoted fact) directly corroborate two named misconception hypotheses; the evidence cell is exemplary. D10 = **3** — with state still **HYPOTHESIS** (score and state are distinct; G3 convention gap — see §7).
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** TB-003 is the deliberate direct counterpart (different difficulty cell) — documented, legitimate.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 | 3 (3) | tight | HARD |
| D3 | 3 (3) | strongest distractor demands rejecting the quoted-fact trap | SCORED |
| D4 | 2 (3) | adequate (supports 2 items) | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 3 (3) | fact-options as deliberate traps | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | HARD consistent | SCORED |
| D10 | **3 (3)** | exemplary evidence cell; state HYPOTHESIS | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.73** (author 3.0) · publish gate: **BLOCKED** (D10 state HYPOTHESIS < REVIEWED for DIAGNOSTIC — correct per §4.9).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None.

---

### ITEM TB-010 — `BC-TEKS-BERITA-0010` (gagasan utama paragraf 2, STIM-05)

- **Construct**: READING / READING_IDE_POKOK · R3 (label per §7.4; DNA §5 → R2 for literal gagasan) · MEDIUM · evidence = paragraph main-idea.
- **Stimulus Review — FAIL (as delivered).** **STIM-05 renders as a single paragraph** (verified in the artifact), but the stem asks about "paragraf kedua". **There is no paragraph 2 in the delivered stimulus** — the referent does not exist. The item logic only works if the authoring intent (S1 = para 1; S2–S3 = para 2; S4 = para 3) is restored as actual paragraph breaks. This is the most serious defect in the set: **a student cannot reliably identify which sentences the item means**. D4 = 1.
- **Construct Review — PASS (conditional on the fix).** Once paragraphing is restored, distinguishing the paragraph's main idea from its first-sentence detail is a genuine ide-pokok task.
- **Stem Review — FAIL.** "Gagasan utama **paragraf kedua** pada teks di atas …" — the unit it references does not exist in the rendered text. D5 = 1.
- **Answer Key Review — PASS-with-note (D6=2).** Given restored paragraphing, the key (sales → books for students) is the paragraph's main idea; B = first sentence of the same paragraph (detail); C = para-1 idea; D = para-3 idea. Defensible — with a note that para 2 contains a coordinate second idea (weekly collection), so the "main idea" is a judgment call; the key is the better summary.
- **Distractor Review — PASS (D7=2).** B tests "first sentence of paragraph = main idea" heuristic; C/D test paragraph-location verification. Fine once the referent is fixed.
- **Cognitive Review — MATCH CONDITIONAL.** Label depends on F1 (R2 per DNA §5 for literal gagasan; R3 per §7.4).
- **Diagnostic Value — MEDIUM.** Paragraph main-idea is a useful signal, currently masked by the referent defect. D10 = 2.
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** TB-002 same archetype, different stimulus/level.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | facts correct | HARD |
| D2 Construct alignment | **2 (3)** | construct sound; referent defect muddies it as delivered | HARD |
| D3 | 2 (2) | F1-dependent | SCORED |
| D4 Stimulus quality | **1 (2)** | **stimulus internally inconsistent with the item's referent — paragraph 2 absent** | SCORED |
| D5 Question clarity | **1 (2)** | **stem references a non-existent structural unit** | **HARD** |
| D6 Answer-key validity | **2 (3)** | defensible once paragraphing restored; coordinate-idea subtlety | HARD |
| D7 | 2 (2) | fine once referent fixed | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | MEDIUM consistent | SCORED |
| D10 | 2 (2) | signal masked by defect | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.20** (author 2.7) · **HARD-FAIL TRIGGER: D5 = 1 < 2** — the conjunctive publish rule (clause 2) is violated; this item **cannot pass publish in any state until revised**. (This directly contradicts the pilot's §11-3 claim "none < 2".)

**Verdict**: CONTENT **REVISE** · PEDAGOGY **REVISE** · DIAGNOSTIC_VALUE PASS (concept) · **ITEM_VERDICT: REVISE**
**Required revision**: restore paragraph breaks in STIM-05 (S1 / S2–S3 / S4 / S5) **or** reword the stem to a sentence reference ("Kalimat ketiga …" / "Pernyataan yang paling tepat sebagai gagasan utama bagian yang memuat hasil penjualan …"); then re-verify key/option mapping and re-run D4/D5/D6.

---

### ITEM TB-011 — `BC-TEKS-BERITA-0011` (inferensi data, STIM-05)

- **Construct**: READING / READING_INFERENSI · R4 · HARD · evidence = supported-conclusion selection.
- **Stimulus Review — PASS** (same single-paragraph rendering; no referent-dependent stem here).
- **Construct Review — PASS.** Selecting the supported conclusion and rejecting three unsupported ones is genuine analysis; note the participation increase (30→90) is *explicit* in the text, so the real R4 work is the rejection task (evaluating support) — R3/R4 boundary, label R4 defensible.
- **Stem Review — PASS.** "Berdasarkan data pada teks, dapat disimpulkan bahwa …" — clear.
- **Answer Key Review — PASS.** "semakin diminati" follows from 30→90; B ("gagal karena hasil terlalu sedikit") is an unsupported negative framing; C and D are unsupported additions. Uniquely defensible.
- **Distractor Review — PASS (D7=3).** B = negative-framing bias (Rp350.000 "too little" without comparator); C = outside-knowledge substitution (kelas tujuh); D = spurious causality (budget link). Distinct, plausible.
- **Cognitive Review — MATCH PASS-with-note.** R4 defensible (support-evaluation); borderline R3 for the key path.
- **Diagnostic Value — HIGH.** Conclusion-support discrimination is a strong signal. D10 = 2.
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** TB-005 same archetype, different stimulus/data.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 | 3 (3) | tight | HARD |
| D3 | 3 (3) | strongest distractor demands support-evaluation | SCORED |
| D4 | 2 (3) | adequate | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 3 (3) | three distinct hypotheses | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | HARD consistent | SCORED |
| D10 | 2 (2) | HIGH value; HYPOTHESIS | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.67** (author 2.9) · publish gate: **BLOCKED** (correct).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None.

---

### ITEM TB-012 — `BC-TEKS-BERITA-0012` (klaim tidak didukung, STIM-03)

- **Construct**: READING / READING_INFERENSI *(claim-support evaluation — no dedicated subskill)* · R5 · HARD · evidence = supported-vs-overclaim discrimination.
- **Stimulus Review — PASS.**
- **Construct Review — PASS.** The task is evaluation of claim support against text evidence — genuine R5; the only R5 item in the set, and a clean one.
- **Stem Review — PASS.** "Pernyataan berikut yang TIDAK didukung oleh isi teks adalah …" — the negative construction is justified here (single overclaim vs three supported facts), not gratuitous; the word TIDAK is correctly capitalized for salience.
- **Answer Key Review — PASS.** The key ("banjir dijamin tidak akan terjadi") overclaims the text's "akar pohon … mengurangi risiko longsor". Note: the option also substitutes *banjir* for the text's *longsor* — the overclaim is wrong on two grounds, so a student may reject it for the wrong reason (topic mismatch) rather than the guarantee. The item still functions (the option is unsupported either way), but the wording could be tightened to test only the guarantee ("dijamin tidak akan terjadi longsor"). Minor.
- **Distractor Review — PASS (D7=3).** B/C/D are verbatim-supported facts — the correct answer is the *unsupported* one, punishing careless verification. Also targets the blueprint's "more activity = guaranteed outcome" / correlation→causality misconception.
- **Cognitive Review — MATCH PASS.** R5 = R5 (consistent with both §7.3 and DNA §5 — no conflict on this cell).
- **Diagnostic Value — HIGH.** Evaluative reading is the top cell; strong signal. D10 = **3** (state HYPOTHESIS — G3 note).
- **Language Review — PASS.**
- **Provenance — PASS.**
- **Duplication — PASS.** Unique archetype in the set.
- **15-Dimension Rubric** (author scores in parentheses):

| Dimension | Score | Evidence | Gate |
|---|---|---|---|
| D1 | 3 (3) | correct | HARD |
| D2 | 3 (3) | tight | HARD |
| D3 | 3 (3) | supported distractors demand verification | SCORED |
| D4 | 2 (3) | adequate | SCORED |
| D5 | 3 (3) | clear | HARD |
| D6 | 3 (3) | uniquely correct | HARD |
| D7 | 3 (3) | supported-fact traps + misconception targeting | HARD |
| D8 | 3 (3) | natural | HARD |
| D9 | 2 (2) | HARD consistent | SCORED |
| D10 | **3 (3)** | exemplary; state HYPOTHESIS | SCORED |
| D11 | 3 (3) | fresh | HARD |
| D12 | 2 (2) | elemen-level | SCORED |
| D13 | 3 (3) | neutral | HARD |
| D14 | 3 (3) | neutral | HARD |
| D15 | 2 (3) | key-at-0 | HARD |

Mean **2.73** (author 3.0) · publish gate: **BLOCKED** (D10 state HYPOTHESIS — correct).

**Verdict**: CONTENT PASS · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**
**Required revision**: None. (Optional tightening: key wording to test only the guarantee — "dijamin tidak akan terjadi longsor" — to avoid dual-ground rejection.)

---

## 5. Cross-Item Quality Matrix

| Item | Content | Pedagogy | Diagnostic | Item Verdict | Critical Issue |
|---|---|---|---|---|---|
| TB-001 | PASS | PASS | PASS | **PASS** | distractor-C rationale mis-stated (not content) |
| TB-002 | PASS | PASS | PASS | **PASS** | R3 label F1-conditional |
| TB-003 | REVISE | PASS | PASS | **REVISE** | key subject-shift (gerakan → pemerintah) |
| TB-004 | PASS | PASS | PASS | **PASS** | subskill mapping; key reuses root (metadata) |
| TB-005 | PASS | PASS | PASS | **PASS** | — |
| TB-006 | PASS | PASS | PASS | **PASS** | single-hypothesis distractors |
| TB-007 | PASS | PASS | PASS | **PASS** | R3 label F1/DNA-dependent |
| TB-008 | PASS | REVISE | PASS | **REVISE** | cognitive label (R2≈observed), weak distractor D, terminology risk |
| TB-009 | PASS | PASS | PASS | **PASS** | R4-vs-R5 label (foundation) |
| TB-010 | REVISE | REVISE | PASS | **REVISE** | **"paragraf kedua" has no referent — D4/D5 = 1, publish-blocking** |
| TB-011 | PASS | PASS | PASS | **PASS** | R3/R4 boundary note |
| TB-012 | PASS | PASS | PASS | **PASS** | banjir/longsor dual-ground note (optional) |

**Distribution: 9 PASS / 3 REVISE / 0 REJECT** (12/12 reviewed).

---

## 6. 15-Dimension Aggregate

**Independent scores** (this review; author scores in parentheses for comparison):

| Item | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | D12 | D13 | D14 | D15 | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TB-001 | 3 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.53 |
| TB-002 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.60 |
| TB-003 | 2 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.53 |
| TB-004 | 3 | 2 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.47 |
| TB-005 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.67 |
| TB-006 | 3 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.53 |
| TB-007 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.60 |
| TB-008 | 3 | 2 | 2 | 2 | 2 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.40 |
| TB-009 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 2.73 |
| TB-010 | 3 | 2 | 2 | **1** | **1** | 2 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | **2.20** |
| TB-011 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.67 |
| TB-012 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 2.73 |

- **Average mean: 2.56** (author-claimed average ≈ 2.80). The authoring pass over-scored by ~0.2–0.3 via D4=3s, D15=3s and D1=3 on TB-003.
- **Dimension distribution (180 cells):** 3 = 102 · 2 = 76 · **1 = 2** (TB-010 D4, D5) · 0 = 0.
- **Hard-fail triggers (< 2 on a HARD-FAIL dimension): 1 item (TB-010, D5=1).** No hard-fail dimension has a 0 anywhere.
- **Scored-dimension < 2: 1 cell (TB-010 D4=1).**
- **D10 states: 12/12 HYPOTHESIS** — every item correctly blocked from DIAGNOSTIC publish (§4.9: REVIEWED minimum), regardless of D10 score.
- **Mandatory-gate failures: 1 (TB-010)** — the conjunctive rule's clause 2 (no hard-fail < 2) fails until revision.
- **Publish gate: 0/12 publishable** — correct and honest per S2 (human PENDING + D10 HYPOTHESIS everywhere).

---

## 7. Failure Pattern Analysis

| # | Failure class | Items | Count | % of 12 | Severity | Systemic? |
|---|---|---|---|---|---|---|
| 1 | Stem references a non-existent structural unit | TB-010 | 1 | 8% | **HIGH** (publish-blocking) | No |
| 2 | Answer-key paraphrase precision (subject shift) | TB-003 | 1 | 8% | MEDIUM | No |
| 3 | Cognitive label mismatch / F1-dependent (claimed R3, operation R2–R3) | TB-002, 007, 008, 010, 011 | 5 | 42% | MEDIUM | **YES (metadata/foundation)** |
| 4 | Weak or contrived distractor / rationale | TB-008 (D), TB-001 (C rationale) | 2 | 17% | LOW–MEDIUM | No |
| 5 | Subskill mapping inconsistent with canonical taxonomy | TB-004 (→ READING_INFERENSI; READING_MAKNA_KATA exists) | 1 | 8% | LOW | No |
| 6 | Key-position uniformity (all 12 at index 0) | all | 12 | 100% | MEDIUM (mitigated by documented delivery shuffle, **unproven**) | **YES (artifact convention)** |
| 7 | Stale stimulus word-count headers (§3 headers vs table) | STIM-01…05 (118/122/103/104/117 vs 86/76/85/81/83) | 5 | 100% | LOW (hygiene) | **YES (documentation)** |

**Highest-value findings:**
1. **TB-010 referent defect (1 item, 8%)** — the only publish-blocking content defect; the pilot's self-audit missed it. First point of failure: **authoring/stimulus rendering** — the stimulus was authored with intended paragraph breaks that never made it into the artifact; neither the deterministic gate (correctly — it is not a structure checker) nor the author's self-review (incorrectly — this is precisely what §7.10's two-reviewer D5/D7 pass is for) caught it.
2. **F1 + DNA§5-vs-BP§7.3 R-scale conflict (5 items, 42%)** — metadata systemic; every struktur/gagasan/fakta-opini label is contestable until one mapping governs. First point of failure: **foundation (Blueprint §7.3 + DNA §5 disagree)**; Validation Spec stage 8 and Quality Standard D3 inherit the conflict.
3. **Key-position pattern (12/12, 100%)** — artifact convention; D15 family-scan gap G7 (already documented by the pilot §10) is now *demonstrated*, not hypothetical. First point of failure: **authoring convention** (no key-position randomization); mitigation (delivery shuffle) exists only as a §9 promise.
4. **Kosakata subskill mapping (TB-004, 8%)** — Blueprint §7.2 under-listed the taxonomy (omitted READING_MAKNA_KATA); pilot followed the stale list. First point of failure: **Blueprint §7.2 vs `lib/question-metadata/taxonomy.ts`** — the canonical taxonomy already has the right subskill.

---

## 8. Systemic Defect Analysis

**>25% threshold check, per mission §10:**
- **Item-content failure classes: NO class exceeds 25%.** The largest content class is the TB-010 referent defect at **8%** (1/12). Content-level **SYSTEMIC_DEFECT = FALSE**. No STOP trigger for content; no replacement items warranted.
- **Metadata/taxonomy dimension: YES — 5/12 (42%) of items carry cognitive labels whose validity depends on the unresolved F1 conflict plus the DNA §5 vs Blueprint §7.3 R-mapping disagreement; TB-004's subskill contradicts the canonical taxonomy; 12/12 key positions sit at index 0 (D15 family pattern); 5/5 stimulus word-count headers are stale.** Metadata-level **SYSTEMIC_DEFECT = TRUE**, with the consequence (per the STOP rule) that **no further items are generated until the foundation corrections land**: (a) founder decision F1 + one canonical R-mapping (recommend DNA §5); (b) Blueprint §7.2 updated to the full 5-subskill READING list; (c) authoring convention for key-position randomization; (d) artifact hygiene (word counts, STIM-05 paragraphing).

**Verdict: SYSTEMIC_DEFECT = TRUE (metadata/taxonomy dimension); FALSE (item-content dimension).**

---

## 9. Taxonomy — Fakta/Opini

- **Verified against the canonical source** (`lib/question-metadata/taxonomy.ts`): READING has **five** subskills — `READING_IDE_POKOK`, `READING_INFORMASI_TERSURAT`, `READING_INFERENSI`, `READING_MAKNA_KATA`, `READING_STRUKTUR_TEKS`. **No `READING_FAKTA_OPINI` (or equivalent) exists.**
- **Fakta/opini (TB-003, TB-009):** genuinely **missing** from the taxonomy — the pilot's mapping to `READING_INFERENSI` is a documented, flagged workaround. Consistent with Blueprint §7.2's own gap flag and its candidate `READING_FAKTA_OPINI`.
- **New finding:** the "kosakata has no subskill" reading is **false** — `READING_MAKNA_KATA` exists. Only TB-004's *mapping* is wrong (should be `READING_MAKNA_KATA`, not `READING_INFERENSI`). Claim-support evaluation (TB-012) also lacks a dedicated subskill (same gap family as fakta/opini).
- **Evidence-target validity:** `evidence_target.skill` = READING resolves correctly to `LearningSkillType.READING` in all 12 items (no mapping was invented to make the pilot look complete; the two real gaps are honestly flagged).
- **TAXONOMY_DECISION = FOUNDER_REVIEW_REQUIRED** — no taxonomy change exists in the repository and none was made by this review. Recommendation for the founder: (a) remap TB-004 to the existing `READING_MAKNA_KATA` (free, no taxonomy change); (b) decide whether to add `READING_FAKTA_OPINI` (and optionally a claim-support/`READING_SIMPULAN`-style subskill) in a separate taxonomy phase — the blueprint's candidate is sufficient to act on.

---

## 10. Pilot Gate

| Gate state | Value |
|---|---|
| Pilot status (this review) | **REVISE_PILOT** |
| Human review | **NOT_COMPLETED** (structured review completed; founder/human approval remains pending) |
| F1 | **OPEN_FOUNDER_DECISION** |
| Systemic defect | Content FALSE · Metadata TRUE |
| Publishable items | **0/12** (correct per S2: human gate PENDING + D10 HYPOTHESIS) |
| Items needing revision before founder review | **3/12** (TB-003, TB-008, TB-010) |

This report performs a structured review but is **not** a human reviewer, so the honest status is: **HUMAN_REVIEW_IN_PROGRESS** (structured pre-review complete; the 3 revisions must land and a qualified human must then run §6 of the pilot's own checklist before any item may approach LEVEL 0 delivery). **HUMAN_APPROVED is not claimed.**

---

## 11. Final Recommendation

**Exactly one: B. REVISE_PILOT**

- **Why not A (READY_FOR_FOUNDER_REVIEW):** TB-010 carries a publish-blocking clarity defect (D5 = 1) that a founder review should not inherit; the pilot's "0 rejects / none < 2" self-claim is wrong and should be corrected.
- **Why not C (REVISE_FOUNDATION):** the foundation *did* produce the right shape of items; the systemic findings are metadata-level (F1 + R-mapping + taxonomy alignment + authoring conventions), all with concrete, small fixes. No item content defect traces to an unresolvable foundation flaw. The V7/S2 rules held under real authoring (12/12 hypotheses, 0/12 publishable — correctly).
- **Why not D (REJECT_PILOT):** 9/12 items pass as-is; 3 REVISE items are salvageable with small, specified edits; 0 REJECT. The set is closer to production-quality than anything in the legacy bank.
- **Required actions before founder review:**
  1. Revise TB-010 (restore STIM-05 paragraphing or reword the stem) — publish-blocking.
  2. Revise TB-003 (key wording → verbatim-supported).
  3. Revise TB-008 (cognitive cell resolution + distractor D replacement + rationale).
  4. Metadata: remap TB-004 → `READING_MAKNA_KATA`.
  5. Artifact hygiene: randomize key positions across the 12 items (or formally commit the delivery shuffle); fix the 5 stale word-count headers.
  6. Foundation one-liners (pending founder): F1 decision with DNA §5 as the canonical R-mapping; Blueprint §7.2 full 5-subskill list; explicit D10 score-vs-state convention (G3).
- **After revisions:** re-run this structured review (expect 12/12 PASS or PASS-with-notes), then schedule the two-reviewer human session (keys + cognitive cells, agreement ≥ 0.80/0.70 per §7.10) and the first 20-item rubric run — only that session may set `HUMAN_APPROVED`.

**Safety confirmation (this phase):** DB writes = 0 · question generation = 0 · bank edits = 0 · schema changes = 0 · production code changes = 0 · validators modified = 0 · allowlist population = 0 · pilot artifact modified = 0 · items delivered = 0. The only artifact created is this report.