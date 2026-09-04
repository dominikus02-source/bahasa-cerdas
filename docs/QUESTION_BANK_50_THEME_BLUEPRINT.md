# BahasaCerdas — 50-Theme Question Bank Blueprint (Phase 1A.1)

**Status**: FORWARD DESIGN SPECIFICATION. Canonical, forward-looking rebuild design for the 50-theme Bahasa Indonesia bank. Documentation only — zero DB writes, zero question generation, zero bank edits, zero schema/code changes.

## Document map (who owns what — do not blur these roles)

| Document | Role |
|---|---|
| **This blueprint** | Forward design specification: *how should we rebuild each theme?* Families, evidence cells, archetypes, volumes, waves, Teks Berita pilot. |
| `QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md` | Historical evidence about the OLD bank (contamination, classification, 1,480 RETIRE). Not a design doc. |
| `QUESTION_BANK_QUALITY_STANDARD.md` | Governing quality contract (15 dimensions, gate classes, publish rule). |
| `QUESTION_ITEM_DNA.md` | Canonical logical item structure (fields, authoring vs delivery separation). |
| `QUESTION_VALIDATION_SPEC.md` | Future validation lifecycle (stages 0–11, calibration LEVEL 0–3). |
| `QUESTION_BANK_RESEARCH_BIBLIOGRAPHY.md` | Provenance for every external claim (`[S#]`). |

The blueprint **does not** restate the audit's findings beyond what a forward design must reference. It answers "how to rebuild", not "what was wrong". All claims below that touch research are keyed `[S#]`; every curriculum/TKA/UKBI relevance statement uses the established classification (SOURCE-DERIVED / RESEARCH-INFORMED / INTERNAL REQUIREMENT / INFERENCE) — and **no theme is claimed to be an official SNPMB/UKBI construct** (SNPMB framework remains NOT_VERIFIED, bibliography P4; UKBI = RESEARCH-INFORMED analog only).

**Compliance notes carried from Phase 1B verification** (foundation: CONDITIONAL GO — corrections V7 + S2 applied in Phase 1A.2, Quality Standard v1.1):
- Misconceptions in this blueprint are **HYPOTHESES (THEORETICAL / INTENDED)** unless explicitly marked empirically validated (none are yet — no items exist). Distractor selections are "consistent with" a hypothesis, never "= misconception" (V7; Quality Standard §4.8).
- Volumes follow the evidence-cell model and the **conjunctive publish rule** of the Quality Standard (S2; §4.4): no hard-fail < 2, all scored ≥ 2, explicit D10 state, human APPROVED, purpose gates; D10 (diagnostic value) is **never calibration-exempt** (§4.9).
- Testlet rule: items sharing one stimulus form **one evidence unit** for diagnostic use.

---

## 1. Assessment families (construct-similarity, not convenience)

Eight families; **50 themes = 0 invented, 0 renamed, 0 merged** (exact audit names preserved).

