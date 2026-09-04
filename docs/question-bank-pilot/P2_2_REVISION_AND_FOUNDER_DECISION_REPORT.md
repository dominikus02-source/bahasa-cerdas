# P2.2 — Revision & Founder Decision Report

**Mode**: TARGETED REVISION + F1 DECISION RECORD · **Date**: 2026-09-04
**Subject**: `docs/question-bank-pilot/TEKS_BERITA_PILOT_V1.md` (12 items, 5 stimuli)
**Scope lock honored**: 0 DB writes · 0 question generation · 0 bank edits · 0 schema changes · 0 production code changes · 0 allowlist population · 0 validators modified. Only the four explicitly authorized item changes (TB-003, TB-004 mapping, TB-008, TB-010) plus the P2.2 report were touched. Blueprint left untouched (silent modification prohibited).

**Semantics**: STRUCTURED_REVIEW = COMPLETE · HUMAN_REVIEW = PENDING · FOUNDER_APPROVAL = PENDING — no human approval claimed anywhere in this report.

---

## 1. Executive Verdict

| Dimension | Verdict |
|---|---|
| **Pilot status** | **READY_FOR_TWO_REVIEWER_HUMAN_SESSION** (conditional) — all three REVISE items from P2.1 are revised and re-validated; 0 rejects; no content defect remains. Publish remains correctly blocked (D10 HYPOTHESIS everywhere + human PENDING). |
| **F1 status** | **PROPOSED_RESOLUTION — FOUNDER_DECISION_REQUIRED = TRUE** (§2). No stored founder decision exists (re-verified). This report records a decision *proposal* (DNA §5 as canonical R-mapping); the founder's sign-off is the only remaining gate on the cognitive layer. |
| **Systemic defect** | **Content: FALSE** (0/12 content defects after revision; previously 1). **Metadata: TRUE, founder-pending** — 5/12 cognitive labels remain F1-conditional until F1 sign-off; key-position pattern 11/12 at index 0 (TB-008 now index 1); 4/5 stale word-count headers. All three are documented with owners (§12, §14); none is a hidden defect. |
| **Revision outcome** | TB-003 key precision **fixed** · TB-004 remapped to `READING_MAKNA_KATA` · TB-008 **strengthened** to genuine R4 structure application (F2 resolved) · TB-010 **referent restored** (paragraph breaks) + key sharpened (coordinate-idea ambiguity closed). |
| **Overall recommendation** | **A. READY_FOR_TWO_REVIEWER_HUMAN_SESSION** — condition: founder signs F1 (§2) before the session's cognitive-cell scoring, so reviewers score D3/cognitive cells against one canonical mapping. |

**One-sentence verdict**: the foundation's defect-detection worked (P2.1 found the defects), the defect-repair worked without construct drift (this phase), and the only remaining blockers are human gates — founder sign-off on F1 and the two-reviewer session — not item content.

---

## 2. F1 Decision Record

### The conflict (located, not assumed)

- **Blueprint §7.3** (cognitive %s): "R2 ~25% (eksplisit/lead) · R3 ~25% (struktur, kosakata-dalam-konteks) · R4 ~35% (gagasan, inferensi, fakta/opini halus) · R5 ~15% (evaluasi dukungan klaim)". → 12 items: R2=3, R3=3, R4=4, R5=2.
- **Blueprint §7.4** (archetype list): 2× eksplisit · 2× gagasan utama/lead **(R3)** · 2× inferensi dua-bukti · 2× fakta/opini · 2× struktur · 1× kosakata · 1× klaim **(R5)**. → §7.4's own labels: R2=2, R3=5, R4=4, R5=1.
- **Item DNA §5** (self-declared "single source of truth for the bank"): informasi tersurat **R2** · gagasan utama (literal) **R2** · kosakata-dalam-konteks **R3** · inferensi **R4** · **struktur R4** · **fakta-opini R5** · evaluasi klaim **R5**.
- **Why they cannot all hold**: §7.4 labels gagasan-utama R3 while §7.3 places "gagasan" in R4; DNA §5 maps struktur→R4 and fakta/opini→R5 while §7.3 puts them at R3/R4; the archetype list forces 5 items into R3 vs §7.3's 3.

### Canonical proposal