| Family | Themes (#) | Family purpose |
|---|---|---|
| **F1 Sintaksis & Kalimat Efektif** | SPOK (1), Kalimat (3), Kalimat Efektif (17) | Sentence-level grammar: analysis of clause functions, sentence types, and effective/writing-quality sentence construction. |
| **F2 Ide & Struktur Wacana** | Paragraf (6), Ide Pokok (7), Gagasan Utama (8), Simpulan (9) | Macro-reading: locating and organizing the central ideas of paragraphs and short texts. |
| **F3 Jenis Teks Nonfiksi (informasi & argumentasi)** | Artikel (18), Editorial (19), Teks Editorial (20), Anekdot (33), Teks Deskripsi (34), Teks Narasi (35), Teks Eksposisi (36), Teks Eksplanasi (37), Teks Persuasi (38), Teks Argumentasi (39), Teks Prosedur (40), Teks Berita (41), Teks Ulasan (42), Resensi (43) | Genre reading: structure, purpose, language features, and content of informational/argumentative text types. |
| **F4 Prosa Fiksi & Narasi** | Cerpen (25), Novel (26), Drama (27), Fabel (28), Legenda (29), Hikayat (30), Mitos (31), Cerita Inspiratif (32) | Literary prose: narrative elements, character, conflict, values — evidence-based literary interpretation. |
| **F5 Puisi & Bahasa Figuratif** | Puisi (21), Pantun (22), Syair (23), Gurindam (24), Majas (4) | Poetic and figurative language: diction, imagery, rhyme/structural form, figurative meaning. |
| **F6 Teks Fungsional** | Surat Pribadi (44), Surat Dinas (45), Proposal (46), Pidato (47), Poster (48), Iklan (49), Slogan (50) | Everyday/functional documents: format conventions, purpose, audience, effective language. |
| **F7 Ejaan & Bentuk Baku** | Kata Baku (12), Kata Tidak Baku (13), PUEBI (14), Ejaan (15), Tanda Baca (16) | The language system on paper: spelling, capitalization, punctuation, standard forms, error detection/repair. |
| **F8 Kosakata & Morfologi** | Antonim (2), Sinonim (5), Makna Kata (10), Imbuhan (11) | Lexis and word formation, with meaning *in context* preferred over bare recall. |

### Family patterns

- **F1 — purpose**: sentence competence (receptive grammar analysis and productive editing). Patterns: short contextual sentences (archetype C), editing/error-diagnosis (D/M). Common validation risk: vocabulary contamination (SPOK item that is really lexical difficulty) and ambiguous clause analysis. Stimulus: one sentence (10–25 words), sometimes a two-clause sentence. Cognitive: R3 primary, R2 secondary.
- **F2 — purpose**: the most curriculum-ubiquitous reading evidence. Patterns: passage + locate main idea / infer conclusion (A/K). Risk: distractors that are true-but-not-main (plausible secondary ideas) — this is the craft skill; answer must be provable from text. Stimulus: 1–3 paragraph expository text (60–180 words SMP, 100–250 SMA). Cognitive: R2 (literal ide pokok in short texts) → R4 (inference across longer texts). **Adaptive PRIMARY.**
- **F3 — purpose**: genre literacy — does the student read *news/explanation/argument/procedure* as genre? Patterns: structure sequencing, language-feature identification, 5W+1H, fakta/opini, evidence evaluation (A, B, H, I, J). Risk: outside-knowledge contamination (news events), vocabulary contamination, subjective evaluation (ulasan/resensi). Stimulus: authentic-style text per genre. Cognitive: R2–R5. **Adaptive PRIMARY for Berita/Eksplanasi/Argumentasi/Editorial.**
- **F4 — purpose**: literary comprehension and appreciation with textual grounding. Patterns: passage + narrative elements, character inference, conflict, amanat (A/F). Risk: "amanat" subjectivity — key must rest on textual evidence; cultural framing sensitivity (hikayat/mitos). Stimulus: original or public-domain literary excerpt. Cognitive: R2–R4 (R5 only where text supports evaluation).
- **F5 — purpose**: poetic meaning and figurative language. Patterns: poem/pantun/syair/gurindam + diction/imagery/figurative meaning (G). Risk: subjective interpretation → require defensible textual basis; archaic diction as fake difficulty in syair. Cognitive: R3–R4 (interpretation), never R1 definition-recognition.
- **F6 — purpose**: functional literacy — read/write practical documents correctly. Patterns: authentic functional text + format/purpose/audience (H), plus editing of format errors. Risk: trivial format recall; use function-over-form questions. Cognitive: R2–R3.
- **F7 — purpose**: spelling/standard-form competence — recognition *and* repair. Patterns: error diagnosis and sentence revision (D/M); near-identical spelling options are **intentional** (SPELLING_TYPES carve-out in `content-validation.ts`). Risk: "arbitrary trivia" (e.g., low-frequency obscure spellings); keep to high-frequency school register. Cognitive: R1–R3.
- **F8 — purpose**: lexical knowledge usable in context. Patterns: meaning-in-context (L) and contextual synonym/antonym replacement; imbuhan as meaning-derivation in context (C/M). Risk: bare single-word recall (weak evidence, answerable by memorized lists). Stimulus: sentence context RECOMMENDED, never required passage. Cognitive: R2 primarily, R1 acceptable only as a minority.

### Family → theme matrix

| Theme → | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 SPOK · 3 Kalimat · 17 Kalimat Efektif | ● | | | | | | | |
| 6 Paragraf · 7 Ide Pokok · 8 Gagasan Utama · 9 Simpulan | | ● | | | | | | |
| 18,19,20,33,34,35,36,37,38,39,40,41,42,43 | | | ● | | | | | |
| 25,26,27,28,29,30,31,32 | | | | ● | | | | |
| 4,21,22,23,24 | | | | | ● | | | |
| 44,45,46,47,48,49,50 | | | | | | ● | | |
| 12,13,14,15,16 | | | | | | | ● | |
| 2,5,10,11 | | | | | | | | ● |

---

## 2. Item allocation model — explicitly replacing 50 × 30 = 1,500

The 30-per-theme figure was generator arithmetic, not an assessment decision. It is **rejected**. Allocation is driven by evidence-cell value, curriculum ubiquity, and diagnostic weight. Volume is **per evidence cell per grade band**; a theme label may share cells with an overlapping theme (see §5), which lowers *effective* item need.

Bands by priority:

| Priority | Themes | MVP/theme | Mature/theme | Diagnostic-ready/theme | Rationale |
|---|---|--:|--:|--:|---|
| **P0** | 10 | 12 | 30 | 10 | Highest learner/diagnostic value, curriculum-ubiquitous; full stimulus engineering justified. |
| **P1** | 18 | 10 | 24 | 8 | High curriculum value; medium evidence density. |
| **P2** | 17 | 8 | 18 | 6 | Specialized/literary/functional; evidence valuable but narrower. |
| **P3** | 5 | 6 | 12 | 4 | Small-form/long-tail; deliberately modest banks. |

**Bank totals (deliberately ≠ 1,500):**

| Metric | Count |
|---|---:|
| **MVP production bank** (launch floor, all 50 themes) | **466** |
| **Mature bank** (2+ years, post-calibration growth) | **1,098** |
| **Diagnostic-ready subset** (calibrated, evidence-mapped, adaptive-eligible) | **366** |

Rationale: 1,098 mature items across 50 themes ≈ 22/theme average — fewer than the old 30 but each a gated, evidence-bearing item; the diagnostic pool (366) is roughly a third of mature, matching the finding that only reading/grammar-application/vocabulary-in-context themes carry strong single-item diagnostic evidence. MVP 466 keeps every theme launchable (≥6 items) while P0 themes carry the product's diagnostic weight.

Per-theme figures appear in every blueprint card (§6) and in the canonical master table (§9).

---

## 3. Practice / Achievement / Diagnostic / Adaptive suitability

Legend per purpose: **PRIMARY** (designed for it) · **SECONDARY** (usable with weaker evidence) · **NOT RECOMMENDED** (evidence too weak or format unsuitable). Defaults by family; exceptions noted in individual cards (§6).

| Family | Practice | Achievement | Diagnostic | Adaptive |
|---|:-:|:-:|:-:|:-:|
| F1 Sintaksis & Kalimat Efektif | PRIMARY | PRIMARY | SECONDARY–PRIMARY (R3 editing items diagnose writing-mechanics) | SECONDARY |
| F2 Ide & Struktur Wacana | PRIMARY | PRIMARY | **PRIMARY** | **PRIMARY** |
| F3 Jenis Teks Nonfiksi | PRIMARY | PRIMARY | PRIMARY (genre core cells) | PRIMARY (core genres only) |
| F4 Prosa Fiksi & Narasi | PRIMARY | PRIMARY | SECONDARY (narrative comprehension; interpretation needs care) | SECONDARY |
| F5 Puisi & Figuratif | PRIMARY | PRIMARY | SECONDARY (interpretation items weak for routing until calibrated) | NOT RECOMMENDED at MVP |
| F6 Teks Fungsional | PRIMARY | PRIMARY | SECONDARY | NOT RECOMMENDED at MVP |
| F7 Ejaan & Bentuk Baku | PRIMARY | PRIMARY | SECONDARY (error-detection items) | SECONDARY |
| F8 Kosakata & Morfologi | PRIMARY | PRIMARY | SECONDARY (weak alone; supports vocabulary evidence cell) | SECONDARY |

Reuse rule (Quality Standard integration): items are tagged `assessment_purpose` at authoring and locked at PUBLISH under the **conjunctive publish rule** (Quality Standard §4.4, S2): no hard-fail < 2, all scored ≥ 2, **D10 in an explicit valid state — never calibration-exempt** (§4.9), human APPROVED, purpose gates passed. DIAGNOSTIC/ADAPTIVE eligibility additionally requires purpose ≥ ASSESSMENT, evidence-target review, D10 state ≥ `REVIEWED` (DIAGNOSTIC) or `EMPIRICALLY_SUPPORTED` for misconception-routed behavior (ADAPTIVE), and calibration LEVEL ≥ 1 (Quality Standard §4.9; Validation Spec §10). Practice items may flow *up* to assessment; calibrated items may flow *down* to practice; the reverse (practice → diagnostic) is **blocked** without full re-gating.

---

## 4. Theme dependencies, overlap control, and differentiation

No merging or renaming — these are design rules that stop 50 labels becoming 50 copies of one question.

| Dependency pair | Overlap risk | Differentiation rule | Reuse opportunity | Diagnostic distinction |
|---|---|---|---|---|
| Ide Pokok ↔ Gagasan Utama | Near-synonyms | Ide Pokok = main idea of a *paragraph*; Gagasan Utama = central idea of a *longer text*; stimulus length differs (1 ¶ vs multi-¶). | Same evidence cell `READING_IDE_POKOK`; one shared calibrated pool, topic label per item. | Both estimate the same reading subskill — never count as two skills. |
| Paragraf ↔ Simpulan / Ide Pokok | Concluding-idea blur | Simpulan = defensible conclusion drawn *across* the text (not restated); Ide Pokok = stated/locatable idea. | Simpulan items may reuse Paragraf stimuli. | Simpulan = R4 evidence; Ide Pokok = R2–R3 evidence. |
| Sinonim ↔ Antonim ↔ Makna Kata | Lexical recall blur | Meaning-in-context for all three; Sinonim/Antonim = one evidence cell `VOCABULARY_SINONIM_ANTONIM`, Makna Kata = `VOCABULARY_MAKNA_KATA`/in-context cell. | Shared sentence stimuli. | Vocabulary is weak per-item; evidence accumulates over 3–5 items. |
| Kata Baku ↔ PUEBI ↔ Ejaan ↔ Tanda Baca | Error-detection overlap | Kata Baku = word-form choice; Ejaan/PUEBI = sentence-level spelling+capitalization; Tanda Baca = punctuation-specific. Assign each item one error class. | Shared editing scaffolds (D/M archetypes). | Distinguish *recognize* (R1) from *repair* (R3) items across these themes. |
| Artikel ↔ Teks Berita | Informational blur | Artikel = opinion/informative magazine-style; Berita = news report (5W+1H, headline, lead). | Shared news-style stimuli where genre-neutral. | Berita = structure + fakta/opini cells; Artikel = purpose + organization cells. |
| Editorial ↔ Teks Editorial ↔ Teks Argumentasi ↔ Teks Persuasi | Argument blur | Editorial = newspaper opinion (public-issue); Argumentasi = general reasoned text; Persuasi = appeal-oriented; Teks Editorial = the genre-form variant of Editorial. Differentiate by *dominant move* (positioning vs reasoning vs appeal). | Shared argument-evidence cell; same stimuli may serve Argumentasi and Editorial questions if the genre frame is neutral. | One argumentation ability estimate; topic labels are presentation, not separate skills. |
| Cerpen ↔ Novel ↔ Teks Narasi ↔ Cerita Inspiratif | Narrative blur | Cerpen/Novel = fiction craft; Narasi = generic narrative (may be non-fiction); Cerita Inspiratif = didactic inspiration narrative. | Shared narrative-element evidence cell `LITERATURE_UNSUR_CERITA`. | Unsur cerita evidence is shared; genre-specific structure questions differ. |
| Resensi ↔ Teks Ulasan | Review blur | Teks Ulasan = general review (book/film/work); Resensi = book review specifically, with formal structure. | Shared evaluation-evidence cell. | Evaluation items are SECONDARY for diagnostic until calibrated. |
| Puisi ↔ Majas ↔ Pantun/Syair/Gurindam | Figurative overlap | Majas = figurative device in any context; Puisi = whole-poem meaning; Pantun/Syair/Gurindam = fixed-form poetry. | One figurative-language cell `LITERATURE_GAYA_BAHASA`. | Interpretation items NOT RECOMMENDED for adaptive at MVP. |
| SPOK ↔ Kalimat ↔ Kalimat Efektif | Sentence-analysis blur | SPOK = clause-function ID; Kalimat = sentence-type classification (current theme intent); Kalimat Efektif = well-formedness/editing. | Shared sentence stimuli. | Editing (R3) items are the diagnostic carriers; function-ID is weak alone. |
| Proposal ↔ Pidato ↔ Surat Dinas (functional set) | Format-trivia risk | All functional: ask *purpose/audience/effect*, not format-name recall. | Shared functional-text evidence cell (F6). | SECONDARY diagnostic until pilot. |

---

## 5. Quality-standard theme application rules (no copy-paste of the standard)

Every theme inherits `QUESTION_BANK_QUALITY_STANDARD.md` in full. These rules are theme-specific sharpenings:

| Theme group | General rule → theme application |
|---|---|
| All reading themes (F2/F3/F4/F5) | "Stimulus when construct requires it" → stimulus is **REQUIRED**; item must be unanswerable without it (Phase 1B TB1/TB2 checks); inference/vocabulary-in-context items must not be answerable from outside knowledge. |
| Literary interpretation (F4/F5) | "Single-best-answer" → the key must rest on *textual evidence*; subjective interpretation is a HARD-FAIL trigger (Quality Standard D5/D7). |
| Ejaan/Kata Baku (F7) | "Duplicate option" rule relaxes only for spelling-construct items (SPELLING_TYPES carve-out, `content-validation.ts`) — near-identical spellings are intentional; identical *meanings* still fail. |
| Vocabulary (F8) | "No meaningless distractors" → distractors are *semantic neighbors*, not the audit's filler phrases; single-word keys allowed (vocabulary carve-out) but context sentence required ≥ 80% of items. |
| Ulasan/Resensi/Editorial (F3 evaluation) | "Content correctness" → evaluation keys are defensible only against the stimulus's own standards/argument, never reviewer taste; D1 review includes "is the evaluation claim supportable from the text?" |
| Functional (F6) | "No arbitrary trivia" → function-over-form; format knowledge only where it changes meaning/effectiveness. |
| Syair/Hikayat/Mitos (F5/F4) | "No unsupported factual claims" + D13 → archaic diction and cultural content must be glossed or grade-controlled; no folklore "facts" asserted as truth. |

## Validation & DNA integration (theme-level)

- **Validation Spec**: all themes pass stages 0–11 identically; family emphasis differs — F2/F3 emphasize stages 3+8 (pedagogical + cognitive/difficulty, because distractor *plausibility of alternative main ideas* is the craft); F4/F5 emphasize stage 9 (human review of interpretation keys) plus the **testlet rule** (shared stimuli = one evidence unit); F7 emphasizes stage 6 (near-identical spelling options vs semantic duplicates); F8 emphasizes stage 3 (context requirement) and stage 7 (semantic duplicate of the same word pair reused across contexts is legitimate).
- **ITEM DNA**: per-theme importance varies — reading themes: `stimulus`, `evidence_target`, `curriculum_mapping` (elemen Membaca) are load-bearing; F7/F8: `distractor_rationale` (why the wrong spelling/word is tempting) and `misconception_target` (theoretical) are load-bearing; all themes: `assessment_purpose` + `provenance` are mandatory at authoring. No schema change.

---

## 6. Per-theme blueprint cards (50)

Cards encode: identity A · skills B · relevance C · cognitive D · archetypes E · stimulus F · misconceptions G (all THEORETICAL — none empirically validated yet) · difficulty H · diagnostic evidence I · volume J · priority K · complexity L · quality risks M · suitability (Practice/Achievement/Diagnostic/Adaptive). Curriculum elemen refer to CP Bahasa Indonesia [S1]; TKA/UKBI relevance is INTERNAL / RESEARCH-INFORMED unless stated — **no SNPMB or UKBI equivalence is claimed** (bibliography P4/P6).

### F1 — Sintaksis & Kalimat Efektif

#### 1. SPOK
- **Construct**: fungsi klausa (S–P–O–K) dalam kalimat bahasa Indonesia. **Must NOT become**: pengenalan istilah atau tebak-posisi tanpa analisis kalimat.
- **Skills**: GRAMMAR (primary). *Gap flagged*: taxonomy tidak punya subskill sintaksis (SPOK/Kalimat) — usul `GRAMMAR_SINTAKSIS`; jangan pakai subskill lain sebagai pengganti.
- **Relevance**: Kur — elemen Menulis (kalimat efektif) [S1]; TKA — INTERNAL medium (komponen bahasa); UKBI — analog seksi II (Merespons Kaidah), RESEARCH-INFORMED.
- **Cognitive**: R3 primary, R2 secondary; R1 (istilah) tidak boleh dominan.
- **Archetypes**: C (analisis fungsi pada kalimat 1–2 klausa); M (identifikasi unsur salah/hilang).
- **Stimulus**: kalimat konteks (10–25 kata) — REQUIRED; dua klausa untuk tingkat R3.
- **Misconceptions** (teoretis): “subjek = kata pertama”; “kata kerja = predikat”; objek vs pelengkap tertukar.
- **Difficulty**: mudah = kalimat tunggal jelas; sedang = 2 klausa berfrasa; sulit = pelengkap/keterangan ambigu. Fake-difficulty: kosakata sulit, kalimat sintaksis kacau (bukan konstruk).
- **Diagnostic evidence**: pola-ID lemah; R3 moderate; JANGAN simpulkan kemampuan menulis dari satu item SPOK.
- **Volume**: MVP 10 · mature 24 · diag 8. **Priority P1** · **Complexity MEDIUM**.
- **Quality risks**: definisi-trivia; dua-analisis-benar (kunci harus tunggal per stimulus); kontaminasi kosakata.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 3. Kalimat
- **Construct**: jenis kalimat (deklaratif/interogatif/imperatif/eksklamatif) dan fungsi komunikatifnya. **Must NOT become**: klasifikasi bentuk tanpa fungsi.
- **Skills**: GRAMMAR (primary). *Gap*: subskill jenis-kalimat belum ada (dapat masuk `GRAMMAR_SINTAKSIS`).
- **Relevance**: Kur — elemen Menulis/Membaca [S1]; TKA — INTERNAL low–medium; UKBI — analog seksi II (RESEARCH-INFORMED).
- **Cognitive**: R2 primary; R3 (fungsi dalam konteks dialog) secondary.
- **Archetypes**: C (tentukan jenis + fungsi dalam dialog singkat); K (urutan kalimat berdialog).
- **Stimulus**: kalimat atau dialog 2–3 ujaran — REQUIRED context.
- **Misconceptions** (teoretis): interogatif selalu butuh tanda tanya tertulis; imperatif = perintah kasar.
- **Difficulty**: mudah = jenis tunggal; sedang = fungsi tersirat; sulit = jenis ganda/ironi. Fake: kosakata tinggi.
- **Diagnostic evidence**: lemah–moderate; hanya berdialog (R3) yang membawa muatan.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM**.
- **Quality risks**: ambiguitas fungsi (dua jenis mungkin); stimulus terlalu pendek hingga tidak butuh dibaca.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 17. Kalimat Efektif
- **Construct**: kemampuan menyunting kalimat agar efektif (kehematan, kesejajaran, kejelasan, kevariasian) — P0 karena ini pembuktian menulis paling terukur.
- **Skills**: GRAMMAR_KALIMAT_EFEKTIF (primary) + WRITING_KALIMAT_EFEKTIF_DALAM_TULISAN (secondary — item “perbaiki kalimat dalam paragraf”).
- **Relevance**: Kur — elemen Menulis (inti) [S1]; TKA — INTERNAL high (komponen bahasa); UKBI — analog seksi II (RESEARCH-INFORMED).
- **Cognitive**: R3 primary (perbaiki), R4 secondary (pilih kalimat paling efektif dari varian).
- **Archetypes**: D (revisi kalimat); M (diagnosis error: boros/kacau/tidak sejajar); K (urutan efektif).
- **Stimulus**: kalimat atau paragraf pendek berisi 1 jenis kelemahan — REQUIRED.
- **Misconceptions** (teoretis): kalimat panjang = kalimat efektif; pengulangan kata = penekanan sah selalu.
- **Difficulty**: mudah = redundansi jelas; sedang = kesejajaran; sulit = dua kelemahan tumpang tindih. Fake: istilah gramatika asing.
- **Diagnostic evidence**: **moderate–strong** (R3/R4 menulis) — kandidat cell kalibrasi.
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: dua jawaban perbaikan sama-sama benar (butuh kunci + penjelasan yang menegaskan 1); “trick wording”.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive SECONDARY.

### F2 — Ide & Struktur Wacana

#### 7. Ide Pokok
- **Construct**: menemukan ide pokok paragraf dengan bukti teks. **Must NOT become**: cocokkan kata kunci tanpa membaca.
- **Skills**: READING_IDE_POKOK (primary); READING_INFORMASI_TERSURAT (dukung).
- **Relevance**: Kur — elemen Membaca [S1] (inti kurikulum); TKA — INTERNAL high (literasi); UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R2–R3 (paragraf tunggal); R4 hanya bila ide harus disimpulkan lintas paragraf.
- **Archetypes**: A (paragraf + pilih ide pokok); K (kalimat utama vs penjelas).
- **Stimulus**: 1–3 paragraf (60–180 kata SMP / 100–250 SMA) — REQUIRED.
- **Misconceptions** (teoretis): ide pokok = kalimat pertama; ide pokok = topik (subjek) bukan klaim.
- **Difficulty**: mudah = kalimat utama eksplisit; sedang = ide tersebar; sulit = ide pokok vs ide penjelas yang sangat mirip. Fake: panjang teks, kosakata.
- **Diagnostic evidence**: **strong** — item pembeda kemampuan membaca inti.
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: distraktor = klaim benar-tapi-bukan-utama (seni utama tema ini); stimulus tumpang tindih dengan Gagasan Utama/Paragraf (lihat §4).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 8. Gagasan Utama
- **Construct**: gagasan utama teks utuh (multi-paragraf). **Must NOT become**: duplikat Ide Pokok dengan stimulus sama.
- **Skills**: READING_IDE_POKOK (cell sama dengan Ide Pokok — §4 differentiation: panjang teks).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL high; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R3–R4 (integrasi lintas paragraf).
- **Archetypes**: A (teks 2–4 paragraf + gagasan utama); B (dukung dengan bukti).
- **Stimulus**: teks 100–300 kata — REQUIRED; item boleh berbagi stimulus dgn Ide Pokok bila selisih tugas jelas.
- **Misconceptions** (teoretis): gagasan utama = ringkasan; gagasan utama = topik umum.
- **Difficulty**: mudah = gagasan dinyatakan di awal; sulit = implisit lintas paragraf. Fake: kosakata.
- **Diagnostic evidence**: **strong** (R3–R4).
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: sama dgn Ide Pokok (redundansi); tes kosakata tersamar.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 9. Simpulan
- **Construct**: menarik simpulan yang *dipertanggungjawabkan teks* (bukan restatement, bukan opini luar). **Must NOT become**: ide pokok dengan nama lain.
- **Skills**: READING (primary); *gap flagged*: belum ada subskill simpulan/inferensi-klaim (usul `READING_SIMPULAN` atau eksplisitkan di READING_INFERENSI).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL high; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R4 primary; R3 (simpulan lokal) secondary.
- **Archetypes**: A/K (teks + simpulan paling didukung); B (mana simpulan yang *tidak* didukung teks).
- **Stimulus**: teks 80–250 kata dengan simpulan non-trivial — REQUIRED.
- **Misconceptions** (teoretis): simpulan = opini pembaca; simpulan = kalimat terakhir; menarik simpulan dari pengetahuan luar.
- **Difficulty**: mudah = simpulan dekat; sulit = dua simpulan masuk akal, satu lebih didukung. Fake: ambiguitas teks (stimulus harus bersih).
- **Diagnostic evidence**: **strong** (kemampuan menarik klaim berbasis bukti).
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: kunci tidak tunggal (butuh dua reviewer); kontaminasi pengetahuan luar.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 6. Paragraf
- **Construct**: struktur & kohesi paragraf (kalimat utama/penjelas, penanda kohesi, urutan). **Must NOT become**: ide-pokok kedua.
- **Skills**: READING_STRUKTUR_TEKS (primary) + WRITING_ORGANISASI_GAGASAN (dukung).
- **Relevance**: Kur — elemen Menulis/Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R3 primary (struktur & kohesi), R2 secondary.
- **Archetypes**: K (susun kalimat acak jadi paragraf koheren); M (tunjukkan kalimat sumbang); C (fungsi kalimat dalam paragraf).
- **Stimulus**: paragraf utuh atau set kalimat acak — REQUIRED.
- **Misconceptions** (teoretis): kalimat pertama selalu kalimat utama; konjungsi = kohesi otomatis.
- **Difficulty**: mudah = kalimat sumbang jelas; sulit = urutan dengan dua penataan masuk akal. Fake: istilah linguistik.
- **Diagnostic evidence**: moderate (struktur wacana); cell bersama Struktur Teks.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM**.
- **Quality risks**: tumpang tindih Ide Pokok (differentiasi §4); urutan ambigu (kunci ganda).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY–PRIMARY · Adaptive SECONDARY.

### F3 — Jenis Teks Nonfiksi (informasi & argumentasi)

#### 41. Teks Berita
> **First pilot theme** — full pilot specification in §7 below (this card is the summary view).
- **Construct**: memahami berita sebagai genre: informasi eksplisit (5W+1H), struktur (headline–lead–body), fakta/opini, gagasan, kosakata-dalam-konteks, evaluasi.
- **Must NOT become**: tes pengetahuan peristiwa aktual atau kosakata jurnalistik.
- **Skills**: READING (INFORMASI_TERSURAT, STRUKTUR_TEKS, INFERENSI); *gap*: fakta/opini belum punya subskill (usul `READING_FAKTA_OPINI` atau setrum melalui INFERENSI/EVALUASI).
- **Relevance**: Kur — elemen Membaca, teks berita lintas fase [S1]; TKA — INTERNAL high (literasi); UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R2 25% · R3 25% · R4 35% · R5 15% (target pilot).
- **Archetypes**: A (5W+1H/eksplisit), A-R4 (gagasan/inferensi), I (fakta/opini), H (struktur & judul), L (kosakata dalam konteks), B (evaluasi ringan).
- **Stimulus**: teks berita asli/diadaptasi 75–200 kata (SMP) / 100–250 (SMA), 1 stimulus: 2–4 item (testlet = 1 evidence unit) — REQUIRED.
- **Misconceptions** (teoretis): semua kalimat berita = fakta; lead = kesimpulan; opini hanya bila memakai kata “menurut”.
- **Difficulty**: mudah = 5W+1H tersurat; sedang = struktur/gagasan; sulit = inferensi + fakta/opini halus. Fake: peristiwa asing, kosakata langka.
- **Diagnostic evidence**: **strong** — pengukur literasi genre paling padat per item.
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **MEDIUM** (stimulus otentik tersedia).
- **Quality risks**: kontaminasi pengetahuan luar (item harus terjawab dari teks); kebaruan peristiwa basi; bias pemberitaan (D13).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 19. Editorial
- **Construct**: memahami teks opini media: posisi penulis, argumen, fakta/opini, struktur. **Must NOT become**: tes opini pribadi pembaca.
- **Skills**: READING (primary, ide/inferensi/struktur); *gap*: evaluasi argumen belum punya subskill (lihat READING_FAKTA_OPINI).
- **Relevance**: Kur — elemen Membaca fase F [S1]; TKA — INTERNAL high (literasi argumen); UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R3–R5 (positioning, fakta/opini, evaluasi).
- **Archetypes**: I (klaim–bukti), B (evaluasi dukungan), A (gagasan).
- **Stimulus**: editorial asli/diadaptasi 150–300 kata — REQUIRED.
- **Misconceptions** (teoretis): opini = salah; “menurut penulis” saja = opini; bukti anekdot = bukti kuat.
- **Difficulty**: mudah = posisi eksplisit; sulit = mengenali bukti lemah. Fake: isu aktual (item harus time-independent).
- **Diagnostic evidence**: **strong** untuk argumentasi (R4–R5).
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: basi karena isu aktual; kunci evaluasi subjektif; kontaminasi pengetahuan politik.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 37. Teks Eksplanasi
- **Construct**: memahami teks sebab-akibat: struktur (pernyataan umum–deretan penjelas–interpretasi), hubungan kausal, kohesi. **Must NOT become**: tes pengetahuan sains.
- **Skills**: READING (STRUKTUR_TEKS, INFERENSI, IDE_POKOK).
- **Relevance**: Kur — elemen Membaca, teks eksplanasi [S1]; TKA — INTERNAL high; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R2–R4 (kausalitas = R4).
- **Archetypes**: A (struktur & gagasan), I (sebab-akibat), K (urutan proses).
- **Stimulus**: teks eksplanasi (proses alam/sosial) 100–250 kata — REQUIRED; konten sains harus dikontrol kebenarannya (D1).
- **Misconceptions** (teoretis): kronologi = kausalitas; pernyataan umum = simpulan.
- **Difficulty**: mudah = urutan; sedang = sebab-akibat langsung; sulit = kausalitas bertingkat. Fake: terminologi ilmiah.
- **Diagnostic evidence**: **strong** (struktur + kausalitas = inti membaca informatif).
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: fakta sains salah (wajib verifikasi); item membaca jadi item IPA.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 39. Teks Argumentasi
- **Construct**: memahami argumen: tesis, alasan, bukti, sanggahan, simpulan. **Must NOT become**: tes retorika kosong.
- **Skills**: READING (primary); gap evaluasi-argumen (lihat 19).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL high; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R4–R5 (menilai kekuatan argumen), R3 secondary.
- **Archetypes**: I (klaim–bukti–simpulan), B (evaluasi), A (gagasan utama argumen).
- **Stimulus**: teks argumentatif 120–280 kata — REQUIRED.
- **Misconceptions** (teoretis): banyak alasan = argumen kuat; serangan pribadi = bukti; simpulan penulis = kebenaran umum.
- **Difficulty**: mudah = temukan tesis; sulit = deteksi bukti lemah/fallacy. Fake: isu kontroversial (pilih isu netral).
- **Diagnostic evidence**: **strong**.
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **HIGH**.
- **Quality risks**: kunci evaluasi subjektif; bias isu; distraktor “benar secara umum tapi tidak didukung teks”.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive PRIMARY.

#### 18. Artikel
- **Construct**: memahami artikel informatif/opini non-berita: tujuan, organisasi, informasi. **Must NOT become**: berita kedua.
- **Skills**: READING (IDE_POKOK, STRUKTUR_TEKS, INFORMASI_TERSURAT).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium-high; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R2–R4.
- **Archetypes**: A (gagasan/isi), H (tujuan/judul), I (bila argumentatif).
- **Stimulus**: artikel majalah/laman (non-aktual agar awet) 100–250 kata — REQUIRED.
- **Misconceptions** (teoretis): tujuan artikel = memberitakan (bukan genre).
- **Difficulty**: mudah = isi tersurat; sulit = simpulan/organisasi. Fake: isu basi.
- **Diagnostic evidence**: moderate–strong.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM–HIGH**.
- **Quality risks**: overlap Berita/Editorial (§4); stimulus menua.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY–PRIMARY · Adaptive SECONDARY.

#### 20. Teks Editorial
- **Construct**: sama dgn Editorial sebagai *bentuk genre* (struktur baku teks editorial dalam kurikulum). **Must NOT become**: duplikat buta Editorial.
- **Skills**: READING (STRUKTUR_TEKS, IDE_POKOK, INFERENSI).
- **Relevance**: Kur — elemen Membaca [S1]; TKA/UKBI: INTERNAL/analog sama dgn 19.
- **Cognitive**: R3–R5.
- **Archetypes**: I + A (struktur & isi), H (fungsi bagian).
- **Stimulus**: teks editorial bentuk-baku 120–250 kata — REQUIRED.
- **Misconceptions** (teoretis): struktur = template hafalan (tanyakan fungsi, bukan nama bagian).
- **Difficulty**: seperti Editorial; porsi struktur lebih besar.
- **Diagnostic evidence**: moderate–strong (bagian struktur bersama Eksposisi/Argumentasi).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH**.
- **Quality risks**: sama 19 + hafalan-struktur; bedakan tegas dari 19 di stimulus & sel (dgn §4: Editorial=posisi vs Teks Editorial=bentuk).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 33. Anekdot
- **Construct**: memahami teks humor-kritik: struktur (abstraksi–orientasi–krisis–reaksi–koda), kritik sosial tersirat, ironi. **Must NOT become**: tes “apakah lucu”.
- **Skills**: READING (STRUKTUR_TEKS, INFERENSI).
- **Relevance**: Kur — elemen Membaca, anekdot di fase D [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R3–R4 (kritik tersirat = inferensi).
- **Archetypes**: A (struktur), B (kritik yang didukung teks).
- **Stimulus**: anekdot otentik-gaya 60–150 kata — REQUIRED.
- **Misconceptions** (teoretis): anekdot = cerita lucu biasa (tanpa kritik); krisis = klimaks.
- **Difficulty**: sedang–sulit (ironi); Fake: humor yang tidak dapat dinilai (pilih kritik yang tekstual).
- **Diagnostic evidence**: moderate (inferensi kritik).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH** (nada humor sulit dijamin objektif).
- **Quality risks**: dua tafsir kritik; lelucon basi/kultural (D13).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 34. Teks Deskripsi
- **Construct**: memahami deskripsi (objek, kesan, pola spasial/objektif–subjektif, kalimat rincian). **Must NOT become**: tes kosakata sifat.
- **Skills**: READING (INFORMASI_TERSURAT, STRUKTUR_TEKS).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R2–R3.
- **Archetypes**: A (objek/isi), H (tujuan melukiskan), M (kalimat rincian yang tidak sesuai).
- **Stimulus**: paragraf deskripsi 60–150 kata — REQUIRED.
- **Misconceptions** (teoretis): deskripsi = semua kata sifat; pola spasial = urutan waktu.
- **Difficulty**: mudah = objek tersurat; sulit = kesan/dominasi pola. Fake: kosakata inderawi langka.
- **Diagnostic evidence**: moderate (R2 solid, R3 sedang).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM**.
- **Quality risks**: stimulus jadi puisi-prosa (kabur genre); subjektivitas kesan.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 36. Teks Eksposisi
- **Construct**: memahami paparan: tesis, argumen penjelas, struktur. **Must NOT become**: argumen kedua (bedakan: eksposisi = memaparkan, argumentasi = meyakinkan).
- **Skills**: READING (IDE_POKOK, STRUKTUR_TEKS).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium-high; UKBI — analog seksi III.
- **Cognitive**: R2–R4.
- **Archetypes**: A (isi), I (hubungan gagasan).
- **Stimulus**: teks eksposisi 100–220 kata — REQUIRED.
- **Misconceptions** (teoretis): eksposisi = opini; tesis = simpulan.
- **Difficulty**: mudah = temukan tesis; sulit = bedakan eksposisi/argumentasi dalam fungsi. Fake: isu hangat.
- **Diagnostic evidence**: moderate–strong.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH**.
- **Quality risks**: overlap Argumentasi/Editorial (§4) — kunci pada sel fungsi-eksposisi, bukan isi.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 38. Teks Persuasi
- **Construct**: memahami bujukan: daya tarik, sarana persuasi, struktur. **Must NOT become**: tes etika isi iklan/poster.
- **Skills**: READING (INFERENSI, STRUKTUR_TEKS).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R3–R4 (deteksi sarana persuasi).
- **Archetypes**: I (klaim-bujukan), H (tujuan), B (evaluasi daya tarik).
- **Stimulus**: teks persuasif 80–200 kata (pidato/ajakan) — REQUIRED.
- **Misconceptions** (teoretis): emosi = manipulasi selalu; fakta di teks persuasif = pasti netral.
- **Difficulty**: sedang–sulit. Fake: retorika bermuatan.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH**.
- **Quality risks**: overlap Pidato/Argumentasi (§4); materi sensitif ajakan.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 40. Teks Prosedur
- **Construct**: memahami instruksi: urutan, verba imperatif, konjungsi temporal, kelengkapan langkah. **Must NOT become**: tes pengetahuan cara melakukan sesuatu.
- **Skills**: READING (STRUKTUR_TEKS, INFORMASI_TERSURAT).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R2–R3 (R3: deteksi langkah hilang/salah urut).
- **Archetypes**: H (urutan/instruksi), M (langkah cacat), J (bila ada tabel).
- **Stimulus**: prosedur 60–180 kata, opsional langkah bernomor — REQUIRED.
- **Misconceptions** (teoretis): urutan tidak penting asal lengkap; imperatif = sopan-santun rendah.
- **Difficulty**: mudah = langkah eksplisit; sulit = langkah implisit/tidak urut. Fake: prosedur teknis asing.
- **Diagnostic evidence**: moderate (R2–R3 kuat).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM**.
- **Quality risks**: teks prosedur basi/teknis; ambiguitas langkah.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 42. Teks Ulasan
- **Construct**: memahami ulasan karya: orientasi, tafsiran, evaluasi, rangkuman; membedakan deskripsi dan penilaian. **Must NOT become**: setuju/tidak setuju dengan reviewer.
- **Skills**: READING (primary); gap evaluasi (lihat 19).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium-high; UKBI — analog seksi III.
- **Cognitive**: R3–R5 (evaluasi = R5 dibatasi dukungan teks).
- **Archetypes**: B (evaluasi berbasis teks), A (isi ulasan).
- **Stimulus**: ulasan buku/film singkat 100–220 kata (karya boleh fiktif) — REQUIRED.
- **Misconceptions** (teoretis): ulasan = ringkasan; kritik = tidak suka.
- **Difficulty**: mudah = identifikasi bagian; sulit = nilai dukungan evaluasi. Fake: pengetahuan karya asli.
- **Diagnostic evidence**: moderate (R5 lemah sampai dikalibrasi).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH**.
- **Quality risks**: item butuh pengetahuan karya → stimulus harus berdiri sendiri; subjektivitas evaluasi.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 43. Resensi
- **Construct**: memahami resensi buku: identitas, struktur, kelebihan/kelemahan. **Must NOT become**: ulasan umum (differentiasi §4).
- **Skills**: READING (STRUKTUR_TEKS, IDE_POKOK, INFERENSI).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R2–R4.
- **Archetypes**: B (evaluasi), H (identitas/struktur resensi).
- **Stimulus**: resensi buku 120–250 kata — REQUIRED (buku boleh fiktif agar mandiri).
- **Misconceptions** (teoretis): resensi = sinopsis.
- **Difficulty**: sedang–sulit.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH**.
- **Quality risks**: overlap Ulasan; hafalan struktur.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 35. Teks Narasi
- **Construct**: memahami narasi generik (orientasi–komplikasi–resolusi), termasuk nonfiksi. **Must NOT become**: Cerpen tanpa sastra (differentiasi §4).
- **Skills**: READING (STRUKTUR_TEKS, INFERENSI).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R2–R4.
- **Archetypes**: A (alur/struktur), K (urutan peristiwa).
- **Stimulus**: narasi 80–200 kata — REQUIRED.
- **Misconceptions** (teoretis): komplikasi = konflik tokoh fiksi selalu (narasi nonfiksi punya komplikasi peristiwa).
- **Difficulty**: mudah = urutan; sulit = inferensi motif. Fake: panjang.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: overlap Cerpen/Cerita Inspiratif (§4).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

### F4 — Prosa Fiksi & Narasi

#### 25. Cerpen
- **Construct**: memahami cerpen: unsur (latar, tokoh/penokohan, alur, konflik, sudut pandang, amanat) dengan bukti teks. **Must NOT become**: hafalan istilah unsur; tebak amanat.
- **Skills**: LITERATURE_UNSUR_CERITA (primary), LITERATURE_MAKNA_SASTRA (secondary).
- **Relevance**: Kur — elemen Membaca (sastra) [S1]; TKA — INTERNAL medium; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R2–R4 (konflik/inferensi karakter = R4).
- **Archetypes**: F (kutipan cerpen + unsur), A-R4 (motivasi/konflik dengan dua bukti), B (amanat yang didukung).
- **Stimulus**: cerpen otentik/gubahan 150–350 kata (dapat dipotong utuh) — REQUIRED.
- **Misconceptions** (teoretis): amanat = pesan umum pembaca; protagonis = tokoh baik; latar = hanya tempat.
- **Difficulty**: mudah = unsur tersurat; sulit = inferensi karakter/amanat. Fake: kosakata sastra langka.
- **Diagnostic evidence**: moderate–strong (komprehensi naratif).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH** (perlu stimulus asli/gubahan orisinal).
- **Quality risks**: amanat subjektif (kunci harus tekstual); hak cipta stimulus (tulis asli/gubahan).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 26. Novel
- **Construct**: memahami novel lewat kutipan bab: penokohan, konflik, alur, tema. **Must NOT become**: pengetahuan isi novel populer.
- **Skills**: LITERATURE_UNSUR_CERITA (primary).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R3–R4.
- **Archetypes**: F (kutipan 120–250 kata), A-R4 (inferensi dari dua petunjuk).
- **Stimulus**: kutipan novel (asli/gubahan, konteks cukup) — REQUIRED; self-contained.
- **Misconceptions** (teoretis): sama Cerpen; konteks potongan hilang → salah tafsir.
- **Difficulty**: sedang–sulit. Fake: pengetahuan novel asli.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **VERY HIGH** (potongan konteks).
- **Quality risks**: kutipan tanpa konteks; hak cipta.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 27. Drama
- **Construct**: memahami drama dari dialog: karakter/konflik, maksud ujaran, struktur babak/adegan. **Must NOT become**: tes teater umum.
- **Skills**: LITERATURE_UNSUR_CERITA (primary), READING_INFERENSI (dukung).
- **Relevance**: Kur — elemen Membaca (drama) [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R3–R4 (maksud ujaran dari konteks).
- **Archetypes**: F (dialog + inferensi karakter/konflik), C (fungsi ujaran).
- **Stimulus**: petikan drama (dialog + kramagong) 100–220 kata — REQUIRED.
- **Misconceptions** (teoretis): tokoh jahat = antagonis selalu; amanat = salah satu tokoh bicara.
- **Difficulty**: sedang–sulit.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **HIGH**.
- **Quality risks**: dua tafsir maksud ujaran; format petikan membingungkan pembaca muda.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 28. Fabel
- **Construct**: memahami fabel: karakter hewan, konflik, nilai/moral tekstual. **Must NOT become**: pengetahuan moral umum.
- **Skills**: LITERATURE_UNSUR_CERITA (primary).
- **Relevance**: Kur — elemen Membaca fase D [S1]; TKA — INTERNAL low; UKBI — analog seksi III.
- **Cognitive**: R2–R3.
- **Archetypes**: F (cerita + nilai), A (isi).
- **Stimulus**: fabel 100–200 kata — REQUIRED.
- **Misconceptions** (teoretis): moral = pelajaran hidup pembaca (harus dari cerita).
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: moderate (R2 solid).
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: moral klise dapat dijawab tanpa baca → wajib kunci tekstual.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 29. Legenda
- **Construct**: memahami legenda (asal-usul): unsur, nilai budaya, amanat tekstual. **Must NOT become**: tes pengetahuan folklore regional.
- **Skills**: LITERATURE_UNSUR_CERITA (primary).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL low; UKBI — analog seksi III.
- **Cognitive**: R2–R3.
- **Archetypes**: F (teks legenda + unsur/nilai).
- **Stimulus**: legenda (umum, lintas daerah) 100–220 kata — REQUIRED; D13: hindari stereotip daerah.
- **Misconceptions** (teoretis): legenda = fakta sejarah.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: moderate (rendah).
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: asumsi pengetahuan lokal; klaim “asal-usul” sebagai fakta.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 30. Hikayat
- **Construct**: memahami hikayat (prosa Melayu klasik): unsur, nilai, bahasa arkais. **Must NOT become**: tes arti kata Melayu kuno.
- **Skills**: LITERATURE_UNSUR_CERITA (primary), LITERATURE_APRESIASI_KARYA (secondary).
- **Relevance**: Kur — elemen Membaca fase E/F [S1]; TKA — INTERNAL low; UKBI — analog seksi III.
- **Cognitive**: R2–R4.
- **Archetypes**: F (kutipan hikayat dengan glos kata sukar + unsur), A (isi).
- **Stimulus**: kutipan hikayat 80–180 kata **dengan glos kosakata arkais** — REQUIRED.
- **Misconceptions** (teoretis): istana = selalu tokoh utama; hikayat = dongeng biasa.
- **Difficulty**: sedang–sulit (bahasa); Fake: arkaisme tanpa glos (DILARANG).
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **HIGH**.
- **Quality risks**: bahasa arkais jadi dinding (glos wajib); nilai budaya dipaksakan.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 31. Mitos
- **Construct**: memahami mitos (cerita kepercayaan): unsur & fungsi dalam teks. **Must NOT become**: tes kepercayaan/agama.
- **Skills**: LITERATURE_UNSUR_CERITA (primary).
- **Relevance**: Kur — elemen Membaca [S1]; TKA/UKBI — INTERNAL low.
- **Cognitive**: R2–R3.
- **Archetypes**: F (mitos + unsur/isi).
- **Stimulus**: mitos sebagai *teks* 100–200 kata — REQUIRED; D13/D14: netral, tanpa penilaian keyakinan.
- **Misconceptions** (teoretis): mitos = fakta/sains salah (baca sebagai teks budaya).
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: moderate–rendah.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM–HIGH** (sensitivitas budaya).
- **Quality risks**: sensitivitas keyakinan (D13) — hindari mitos bernuansa agama; klaim fakta.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 32. Cerita Inspiratif
- **Construct**: memahami cerita inspiratif: peristiwa, tokoh, nilai/teladan tekstual. **Must NOT become**: cerpen (differentiasi §4) atau khotbah.
- **Skills**: LITERATURE_UNSUR_CERITA (primary), READING_INFERENSI (dukung).
- **Relevance**: Kur — elemen Membaca fase D [S1]; TKA — INTERNAL low-medium; UKBI — analog seksi III.
- **Cognitive**: R2–R3 (R4: teladan tersirat).
- **Archetypes**: F (cerita + teladan/nilai).
- **Stimulus**: cerita inspiratif (tokoh fiktif/netral) 100–220 kata — REQUIRED.
- **Misconceptions** (teoretis): inspirasi = motivasi umum; teladan = siapa pun yang sukses.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: moderate–rendah.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: moral tanpa baca; tokoh nyata (privasi/polemik) → gunakan fiktif.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

### F5 — Puisi & Bahasa Figuratif

#### 21. Puisi
- **Construct**: memahami puisi: diksi, imaji, nada, amanat, bahasa figuratif — interpretasi berlandas teks. **Must NOT become**: hafalan jenis puisi; tebak perasaan.
- **Skills**: LITERATURE_MAKNA_SASTRA (primary), LITERATURE_GAYA_BAHASA (secondary), LITERATURE_APRESIASI_KARYA (dukung).
- **Relevance**: Kur — elemen Membaca (puisi) [S1]; TKA — INTERNAL medium; UKBI — analog seksi III.
- **Cognitive**: R3–R4 (tafsir), R5 hanya dengan dasar tekstual kuat.
- **Archetypes**: G (puisi pendek + diksi/imaji/amanat), L (makna kata simbolis dalam puisi).
- **Stimulus**: puisi utuh (4–16 larik) — REQUIRED.
- **Misconceptions** (teoretis): “aku lirik” = penyair; amanat = pesan moral bebas.
- **Difficulty**: mudah = makna tersurat; sulit = simbol & nada. Fake: puisi sangat abstrak (hindari di MVP).
- **Diagnostic evidence**: moderate (R3–R4) — kalibrasi sebelum adaptive.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **HIGH** (kunci interpretasi harus tekstual).
- **Quality risks**: interpretasi ganda (dua reviewer wajib); kosakata arkais.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 4. Majas
- **Construct**: mengenali & menafsirkan efek bahasa figuratif **dalam konteks**. **Must NOT become**: penamaan perangkat (R1) tanpa efek.
- **Skills**: LITERATURE_GAYA_BAHASA (primary).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL low-medium; UKBI — analog seksi II/III.
- **Cognitive**: R3 primary (efek dalam kalimat), R2 secondary; R1 tidak boleh dominan.
- **Archetypes**: G/C (kalimat/baris + tentukan & jelaskan efek), L (makna kias).
- **Stimulus**: kalimat/baris puisi dengan majas — RECOMMENDED (konteks pendek).
- **Misconceptions** (teoretis): semua perbandingan = simile; personifikasi = benda hidup.
- **Difficulty**: mudah = simile/metafora jelas; sulit = ironi/sarkasme. Fake: istilah majas langka.
- **Diagnostic evidence**: weak–moderate (R1 lemah; R3 efek sedang).
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: item R1-murni (tolak); ambiguitas dua perangkat.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 22. Pantun
- **Construct**: memahami pantun: struktur (sampiran–isi), rima, pesan. **Must NOT become**: hafalan syarat pantun.
- **Skills**: LITERATURE_GAYA_BAHASA (secondary) + READING_MAKNA_KATA; struktur via READING_STRUKTUR_TEKS? (sastra) — gunakan LITERATURE_APRESIASI_KARYA sebagai sel utama.
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL low; UKBI — analog seksi III.
- **Cognitive**: R2–R3 (pesan), R4 (sampiran→isi hubungan).
- **Archetypes**: G (pantun + pesan/rima), M (sampiran tidak padu).
- **Stimulus**: pantun utuh (4 baris) — REQUIRED.
- **Misconceptions** (teoretis): sampiran = harus bermakna; rima a-a-a-a.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: weak–moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: kunci “ketidakpaduan” subjektif; rima baku vs variasi.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 23. Syair
- **Construct**: memahami syair (kuplet naratif 4 larik sejajar): cerita/nasihat, bahasa. **Must NOT become**: puisi dengan nama lain.
- **Skills**: LITERATURE_APRESIASI_KARYA (primary).
- **Relevance**: Kur — elemen Membaca [S1]; TKA/UKBI — INTERNAL low.
- **Cognitive**: R2–R3.
- **Archetypes**: G (syair pendek + isi/nasihat tekstual).
- **Stimulus**: syair 4–8 larik dengan glos — REQUIRED.
- **Misconceptions** (teoretis): syair = pantun panjang.
- **Difficulty**: sedang (bahasa lama). Fake: arkaisme tanpa glos.
- **Diagnostic evidence**: weak–moderate.
- **Volume**: MVP 6 · mature 12 · diag 4. **P3** · **HIGH**.
- **Quality risks**: bahasa arkais; konten nasihat kuno (D13 kontekskan).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 24. Gurindam
- **Construct**: memahami gurindam (sajak dua larik berisi nasihat): pesan, hubungan larik. **Must NOT become**: tebak nasihat umum.
- **Skills**: LITERATURE_APRESIASI_KARYA (primary).
- **Relevance**: Kur — elemen Membaca [S1]; TKA/UKBI — INTERNAL low.
- **Cognitive**: R2–R3.
- **Archetypes**: G (gurindam + pesan tekstual).
- **Stimulus**: gurindam 2–4 pasang larik — REQUIRED.
- **Misconceptions** (teoretis): nasihat = moral universal tanpa teks.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: weak.
- **Volume**: MVP 6 · mature 12 · diag 4. **P3** · **MEDIUM**.
- **Quality risks**: item terjawab tanpa baca (kunci tekstual wajib).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

### F6 — Teks Fungsional

#### 44. Surat Pribadi
- **Construct**: memahami surat pribadi: bagian, tujuan, nada/register akrab. **Must NOT become**: trivia format.
- **Skills**: READING_STRUKTUR_TEKS (primary; sebagai teks fungsional) — taxonomy gap fungsional dicatat (bukan perubahan).
- **Relevance**: Kur — elemen Menulis (surat) [S1]; TKA — INTERNAL low; UKBI — analog seksi IV (Menulis) secara konsep, RESEARCH-INFORMED.
- **Cognitive**: R2–R3 (fungsi bagian dalam konteks).
- **Archetypes**: H (surat + tujuan/bagian), M (perbaikan bagian yang tidak sesuai).
- **Stimulus**: surat pribadi pendek 60–140 kata — REQUIRED.
- **Misconceptions** (teoretis): surat pribadi = surat dinas tanpa kop.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: weak–moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **LOW–MEDIUM**.
- **Quality risks**: hafalan bagian; dua format “boleh” (kunci fleksibel vs ketat — sepakati rubrik).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 45. Surat Dinas
- **Construct**: memahami surat dinas: bagian baku, bahasa formal, ejaan alamat/salam, fungsi. **Must NOT become**: hafalan kop surat.
- **Skills**: READING_STRUKTUR_TEKS + GRAMMAR_EJAAN (saat item ejaan).
- **Relevance**: Kur — elemen Menulis fase D/F [S1]; TKA — INTERNAL low-medium; UKBI — analog seksi II/IV (RESEARCH-INFORMED).
- **Cognitive**: R2–R3 (perbaikan bagian/ejaan).
- **Archetypes**: H (struktur), M/D (perbaikan: alamat, salam penutup, ejaan).
- **Stimulus**: surat dinas pendek 80–180 kata — REQUIRED.
- **Misconceptions** (teoretis): salam penutup = “hormat saya” selalu salah/benar (ikuti kaidah PUEBI konvensi).
- **Difficulty**: mudah = bagian hilang; sedang = ejaan; sulit = pilihan bahasa formal.
- **Diagnostic evidence**: moderate (R3 perbaikan).
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: kaidah konvensional berubah (verifikasi PUEBI terbaru [S1-S2]); trivia.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 46. Proposal
- **Construct**: memahami proposal kegiatan: bagian (latar, tujuan, sasaran, anggaran), kelayakan teks. **Must NOT become**: akuntansi.
- **Skills**: READING (STRUKTUR_TEKS, INFORMASI_TERSURAT).
- **Relevance**: Kur — elemen Menulis (proposal) fase F [S1]; TKA — INTERNAL low; UKBI — n/a.
- **Cognitive**: R2–R3.
- **Archetypes**: H (proposal + bagian/fungsi), A (informasi kegiatan).
- **Stimulus**: proposal kegiatan singkat 100–220 kata — REQUIRED.
- **Misconceptions** (teoretis): tujuan = latar belakang.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: weak–moderate.
- **Volume**: MVP 6 · mature 12 · diag 4. **P3** · **MEDIUM**.
- **Quality risks**: item konten terlalu spesifik kegiatan; trivia bagian.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 47. Pidato
- **Construct**: memahami pidato: struktur (pembuka–isi–penutup), tujuan, bahasa persuasif/santun. **Must NOT become**: tes isi pidato tokoh.
- **Skills**: READING (STRUKTUR_TEKS, INFERENSI) + dukungan GRAMMAR.
- **Relevance**: Kur — elemen Berbicara/Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi V secara konsep (RESEARCH-INFORMED).
- **Cognitive**: R3–R4.
- **Archetypes**: H (struktur/tujuan), I (sarana persuasi).
- **Stimulus**: pidato tertulis 100–250 kata — REQUIRED.
- **Misconceptions** (teoretis): pidato = orasi formal selalu; sapaan = isi.
- **Difficulty**: sedang.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM**.
- **Quality risks**: overlap Persuasi (§4); topik sensitif.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 48. Poster
- **Construct**: memahami poster: pesan utama, hubungan teks-gambar, daya tarik. **Must NOT become**: tes desain grafis.
- **Skills**: READING (INFORMASI_TERSURAT, IDE_POKOK); multimodal = kasus khusus arsitektur masa depan.
- **Relevance**: Kur — elemen Membaca-Memirsa (poster) [S1]; TKA — INTERNAL low; UKBI — analog seksi I “Memirsa” (RESEARCH-INFORMED).
- **Cognitive**: R2–R3.
- **Archetypes**: H (poster teks + pesan/tujuan), J (data kecil) — gambar opsional masa depan.
- **Stimulus**: poster (teks dapat berdiri sendiri saat MVP; gambar = arsitektur khusus nanti) — RECOMMENDED.
- **Misconceptions** (teoretis): poster informatif vs persuasif tak dibedakan.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: weak–moderate.
- **Volume**: MVP 6 · mature 12 · diag 4. **P3** · **MEDIUM**.
- **Quality risks**: item butuh gambar (blokir di MVP); klaim visual tanpa teks.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

#### 49. Iklan
- **Construct**: memahami iklan: pesan, sasaran, daya tarik/bahasa persuasif, keefektifan. **Must NOT become**: tes produk/etika.
- **Skills**: READING (INFERENSI, IDE_POKOK) + dukungan F8.
- **Relevance**: Kur — elemen Membaca-Memirsa [S1]; TKA — INTERNAL medium; UKBI — analog seksi III (RESEARCH-INFORMED).
- **Cognitive**: R2–R4 (sasaran tersirat).
- **Archetypes**: H (iklan + pesan/sasaran), I (daya tarik).
- **Stimulus**: iklan teks (baris/slogan+tubuh) 40–120 kata — REQUIRED.
- **Misconceptions** (teoretis): semua klaim iklan fakta; sasaran = semua orang.
- **Difficulty**: mudah = pesan; sulit = sasaran/daya tarik tersirat.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **MEDIUM–HIGH**.
- **Quality risks**: overlap Poster/Slogan (§4); produk basi.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 50. Slogan
- **Construct**: memahami slogan: pesan ringkas, daya ingat, efek bahasa (diksi pendek). **Must NOT become**: trivia “slogan = kalimat pendek”.
- **Skills**: READING (IDE_POKOK) + LITERATURE_GAYA_BAHASA (bila kias).
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL low; UKBI — n/a.
- **Cognitive**: R2–R3.
- **Archetypes**: H/C (slogan + pesan/efek), L (makna kias slogan).
- **Stimulus**: 1–2 slogan berkonteks (kampanye/iklan) — REQUIRED.
- **Misconceptions** (teoretis): slogan = poster.
- **Difficulty**: mudah–sedang.
- **Diagnostic evidence**: weak.
- **Volume**: MVP 6 · mature 12 · diag 4. **P3** · **LOW**.
- **Quality risks**: item terjawab tanpa baca; sel kecil bersama Iklan.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

### F7 — Ejaan & Bentuk Baku

#### 15. Ejaan
- **Construct**: menerapkan ejaan (huruf kapital, kata, angka, serapan) — mengenali dan **memperbaiki** kesalahan. **Must NOT become**: trivia aturan; kosakata langka.
- **Skills**: GRAMMAR_EJAAN (primary), WRITING_EJAAN (secondary — saat konteks tulisan).
- **Relevance**: Kur — elemen Menulis (ejaan) lintas fase [S1]; TKA — INTERNAL high (komponen bahasa); UKBI — analog seksi II (RESEARCH-INFORMED).
- **Cognitive**: R1–R2 (kenali) → R3 (perbaiki) — R3 carrier.
- **Archetypes**: M (tentukan kalimat salah ejaan), D (pilih perbaikan), L (kata serapan).
- **Stimulus**: kalimat/paragraf pendek berisi 1–2 kesalahan — REQUIRED.
- **Misconceptions** (teoretis): ejaan = huruf kapital saja; kata serapan selalu miring.
- **Difficulty**: mudah = kapital/kata dasar; sedang = serapan/angka; sulit = gabungan. Fake: ejaan yang hampir tidak pernah dipakai.
- **Diagnostic evidence**: moderate (R3 perbaikan); kenali-saja lemah.
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **MEDIUM**.
- **Quality risks**: satu kalimat dua kesalahan (kunci ganda); ejaan versi lama vs PUEBI terbaru (verifikasi [S1-S2]).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY · Adaptive SECONDARY.

#### 14. PUEBI
- **Construct**: penerapan kaidah PUEBI pada kalimat (kapital, preposisi, tanda, penulisan). **Must NOT become**: hafalan nomor pasal.
- **Skills**: GRAMMAR_EJAAN (primary) — PUEBI sebagai sumber kaidah dari sel ejaan.
- **Relevance**: Kur — elemen Menulis [S1]; TKA — INTERNAL high; UKBI — analog seksi II.
- **Cognitive**: R2–R3.
- **Archetypes**: M (kalimat menyalahi PUEBI), D (revisi).
- **Stimulus**: kalimat 15–40 kata — REQUIRED.
- **Misconceptions** (teoretis): “di” digabung selalu; kapital setelah tanda titik dua.
- **Difficulty**: mudah–sulit bertingkat kaidah frekuensi-tinggi dulu. Fake: kaidah pinggiran.
- **Diagnostic evidence**: moderate.
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM–HIGH** (kaidah harus akurat).
- **Quality risks**: salah kutip kaidah (wajib cek PUEBI); item rangkap dgn Ejaan/Tanda Baca (tetapkan 1 kelas error per item, §4).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 16. Tanda Baca
- **Construct**: penggunaan tanda baca (koma, titik, titik dua, tanda petik, hubung) yang mengubah makna. **Must NOT become**: ejaan kedua.
- **Skills**: GRAMMAR_TANDA_BACA (primary).
- **Relevance**: Kur — elemen Menulis [S1]; TKA — INTERNAL medium; UKBI — analog seksi II.
- **Cognitive**: R3 (pilih tanda yang tepat makna), R2 secondary.
- **Archetypes**: M (kalimat salah tanda), D (pilih tanda mengubah makna: “makan, Adik” vs “makan Adik”).
- **Stimulus**: kalimat pendek — REQUIRED; item makna (koma) paling bernilai.
- **Misconceptions** (teoretis): koma sebelum “dan” selalu salah; tanda baca tak mengubah makna.
- **Difficulty**: mudah = titik/koma dasar; sulit = tanda yang mengubah makna. Fake: tanda langka.
- **Diagnostic evidence**: moderate (R3 makna).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM**.
- **Quality risks**: dua penempatan sah (butuh kaidah tegas); overlap Ejaan/PUEBI.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 12. Kata Baku
- **Construct**: memilih bentuk baku (formal) vs nonbaku dengan benar. **Must NOT become**: daftar hafalan kata.
- **Skills**: VOCABULARY_KATA_BAKU (primary) + GRAMMAR_KATA_BAKU (dual home — pilih satu sel per item, §4).
- **Relevance**: Kur — elemen Menulis [S1]; TKA — INTERNAL medium; UKBI — analog seksi II.
- **Cognitive**: R1–R2 (kenali bentuk), R3 (pilih dalam kalimat).
- **Archetypes**: M (kalimat memuat bentuk nonbaku), C (pilih baku dalam kalimat).
- **Stimulus**: kalimat konteks — REQUIRED; kata tunggal hanya untuk variasi minor.
- **Misconceptions** (teoretis): kata serapan = nonbaku; bentuk lisan = baku.
- **Difficulty**: mudah = pasangan umum (apotek/aktif); sulit = serapan jarang. Fake: kata pinggiran.
- **Diagnostic evidence**: weak (R1) → moderate (R3).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **LOW**.
- **Quality risks**: KBBI versi berubah (verifikasi); pasangan ambigu (praktik vs praktek).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 13. Kata Tidak Baku
- **Construct**: mengenali bentuk tidak baku dan register informal. **Must NOT become**: penghakiman gaya tutur.
- **Skills**: VOCABULARY_KATA_BAKU (secondary — sisi negatif pasangan).
- **Relevance**: Kur — elemen Menulis [S1]; TKA — INTERNAL low; UKBI — analog seksi II.
- **Cognitive**: R1–R2.
- **Archetypes**: M (kalimat informal → pilih bentuk formal).
- **Stimulus**: kalimat — REQUIRED.
- **Misconceptions** (teoretis): informal = salah mutlak (konteks register perlu dinyatakan).
- **Difficulty**: mudah. Fake: varian daerah diperlakukan sbg salah (D14!).
- **Diagnostic evidence**: weak.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **LOW**.
- **Quality risks**: bias register/daerah (D13/D14); pasangan ganda dgn Kata Baku → satu sel, §4.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive NOT RECOMMENDED (MVP).

### F8 — Kosakata & Morfologi

#### 10. Makna Kata
- **Construct**: menentukan makna kata **dalam konteks** (termasuk makna kias/teknis). **Must NOT become**: definisi kamus hafalan.
- **Skills**: VOCABULARY_MAKNA_KATA (primary), READING_MAKNA_KATA (bila dalam bacaan) — pilih home per item.
- **Relevance**: Kur — elemen Membaca (kosakata) [S1]; TKA — INTERNAL high (literasi); UKBI — analog seksi II/III (RESEARCH-INFORMED).
- **Cognitive**: R2 primary (makna dari konteks), R1 minor.
- **Archetypes**: L (kata dalam kalimat/paragraf → makna), C (pilih sinonim kontekstual).
- **Stimulus**: kalimat kaya konteks (wajib) atau paragraf 40–80 kata — REQUIRED context.
- **Misconceptions** (teoretis): makna = arti harfiah selalu; kata bermakna sama di semua konteks.
- **Difficulty**: mudah = petunjuk konteks jelas; sulit = kias/teknis. Fake: kata langka tanpa petunjuk.
- **Diagnostic evidence**: moderate (kosakata-reseptif inti; kuat bila dalam bacaan).
- **Volume**: MVP 12 · mature 30 · diag 10. **P0** · **MEDIUM**.
- **Quality risks**: distraktor sinonim sah dalam konteks lain (kunci = konteks ini); item jadi tes IQ kosakata.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic PRIMARY (dalam bacaan) · Adaptive SECONDARY.

#### 11. Imbuhan
- **Construct**: memahami fungsi imbuhan (me-, pe-, -an, ber-, ter-, ke-an…) dalam makna kalimat. **Must NOT become**: morfologi hafalan.
- **Skills**: GRAMMAR_IMBUHAN (primary) — home grammar; overlap VOCABULARY bila makna derivasi.
- **Relevance**: Kur — elemen Menulis/Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi II (RESEARCH-INFORMED).
- **Cognitive**: R3 primary (terapkan makna imbuhan pada kata baru), R2 secondary.
- **Archetypes**: C (kalimat + makna imbuhan), L (kata berimbuhan dalam konteks), M (imbuhan salah).
- **Stimulus**: kalimat konteks — REQUIRED.
- **Misconceptions** (teoretis): me-kan = membuat selalu; ter- = tidak sengaja selalu.
- **Difficulty**: mudah = pasangan umum; sulit = imbuhan produktif pada kata asing. Fake: istilah linguistik.
- **Diagnostic evidence**: moderate (R3 generalisasi).
- **Volume**: MVP 10 · mature 24 · diag 8. **P1** · **MEDIUM**.
- **Quality risks**: dua makna sah (konteks harus memilih satu); overlap makna kata.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 2. Antonim
- **Construct**: menentukan lawan kata **sesuai konteks kalimat**. **Must NOT become**: hafalan pasangan kata.
- **Skills**: VOCABULARY_SINONIM_ANTONIM (primary) — cell bersama Sinonim.
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi II (RESEARCH-INFORMED).
- **Cognitive**: R2 (konteks), R1 minor.
- **Archetypes**: L (kata dalam kalimat → lawan kontekstual), C.
- **Stimulus**: kalimat konteks — RECOMMENDED (≥80% item); kata tunggal maks. 20%.
- **Misconceptions** (teoretis): lawan kata = “tidak …”; satu kata satu lawan tetap.
- **Difficulty**: mudah–sedang; sulit = kata polisemi. Fake: kosakata langka.
- **Diagnostic evidence**: weak (sendirian); moderate dalam baterai kosakata.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **LOW**.
- **Quality risks**: pasangan ganda; overlap Makna Kata (§4).
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

#### 5. Sinonim
- **Construct**: menentukan padanan kata yang **tepat dalam kalimat** tanpa mengubah makna. **Must NOT become**: daftar sinonim hafalan (asal audit: BC-SINONIM-0003 kunci salah).
- **Skills**: VOCABULARY_SINONIM_ANTONIM (primary) — cell bersama Antonim.
- **Relevance**: Kur — elemen Membaca [S1]; TKA — INTERNAL medium; UKBI — analog seksi II (RESEARCH-INFORMED).
- **Cognitive**: R2 primary (konteks), R1 minor.
- **Archetypes**: L (ganti kata dalam kalimat, makna tetap), C.
- **Stimulus**: kalimat konteks — RECOMMENDED; kunci harus tunggal per kalimat.
- **Misconceptions** (teoretis): sinonim = saling substitusi di semua konteks.
- **Difficulty**: mudah–sedang; sulit = nuansa makna (melihat/menonton). Fake: pasangan “kamus” tanpa kalimat.
- **Diagnostic evidence**: weak (sendirian); moderate dalam baterai.
- **Volume**: MVP 8 · mature 18 · diag 6. **P2** · **LOW**.
- **Quality risks**: kunci ganda (nuansa) — dua reviewer; warisan audit (kunci = kata stem) harus gagal di gate D6.
- **Suitability**: Practice ✓ · Achievement ✓ · Diagnostic SECONDARY · Adaptive SECONDARY.

## 7. Teks Berita — first pilot specification

Recommendation **confirmed** (audit §16 + Quality Standard + this blueprint agree): Teks Berita is the first rebuild theme — highest per-item diagnostic value (5W+1H, fakta/opini, struktur, gagasan, inferensi), curriculum-ubiquitous, authentic-style stimuli available, cleanest evidence cells. Spec below only — **no questions written**.

### 7.1 Construct
Measures reading a news text *as a genre*: retrieve explicit info (5W+1H), locate the lead/main point, follow inverted-pyramid structure, separate fact from opinion, infer meaning (incl. vocabulary in context), and at the top cell evaluate claim support within the text. It is **not** current-affairs knowledge, not journalism vocabulary, not memory of events.

### 7.2 Skill map
- Primary `READING`; subskills `READING_INFORMASI_TERSURAT`, `READING_STRUKTUR_TEKS`, `READING_IDE_POKOK`, `READING_INFERENSI`.
- Taxonomy gap (flagged, unchanged): fakta/opini & evidence-evaluation lack a subskill — resolve in a Phase 1B+ taxonomy pass (candidate `READING_FAKTA_OPINI`).
- Every `evidence_target` resolves to the `LearningSkillType.READING` family so Learning Evidence aggregation keeps working.

### 7.3 Cognitive architecture (12-item pilot)
R2 ~25% (eksplisit/lead) · R3 ~25% (struktur, kosakata-dalam-konteks) · R4 ~35% (gagasan, inferensi, fakta/opini halus) · R5 ~15% (evaluasi dukungan klaim, tekstual). R2 grounds accessibility; R4 carries the diagnostic signal.

### 7.4 Archetype architecture (12 items)
2× A eksplisit (5W+1H) · 2× A gagasan utama/lead (R3) · 2× A-R4 inferensi dua-bukti · 2× I fakta/opini · 2× H struktur (headline–lead–body) · 1× L kosakata-dalam-konteks berita · 1× B klaim yang *tidak* didukung teks (R5).

### 7.5 Stimulus architecture
5–6 stimulus texts for 12 items (testlets of 2–3; **each testlet = 1 diagnostic evidence unit**). Length 75–200 kata (SMP) / 100–250 (SMA); grade-fit register; exotic terms glossed. Content **time-independent** (no real event a student may or may not know); adapted-real texts fact-checked and neutral.

### 7.6 Difficulty target
Easy ~25% / Medium ~45% / Hard ~30%. Easy = retrieval; Medium = structure + direct fakta/opini; Hard = multi-evidence inference + subtle evaluation. Fake difficulty prohibited: outside knowledge, rare vocabulary, trick wording, ambiguous pairs.

### 7.7 Misconception model (all THEORETICAL — none empirically validated)
- Every news sentence is fact. · Opinion only when signposted “menurut”. · The lead is the conclusion. · Longer text = more important news. · A quoted source makes a claim true. Upgrade to *empirically observed* only after pilot response-pattern analysis (distractor selection rates).

### 7.8 Diagnostic evidence
Signals: retrieval (R2), structure awareness (R3), inferential reading (R4), evaluative reading (R5). Must **not** infer: writing ability, grammar mastery, general knowledge. Evidence updates READING only; a berita testlet counts once.

### 7.9 Validation gates
All items: stages 1–2 (structural/content), 5 (answer), 7 (duplicate incl. content-bearing cross-stimulus), 8 (cells); stages 3, 4, 6, 9 human-gated; stimulus-dependence check on 100%; leakage scan per DNA §2 list. **Publish is conjunctive (Quality Standard §4.4/S2): no hard-fail < 2, all scored ≥ 2, D10 in an explicit state (target `HYPOTHESIS` at pilot authoring, upgraded to `REVIEWED` after response-pattern documentation), human APPROVED.**

### 7.10 Human review
Per item: stimulus authenticity/neutrality (D13/D14); key answerable from text alone (D5/D7); fakta/opini keys defensible (D1); inference keys text-supported (D2); vocabulary ≤ grade (D8); two-reviewer agreement on keys and R-cells. Misconception links are recorded as **hypotheses** only (V7 — "selection consistent with hypothesis X", never "= misconception X"); the pilot does not require a `validated_misconception` for any item.

### 7.11 Calibration
LEVEL 0 cells on publish → LEVEL 1 after ≥ 40 responses/item (p ∈ [0.30, 0.90]; point-biserial ≥ 0.15, target 0.20; pool per skill×difficulty when item-N < 30) → revision/retire on flag (no silent re-cell) → LEVEL 2+ at N ≥ 100 where exposure allows. Calibration evidence upgrades D9 difficulty and may raise D10 HYPOTHESIS → REVIEWED/EMPIRICALLY_SUPPORTED via the response-pattern + empirical-analysis tier (V7) — a `CALIBRATION` tag alone never satisfies D10 (S2).

### 7.12 Success criteria (pilot pass = all true)
1. 100% items carry evidence/cognitive/difficulty targets + a misconception *hypothesis* flag or explicit non-misconception note (V7 semantics). 2. 0 deterministic-stage rejects after authoring fixes; 0 leaks. 3. All 15 dimensions scored; none < 2; **conjunctive publish rule satisfied with an explicit D10 state for every item** (S2). 4. ≥95% items unanswerable without stimulus (2 reviewers). 5. Agreement ≥ 0.80 key / ≥ 0.70 cognitive cell (first 20-item rubric run). 6. LEVEL-1 calibration: ≥80% inside p-band with r ≥ 0.15; flags resolved. 7. Expert attestation: no item needs outside knowledge. 8. Learner-facing language audit: 0 instances asserting a distractor = a misconception without a validated tag (V7).

## 8. Rebuild waves (no questions generated)

| Wave | Themes | Rationale | Dependencies | Expected value | Risk |
|---|---|---|---|---|---|
| **1 — Diagnostic core (P0)** | Teks Berita (pilot), Ide Pokok, Gagasan Utama, Simpulan, Teks Eksplanasi, Teks Argumentasi, Editorial, Makna Kata, Ejaan, Kalimat Efektif | Highest diagnostic/curriculum value | Berita fakta/opini cells shared w/ Editorial/Argumentasi | Real reading+grammar diagnostics restored first | Ejaan/PUEBI factual accuracy; Simpulan key disputes |
| **2 — Curriculum breadth (P1)** | SPOK, Kalimat, Paragraf, PUEBI, Tanda Baca, Kata Baku, Imbuhan, Artikel, Teks Editorial, Anekdot, Cerpen, Puisi, Teks Deskripsi, Teks Eksposisi, Teks Persuasi, Teks Prosedur, Teks Ulasan, Resensi | Completes P1 classroom coverage | Paragraf shares stimuli with Ide Pokok; Teks Editorial builds on Editorial rules | Broad classroom value | Cerpen/Puisi interpretation disputes; genre blur |
| **3 — Specialized & literary (P2)** | Antonim, Sinonim, Kata Tidak Baku, Majas, Pantun, Novel, Drama, Fabel, Legenda, Hikayat, Mitos, Cerita Inspiratif, Teks Narasi, Surat Pribadi, Surat Dinas, Pidato, Iklan | Specialized evidence cells; higher stimulus effort | Narasi shares cells w/ Cerpen; vocabulary cell shared across Sinonim/Antonim/Makna Kata | Maturity for specialist use | Cultural sensitivity (Mitos/Legenda); Hikayat archaism; Novel excerpt cuts |
| **4 — Long-tail (P3)** | Syair, Gurindam, Proposal, Poster, Slogan | Small-form completion | Poster/Iklan/Slogan share functional cells | Presence/completeness at low volume | Trivia-easy items; low diagnostic value (accepted: small diag subsets) |

Value logic: Wave 1 = the diagnostic product; Waves 2–3 = classroom breadth; Wave 4 = completeness — volumes follow the §2 bands.

## 9. Canonical master table (executive control surface)

Volumes: MVP / mature / diag-ready per theme (bands P0 12·30·10, P1 10·24·8, P2 8·18·6, P3 6·12·4). Totals: **MVP 466 · mature 1,098 · diag 366**.

Archetype key: A = reading+inference · B = reading+evaluation · C = short contextual sentence · D = editing/revision · F = literary excerpt · G = poetry interpretation · H = functional text · I = argument analysis · J = data/table+language · K = multi-sentence coherence · L = meaning-in-context · M = error diagnosis.

| # | Theme | Family | Core Construct | Primary Skill | Cognitive Focus | Stimulus | Archetype Count | MVP Items | Mature Items | Diagnostic Ready | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | SPOK | F1 | fungsi klausa S–P–O–K | GRAMMAR | R3 | kalimat konteks | 2 | 10 | 24 | 8 | P1 | MED |
| 2 | Antonim | F2 | relasi makna berlawanan dalam konteks | GRAMMAR | R2–R3 | kalimat konteks | 3 | 8 | 18 | 6 | P2 | LOW |
| 3 | Kalimat | F1 | jenis & fungsi komunikatif kalimat | GRAMMAR | R2–R3 | kalimat konteks | 3 | 10 | 24 | 8 | P1 | LOW |
| 4 | Majas | F5 | bahasa figuratif & efeknya | LITERATURE | R2–R4 | petikan sastra | 3 | 8 | 18 | 6 | P2 | MED |
| 5 | Sinonim | F2 | relasi makna sepadan dalam konteks | GRAMMAR | R2–R3 | kalimat konteks | 3 | 8 | 18 | 6 | P2 | LOW |
| 6 | Paragraf | F3 | struktur & organisasi paragraf | READING | R2–R4 | paragraf | 3 | 10 | 24 | 8 | P1 | MED |
| 7 | Ide Pokok | F3 | gagasan utama eksplisit/implisit | READING | R2–R3 | paragraf | 2 | 12 | 30 | 10 | P0 | LOW |
| 8 | Gagasan Utama | F3 | gagasan utama (paralel Ide Pokok) | READING | R2–R4 | paragraf/passage | 2 | 12 | 30 | 10 | P0 | LOW |
| 9 | Simpulan | F3 | simpulan berbasis bukti teks | READING | R3–R4 | paragraf/passage | 2 | 12 | 30 | 10 | P0 | MED |
| 10 | Makna Kata | F2 | makna kata dalam konteks | GRAMMAR | R2–R3 | kalimat/paragraf | 3 | 12 | 30 | 10 | P0 | LOW |
| 11 | Imbuhan | F1 | afiksasi & makna gramatikal | GRAMMAR | R2–R3 | kalimat konteks | 3 | 10 | 24 | 8 | P1 | LOW–MED |
| 12 | Kata Baku | F2 | kata baku & ragam formal | GRAMMAR | R1–R2 | kalimat konteks | 3 | 10 | 24 | 8 | P1 | LOW |
| 13 | Kata Tidak Baku | F2 | mengenali non-baku & perbaikannya | GRAMMAR | R1–R2 | kalimat konteks | 2 | 8 | 18 | 6 | P2 | LOW |
| 14 | PUEBI | F2 | kaidah ejaan (EYD V) | GRAMMAR | R1–R2 | kalimat konteks | 3 | 10 | 24 | 8 | P1 | MED |
| 15 | Ejaan | F2 | ejaan: huruf/tanda/kata serapan | GRAMMAR | R1–R2 | kalimat konteks | 3 | 12 | 30 | 10 | P0 | MED |
| 16 | Tanda Baca | F2 | tanda baca & fungsi | GRAMMAR | R1–R2 | kalimat konteks | 2 | 10 | 24 | 8 | P1 | LOW–MED |
| 17 | Kalimat Efektif | F1 | kalimat efektif & penyuntingan | GRAMMAR | R2–R3 | kalimat bermasalah | 3 | 12 | 30 | 10 | P0 | MED |
| 18 | Artikel | F3 | artikel: tujuan/isi/organisasi | READING | R2–R4 | passage | 3 | 10 | 24 | 8 | P1 | MED–HIGH |
| 19 | Editorial | F3 | posisi & argumen opini media | READING | R3–R5 | passage | 3 | 12 | 30 | 10 | P0 | HIGH |
| 20 | Teks Editorial | F3 | genre bentuk editorial | READING | R3–R5 | passage | 3 | 10 | 24 | 8 | P1 | HIGH |
| 21 | Puisi | F5 | tafsir puisi berlandas teks | LITERATURE | R3–R4 | poem | 2 | 10 | 24 | 8 | P1 | HIGH |
| 22 | Pantun | F5 | struktur & pesan pantun | LITERATURE | R2–R4 | poem | 2 | 8 | 18 | 6 | P2 | MED |
| 23 | Syair | F5 | isi/nasihat syair | LITERATURE | R2–R3 | poem+gloss | 1 | 6 | 12 | 4 | P3 | HIGH |
| 24 | Gurindam | F5 | pesan gurindam | LITERATURE | R2–R3 | poem | 1 | 6 | 12 | 4 | P3 | MED |
| 25 | Cerpen | F4 | unsur cerita ber-bukti | LITERATURE | R2–R4 | excerpt | 3 | 10 | 24 | 8 | P1 | HIGH |
| 26 | Novel | F4 | kutipan novel: tokoh/konflik/tema | LITERATURE | R3–R4 | excerpt | 2 | 8 | 18 | 6 | P2 | VERY HIGH |
| 27 | Drama | F4 | drama via dialog | LITERATURE | R3–R4 | dialogue | 2 | 8 | 18 | 6 | P2 | HIGH |
| 28 | Fabel | F4 | fabel: unsur & nilai tekstual | LITERATURE | R2–R3 | story | 2 | 8 | 18 | 6 | P2 | MED |
| 29 | Legenda | F4 | legenda: unsur & nilai | LITERATURE | R2–R3 | story | 1 | 8 | 18 | 6 | P2 | MED |
| 30 | Hikayat | F4 | hikayat: unsur + glos arkais | LITERATURE | R2–R4 | excerpt+gloss | 2 | 8 | 18 | 6 | P2 | HIGH |
| 31 | Mitos | F4 | mitos sbg teks budaya | LITERATURE | R2–R3 | story | 1 | 8 | 18 | 6 | P2 | MED–HIGH |
| 32 | Cerita Inspiratif | F4 | nilai/teladan tekstual | LITERATURE | R2–R3 | story | 1 | 8 | 18 | 6 | P2 | MED |
| 33 | Anekdot | F3 | humor-kritik tersirat | READING | R3–R4 | short text | 2 | 10 | 24 | 8 | P1 | HIGH |
| 34 | Teks Deskripsi | F3 | deskripsi objek/kesan/pola | READING | R2–R3 | paragraf | 3 | 10 | 24 | 8 | P1 | MED |
| 35 | Teks Narasi | F3 | narasi generik (struktur alur) | READING | R2–R4 | passage | 2 | 8 | 18 | 6 | P2 | MED |
| 36 | Teks Eksposisi | F3 | paparan: tesis–argumen | READING | R2–R4 | passage | 3 | 10 | 24 | 8 | P1 | HIGH |
| 37 | Teks Eksplanasi | F3 | struktur & kausalitas | READING | R2–R4 | passage | 3 | 12 | 30 | 10 | P0 | HIGH |
| 38 | Teks Persuasi | F3 | bujukan: daya tarik/sarana | READING | R3–R4 | passage | 3 | 10 | 24 | 8 | P1 | HIGH |
| 39 | Teks Argumentasi | F3 | argumen: tesis–bukti–simpulan | READING | R4–R5 | passage | 3 | 12 | 30 | 10 | P0 | HIGH |
| 40 | Teks Prosedur | F3 | instruksi: urutan/kelengkapan | READING | R2–R3 | procedure | 3 | 10 | 24 | 8 | P1 | MED |
| 41 | Teks Berita | F3 | **pilot** — genre berita | READING | R2–R5 | news text | 6 | 12 | 30 | 10 | P0 | MED |
| 42 | Teks Ulasan | F3 | ulasan: tafsir & evaluasi | READING | R3–R5 | review | 2 | 10 | 24 | 8 | P1 | HIGH |
| 43 | Resensi | F3 | resensi buku: struktur/nilai | READING | R2–R4 | review | 2 | 10 | 24 | 8 | P1 | HIGH |
| 44 | Surat Pribadi | F6 | surat pribadi: bagian/tujuan | READING | R2–R3 | letter | 2 | 8 | 18 | 6 | P2 | LOW–MED |
| 45 | Surat Dinas | F6 | surat dinas: bagian/ejaan | READING+GRAMMAR | R2–R3 | letter | 3 | 8 | 18 | 6 | P2 | MED |
| 46 | Proposal | F6 | proposal: bagian/kelayakan | READING | R2–R3 | proposal | 2 | 6 | 12 | 4 | P3 | MED |
| 47 | Pidato | F6 | pidato: struktur/tujuan | READING | R3–R4 | speech | 2 | 8 | 18 | 6 | P2 | MED |
| 48 | Poster | F6 | poster: pesan/tujuan | READING | R2–R3 | poster text | 2 | 6 | 12 | 4 | P3 | MED |
| 49 | Iklan | F6 | iklan: pesan/sasaran/daya tarik | READING | R2–R4 | ad text | 2 | 8 | 18 | 6 | P2 | MED–HIGH |
| 50 | Slogan | F6 | slogan: pesan ringkas/efek | READING | R2–R3 | slogan+ctx | 2 | 6 | 12 | 4 | P3 | LOW |


---

## 10. Quality/blueprint consistency check (self-audit, run on this document)

Checks below were executed by script against this file (not asserted by hand):

| Check | Result |
|---|---|
| Exactly 50 themes in the canonical table, numbered 1–50 contiguous | ✅ 50/50 |
| No duplicate theme names in the table | ✅ 0 |
| No renamed themes (table names == audit's exact 50 names) | ✅ identical |
| 50 per-theme blueprint cards, one per theme | ✅ 50/50 |
| Card ↔ table agreement: volume (MVP/mature/diag) and priority per theme | ✅ 50/50 |
| Priority-band volume integrity (P0=12·30·10, P1=10·24·8, P2=8·18·6, P3=6·12·4) | ✅ every row in-band |
| Band counts P0/P1/P2/P3 = 10/18/17/5 | ✅ matches §2 |
| Totals recompute: MVP 466 · mature 1,098 · diag 366 | ✅ matches §2 and §9 intro |
| Every card has: construct + must-not-become, skills, relevance, cognitive, archetypes, stimulus, misconceptions, difficulty, diagnostic evidence, volume+priority, quality risks | ✅ (all cards in the §6 template) |
| Teks Berita pilot spec complete (construct → success criteria) | ✅ §7.1–§7.12 |
| No actual question content (stems/options/keys) written | ✅ 0 items — placeholders/archetypes only |
| Theme treated as trivia | ✅ none — each card binds to an evidence cell |

Cross-document consistency (reference-level, verified while authoring): blueprint bands and the P0/P1/P2/P3 labels use the Quality Standard's priority vocabulary; evidence targets resolve to `LearningSkillType`; the pipeline stages cited (§7.9) exist in `QUESTION_VALIDATION_SPEC.md`; misconceptions are labeled THEORETICAL per the Phase 1B ruling (foundation = CONDITIONAL GO with V7/S2 corrections, all honored here).

---

## 11. Decisions requiring founder approval

1. **Bank totals ≠ 1,500.** The blueprint replaces 50 × 30 = 1,500 with MVP 466 / mature 1,098 / diag-ready 366 (§2, §9). Rationale: old totals were generator arithmetic; new totals follow evidence-cell value and diagnostic weight. A founder wanting parity (e.g., 30/theme mature) changes §2/§6/§9 bands only — no card logic changes.
2. **Eight families over 50 theme labels.** Labels are preserved exactly (0 rename/merge), but families group overlapping themes and share evidence cells (§1, §4). Founder must accept that "50 themes" is a *catalog* grouping, not 50 distinct constructs — or request formal merges of true duplicates (Editorial/Teks Editorial, Ide Pokok/Gagasan Utama) later.
3. **Gagasan Utama upgraded to P0 (12·30·10).** The Phase-0 audit's P1 draft conflicted with its own §8 Wave-1 membership; this blueprint makes Gagasan Utama P0 to match its strong diagnostic cells and §8 Wave-1 placement.
4. **P2/P3 themes get small banks (6–8 MVP).** Deliberate: narrow constructs (Syair, Gurindam, Slogan) don't deserve 30 items; founder approval needed if classroom completeness outweighs diagnostic efficiency.
5. **Pilot = Teks Berita, 12 items, success criteria in §7.12.** First write phase proceeds only after founder signs off on §7 (construct, cells, calibration LEVEL 0–1 thresholds, human-review checklist).
6. **Skill-taxonomy gaps flagged, not filled.** Cards flag missing `LearningSkillType` subskills (fakta/opini, sintaksis) as gaps (§6). Taxonomy edits are a separate approved phase — do not silently extend here.
7. **Wave order (§8) is commitment order.** Founder may reorder waves but should not pull P3 themes ahead of Wave 1 without accepting the diagnostic cost.

---

## 12. Safety confirmation and hard stop

**DB writes = 0 · Question generation = 0 · Bank edits = 0 · Schema changes = 0 · Production code changes = 0.**

This document is the canonical forward blueprint for the rebuild. The Phase-0 forensic audit (`QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md`) remains the historical evidence artifact; the governing contracts are the Quality Standard, Validation Spec, and Item DNA — this blueprint inherits them per-theme without copying them.

**Hard stop.** The next phase (Teks Berita pilot authoring) is authorized only after the founder reviews this blueprint and the Phase 1B verification (`QUESTION_BANK_FOUNDATION_VERIFICATION.md`, CONDITIONAL GO). No questions, no item JSON, no factory, no allowlist population, no publication may proceed before that review.