```
F1_STATUS = PROPOSED_RESOLUTION (founder sign-off pending; FOUNDER_DECISION_REQUIRED = TRUE)

CANONICAL_RULE =
  1. Blueprint §7.4 archetype list is the binding per-item architecture (concrete,
     satisfiable — the pilot hit it exactly — and aligned with the §7.1 construct).
  2. Item DNA §5 is the single canonical R-mapping for every item:
       informasi tersurat / gagasan utama (literal)  → R2
       kosakata-dalam-konteks                        → R3
       struktur teks berita                          → R4
       inferensi (dua-bukti, data)                   → R4
       fakta/opini                                   → R5
       evaluasi dukungan klaim                       → R5
  3. Blueprint §7.3 percentages are advisory guidance ("~"), not a binding quota.

RATIONALE =
  - DNA §5 is the only document that self-declares canonical authority for the R-mapping;
    Quality Standard D3 and Validation Spec stage 8 both defer to it implicitly.
  - DNA §5's cells match the blueprint's own stated diagnostic intent: "R4 carries the
    diagnostic signal" (R4 = struktur + inferensi = 33%) and evaluation at R5 (25%).
  - §7.4 is concrete and was proven satisfiable (12/12 items authored to it exactly);
    §7.3 percentages are explicitly prefixed with "~".
  - Under this rule the pilot distributes R2=4 (33%), R3=1 (8%), R4=4 (33%), R5=3 (25%);
    R4+R5 = 58% carrying the diagnostic signal — consistent with the blueprint's intent.

LEGACY / ALTERNATIVE_INTERPRETATION =
  - §7.3-as-binding would force struktur→R3 and fakta/opini→R4, contradicting DNA §5 and
    forcing items into cognitive cells their operations do not perform (the pilot's own
    P2.1 finding: TB-008 claimed R3 but operated ≈R2 until strengthened).

IMPLEMENTATION_IMPACT (once founder signs) =
  - Relabel 5 items (content untouched): TB-002 R3→R2, TB-003 R4→R5, TB-007 R3→R4,
    TB-009 R4→R5, TB-010 R3→R2. TB-008 already relabeled R3→R4 as part of this phase's
    authorized revision (its task was strengthened to match R4 — see §6).
  - One-line Blueprint §7.3 clarification (separate authorized docs phase, per §14 item 1).
  - Pilot §7 distribution table update to R2=4/R3=1/R4=4/R5=3 (33/8/33/25%).
```

**F1_STATUS: PROPOSED_RESOLUTION — FOUNDER_DECISION_REQUIRED = TRUE.** This report does not claim founder approval. The pilot artifact's labels were changed only where an allowed revision required it (TB-008); the other labels remain F1-conditional.

---

## 3. Revision Scope

| Item | Change type | Authorized by mission §3 | Status |
|---|---|---|---|
| TB-003 | Key wording (content) | ✅ | Applied §4 |
| TB-004 | Subskill mapping (metadata) | ✅ | Applied §5 |
| TB-008 | Cognitive cell + task strengthening + distractor D (content+metadata) | ✅ | Applied §6 |
| TB-010 | Stimulus paragraphing + key sharpening (content) | ✅ | Applied §7 |
| All other 8 items | None | — (must not change without material new defect) | Regression-reviewed §8; unchanged |

No new item was generated. No PASS item was modified. Revision notes (v1.1) are embedded in the pilot artifact next to each revised item for auditability, per mission §9.

---

## 4. TB-003 Revision

**Original defect** (P2.1): the key ("Pemerintah Desa Sukamaju menyediakan 500 buku bacaan…") shifted the subject from the text's "Gerakan ini menyediakan 500 buku bacaan…" to the government. For a fact/opinion item whose entire point is text-verifiability, a non-verbatim key invites a legitimate challenge (D1 = 2, borderline).

**Revision** (one line):
- Key: "Gerakan \"Sukamaju Membaca\" menyediakan 500 buku bacaan di pos ronda dan balai desa." — verbatim-supported by text sentence 2.
- Explanation updated to cite the exact sentence. Distractors B/C/D and their hypotheses unchanged.

**Construct preservation**: fact/opinion discrimination — unchanged. **Cognitive target**: unchanged (R4 per pilot; F1 canonical proposal → R5 fakta/opini, pending founder). **Key status**: key corrected to match evidence; the old key was a *defensible-but-imprecise paraphrase*, not a wrong key — this revision removes the ambiguity rather than flipping the answer.

| Dimension | Before | After | Evidence |
|---|---|---|---|
| D1 Content correctness | 2 | **3** | key now verbatim-supported |
| Mean | 2.53 | **2.60** | |

**Verdict (re-scored)**: CONTENT **PASS** · PEDAGOGY PASS · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**

---

## 5. TB-004 Taxonomy Remap

**Finding** (P2.1): the pilot mapped this vocabulary-in-context item to `READING_INFERENSI` following Blueprint §7.2's stale 4-subskill list, but the canonical taxonomy (`lib/question-metadata/taxonomy.ts`) has **five** READING subskills including `READING_MAKNA_KATA` ("Makna Kata dalam Bacaan").

**Remap applied** (metadata only):
- `READING_INFERENSI` → **`READING_MAKNA_KATA`** in the Skill/subskill line and the `evidence_target` field.
- No LearningSkillType created. Item content, prompt, options, key, cognitive target (R3) unchanged.

**Construct compatibility audit**: the item's construct is context-driven meaning of a word in a passage — exactly `READING_MAKNA_KATA`. The prior mapping was a stale-list artifact, not a construct decision.

**Verdict**: mapping canonical; item content untouched; **ITEM_VERDICT: PASS** (unchanged from P2.1). Optional improvement noted in P2.1 (paraphrase the key to avoid the root word "keluhan", sharpening R3 context-dependence) remains open but non-blocking — it is a refinement, not a defect.

---

## 6. TB-008 Revision

**Original defects** (P2.1): (a) claimed R3, observed ≈R2 — the task (locate the first sentence = lead) was near-retrieval; (b) distractor D ("judul yang menarik minat pembaca") obviously wrong; (c) distractor C rationale contrived; (d) F2 difficulty deviation (EASY vs §7.6 "structure = Medium").

**Revision** (strengthen the task, per mission §3 "atau revise item jika construct memang ingin dipertahankan" — the construct *is* structure awareness, and the canonical R-cell for struktur is R4):
- **Stem**: "kalimat pertama" → "kalimat kedua" — sentence 2 ("Mobil perpustakaan itu membawa 800 buku cerita dan buku pengetahuan") sits mid-text where lead-vs-body discrimination is real structure application, not retrieval.
- **Key (index 1)**: "tubuh berita yang mengembangkan rincian informasi dari lead" — carries its own gloss so the item is not journalism-vocabulary-dependent (addresses P2.1's D2 concern).
- **Distractors**: 0 = lead generic ("kalimat awal = lead" heuristic); 2 = "simpulan penulis yang merangkum isi berita" (content-as-summary pattern-match, replacing the contrived penutup); 3 = "teras berita yang menjawab pertanyaan kapan dan di mana" (function-misattribution: the when/where answers live in sentence 1). All three plausible, distinct, on-construct.
- **Cognitive**: R3 → **R4** (MENGANALISIS) — matches the strengthened operation and DNA §5's struktur→R4 cell.
- **Difficulty**: EASY → **MEDIUM** — §7.6 ("structure = Medium"); **F2 resolved**.
- Key moved to index 1 as a natural consequence of the rewrite — the first break in the 12/12 key-at-index-0 pattern (D15 hygiene improvement).

**Construct preservation**: structure teks berita — unchanged; the item still tests structural function, now with genuine analytic demand. **Key status**: key changed position and wording as part of the rewrite; the correct answer for the *new* stem is uniquely defensible (sentence 2 elaborates the lead; it is not the lead, a conclusion, or the teras).

| Dimension | Before | After | Evidence |
|---|---|---|---|
| D2 Construct alignment | 2 | **3** | genuine structure application, no terminology dependence (gloss carries the task) |
| D3 Cognitive demand | 2 | **3** | R4 matches the operation |
| D5 Question clarity | 2 | **3** | clear referent ("kalimat kedua", sentence quoted) |
| D7 Distractor quality | 2 | **3** | three plausible on-construct hypotheses |
| D9 Difficulty integrity | 2 | **3** | MEDIUM per §7.6; F2 resolved |
| D15 Security/leakage | 2 | **3** | key at index 1 (pattern broken) |
| Mean | 2.40 | **2.80** | |

**Verdict (re-scored)**: CONTENT **PASS** · PEDAGOGY **PASS** · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**

---

## 7. TB-010 Revision

**Original defects** (P2.1): **publish-blocking** — the stem asked about "paragraf kedua" but STIM-05 rendered as a single paragraph: the referent did not exist (D4 = 1, D5 = 1 → hard-fail trigger). Secondary: P2's coordinate second idea made the main-idea key a judgment call (D6 = 2).

**Revision**:
1. **Stimulus** (STIM-05): paragraph breaks restored — P1 = kalimat 1 · P2 = kalimat 2–3 · P3 = kalimat 4–5 · P4 = kalimat 6. Word count unchanged (83 kata); the stale header count (117) corrected to 83. TB-011 (same stimulus, no paragraph referent) unaffected.
2. **Key**: rewritten to cover both sentences of P2 — "Siswa rutin menyetor sampah setiap Jumat dan hasil penjualannya digunakan untuk membeli buku tulis bagi siswa yang membutuhkan." — closing the coordinate-idea judgment call. Option 1 (kalimat 1 verbatim) now functions cleanly as the "first sentence = main idea" trap; option 2 = P1 idea; option 3 = P3 idea.
3. Explanation and distractor rationales updated to the restored paragraph structure.

**Construct preservation**: paragraph main-idea discrimination — unchanged. **Cognitive target**: unchanged (R3 per §7.4 label; F1 canonical proposal → R2 gagasan literal, pending founder — the *operation* is unchanged either way). **Key status**: key strengthened, answer direction unchanged.

| Dimension | Before | After | Evidence |
|---|---|---|---|
| D2 Construct alignment | 2 | **3** | referent defect gone |
| D4 Stimulus quality | 1 | **3** | stimulus internally consistent with the stem's referent |
| D5 Question clarity (HARD) | 1 | **3** | "paragraf kedua" now exists in the delivered text |
| D6 Answer-key validity | 2 | **3** | key is the unambiguous summary of P2 |
| Mean | 2.20 | **2.60** | |

**Verdict (re-scored)**: CONTENT **PASS** · PEDAGOGY **PASS** · DIAGNOSTIC_VALUE PASS · **ITEM_VERDICT: PASS**

---

## 8. Full 12-Item Regression Review

| Item | Before (P2.1) | After (P2.2) | Content | Pedagogy | Diagnostic | Gate |
|---|---|---|---|---|---|---|
| TB-001 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-002 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (label F1-cond.) |
| TB-003 | REVISE | **PASS** | ✅ key verbatim | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-004 | PASS | PASS | ✅ remapped | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-005 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-006 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-007 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (label F1-cond.) |
| TB-008 | REVISE | **PASS** | ✅ strengthened | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-009 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (label F1-cond.) |
| TB-010 | REVISE | **PASS** | ✅ referent restored | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-011 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (D10 HYPO) |
| TB-012 | PASS | PASS | ✅ | ✅ | ✅ | BLOCKED (D10 HYPO) |

**Distribution: 12 PASS / 0 REVISE / 0 REJECT** (was 9/3/0).

**Regression checks on the 8 unrevised items** (mission §5 — indirect issues from F1 resolution / taxonomy remap):
- **No content regression**: 0 new content defects found; items verified unchanged in the artifact (`git diff` shows only the four authorized items + distribution tables + revision notes).
- **Taxonomy remap side effects**: TB-004 was the only item mapped to `READING_INFERENSI` for kosakata; no other item references that mapping. TB-005/011/012 (`READING_INFERENSI`) are genuine inference/evaluation items — unaffected.
- **F1-label dependence** (unchanged, now explicit): TB-002, TB-003, TB-007, TB-009, TB-010 carry labels that will be relabeled on F1 sign-off (proposal §2). No content impact.
- **STIM-05 paragraphing**: TB-011 shares STIM-05 but references "data pada teks", not a paragraph — unaffected (verified stem/explanation).

---

## 9. 15-Dimension Aggregate

| Item | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | D12 | D13 | D14 | D15 | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TB-001 | 3 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.53 |
| TB-002 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.60 |
| TB-003 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | **2.60** |
| TB-004 | 3 | 2 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.47 |
| TB-005 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.67 |
| TB-006 | 3 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.53 |
| TB-007 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.60 |
| TB-008 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | **2.80** |
| TB-009 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 2.73 |
| TB-010 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | **2.60** |
| TB-011 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2.67 |
| TB-012 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 2.73 |

- **Average mean: 2.63** (P2.1: 2.56). All means verified by scripted summation.
- **Dimension distribution (180 cells): 3 = 113 · 2 = 67 · 1 = 0 · 0 = 0** (was 102/76/2/0 — the two 1s are gone).
- **Hard-fail triggers (< 2 on a HARD dimension): 0** (was 1: TB-010 D5).
- **Scored-dimension < 2: 0** (was 1: TB-010 D4).
- **Mandatory-gate failures: 0** (was 1). Conjunctive rule clause 2 now satisfied by all 12.
- **Publish gate: 0/12 publishable** — unchanged and correct (clause 5 human APPROVED absent + clause 4 D10 = HYPOTHESIS < REVIEWED for DIAGNOSTIC).

---

## 10. D10 Status

| Item | D10 state | Basis |
|---|---|---|
| TB-001…TB-012 (all 12) | **HYPOTHESIS** | No response data; no human review completed. Authoring hypotheses only (V7). |

No item uses `EMPIRICALLY_SUPPORTED` or `REVIEWED`. The two items with D10 score = 3 (TB-009, TB-012) keep state HYPOTHESIS — score and state remain distinct (F3 convention gap unchanged, §14 item 3). Nothing changed by this phase: revisions do not alter evidence state.

---

## 11. Failure Pattern Analysis

| # | Failure class (P2.1) | Items | Status after P2.2 | Count now | Severity | Systemic? |
|---|---|---|---|---|---|---|
| 1 | Stem references non-existent structural unit | TB-010 | **RESOLVED** (paragraph breaks restored + key sharpened) | 0 | — | No |
| 2 | Answer-key paraphrase precision | TB-003 | **RESOLVED** (verbatim key) | 0 | — | No |
| 3 | Cognitive label mismatch / F1-dependent | TB-002, 007, 008, 010, 011 | TB-008 **RESOLVED** (strengthened to R4); 5 labels remain **F1-conditional pending founder** | 5 | MEDIUM (metadata) | **YES (founder-pending)** |
| 4 | Weak/contrived distractor | TB-008 (D), TB-001 (C rationale) | TB-008 **RESOLVED** (3 new distractors); TB-001 C-rationale is a documentation note on a PASS item — left, listed §14 | 0 content | LOW | No |
| 5 | Subskill mapping vs canonical taxonomy | TB-004 | **RESOLVED** (remapped to READING_MAKNA_KATA) | 0 | — | No |
| 6 | Key-position uniformity | all | TB-008 → index 1; 11/12 remain at index 0 (convention, delivery-shuffle promise unproven) | 11 | MEDIUM (convention) | **YES (artifact convention)** |
| 7 | Stale word-count headers | STIM-01…05 | STIM-05 **fixed** (83); 4 remain | 4 | LOW (hygiene) | **YES (documentation)** |

No content-failure class exceeds 25% (there are now **zero** content failures). The remaining systemic rows are metadata/documentation conventions with explicit owners — none blocks the human session (F1 sign-off conditions it, §13).

---

## 12. Systemic Defect Assessment

**>25% threshold check, per mission §8:**
- **Item-content: SYSTEMIC_DEFECT = FALSE.** 0 content defects remain (previously 1 item = 8%). No STOP trigger. No replacement items warranted.
- **Metadata/taxonomy: SYSTEMIC_DEFECT = TRUE — founder-pending.** 5/12 cognitive labels (42%) depend on the F1 decision recorded in §2; 11/12 key positions sit at index 0; 4/5 word-count headers stale. All three have an explicit owner and resolution path (§14 items 1, 6); none is silently tolerated — this report makes them visible. F1 is the only one that gates further work (the human session's cognitive-cell scoring).

**No P2.2A foundation correction is required.** The mission's STOP-expansion triggers were checked: TB-003's problem was not systemic (single item, one-line fix); TB-008's distractor problem was not systemic (only TB-008 + a TB-001 documentation note); the cognitive conflict is precisely F1 (recorded §2), not a broader contradiction; the taxonomy problem was limited to TB-004 (remapped). The three revised items' defects did not recur on any other item.

---

## 13. Human Review Readiness

| Gate | State |
|---|---|
| Deterministic gates (structural + bank-gate) | ✅ 12/12 safe (4 revised items re-run this phase; controls rejected) |
| Authoring quality (15 dimensions) | ✅ all ≥ 2, 0 hard-fails, average 2.63 |
| D10 | HYPOTHESIS everywhere — publish correctly blocked |
| Human review | **PENDING** — no qualified reviewer has read the items; `HUMAN_APPROVED` claimed nowhere |
| Founder approval | **PENDING** — F1 proposal (§2) awaits sign-off |

**Ready for the two-reviewer human session with one condition**: the founder signs the F1 proposal (§2) before the session's rubric run, so reviewers score D3/cognitive cells against a single canonical R-mapping. Content review is unaffected by F1 either way. The reviewer checklist in the pilot §6 and the P2.1 §2 limitations (LEVEL 0 difficulty, no response data, native-language check) all still apply.

---

## 14. Remaining Founder Decisions

1. **F1 sign-off** — adopt the §2 proposal (DNA §5 canonical; §7.4 binding; §7.3 advisory). On sign-off: relabel 5 items (metadata), update pilot §7 table, and authorize the one-line Blueprint §7.3 clarification in a separate docs phase. *(Only content-adjacent decision; everything else below is process/hygiene.)*
2. **F2 (confirm)** — TB-008 EASY→MEDIUM was applied via task strengthening per §7.6; founder confirmation requested as a formality.
3. **F3 (unchanged)** — add the one-line D10 score/state convention to the Quality Standard (still open).
4. **Schedule the two-reviewer human session** (stages 3/4/6/8 + keys + cognitive cells + first 20-item rubric run) — now unblocked by content.
5. **Taxonomy pass** (unchanged) — decide whether to add `READING_FAKTA_OPINI` (and a claim-support subskill) for TB-003/009/012; `TAXONOMY_DECISION = FOUNDER_REVIEW_REQUIRED`.
6. **Artifact hygiene** (non-blocking): TB-001 distractor-C rationale note (P2.1 §4), key-position randomization convention for future authoring, 4 stale word-count headers (STIM-01…04), optional TB-004 key paraphrase (root-word avoidance).

---

## 15. Final Recommendation

**A. READY_FOR_TWO_REVIEWER_HUMAN_SESSION**

- The three REVISE items are revised and re-validated (12/12 PASS in structured review); 0 rejects; no content defect remains; the only hard-fail in the pilot's history (TB-010) is closed.
- Publish remains correctly blocked (D10 HYPOTHESIS + human PENDING) — no item is production-eligible, and none should become so before the human session and F1 sign-off.
- Not REVISE_PILOT (0 defects remain), not REVISE_FOUNDATION (no systemic content failure; F1 has a concrete proposal awaiting the founder, not a defect needing a redesign), not REJECT_PILOT (no gate failure).
- **Condition**: F1 (§2) signed before the session's cognitive-cell scoring; everything else in §14 is process, not a blocker.

**What this phase proved**: the foundation's review loop works end-to-end — P2.1 found real defects (referent, key precision, cognitive mismatch, distractor weakness), P2.2 repaired all four without construct drift, and the deterministic gate + tsc remain green. The 12 items are now the correct shape for the human gate: content-clean, hypothesis-only, fully scored, with sanitized delivery view (§9 of the pilot) intact.

---

## Appendix A — Validation runs (read-only)

| Command | Result |
|---|---|
| Production bank-gate (`isDiagnosticSafeItem`, pure function) on the 4 revised items + 2 controls | ✅ 4/4 revised SAFE (empty reasons); controls rejected `TEMPLATE_STEM`+`FILLER_DISTRACTORS` and `KEY_OUT_OF_RANGE` — gate non-vacuous. Throwaway script deleted after run. |
| `npx tsc --noEmit` | ✅ 0 errors, exit 0 |
| Leakage suites | Not applicable — pilot delivered nowhere (no Soal row, no API); student-delivery view is conceptual. |
| Mean re-verification | All per-item means and the 2.63 aggregate verified by scripted summation from the dimension tables. |

**Limitations** (unchanged from P2.1): no human reviewer; no response data (difficulty LEVEL 0, D10 HYPOTHESIS); Indonesian linguistic quality assessed by AI-assisted review only; factual correctness of fictional stimuli verified for internal consistency only.