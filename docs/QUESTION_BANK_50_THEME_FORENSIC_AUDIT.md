# BahasaCerdas — 50 Theme Question Bank Forensic Audit

**Status**: AUDIT ONLY — READ ONLY. Zero DB writes, zero migrations, zero code changes to engines/banks/APIs. Verified against the **live production Supabase** (2026-09-04) and the committed JSON bank. Prior Phase 7 audit (2026-08-17/18, commit `7c78ef7`) independently reached the same verdict; this audit re-derives and extends it.

---

## 1. Executive Summary

The "50-theme question bank" is **1,500 programmatically generated items** (50 files × 30) in `data/question-bank/master/`, seeded into the `Soal` table with `source = MASTER_BANK`. **1,480 of 1,500 (98.7%) are template garbage** produced by exactly three copy-paste generators:

1. **1,037 × "Berikut ini yang termasuk contoh {Konsep} adalah…"** — the correct option is the concept name itself (tautology), and the same three filler distractors ("Menulis cerita pendek / Membaca puisi / Menyusun laporan") repeat across every theme.
2. **294 × "Pernyataan: {Konsep} adalah bagian dari materi Bahasa Indonesia"** (BENAR_SALAH) — untestable tautology; the "answer" is always True.
3. **149 × "Jelaskan pengertian {Konsep} menurut pemahaman Anda."** (ISIAN_SINGKAT) — the single fake option is the answer itself.

Only **20 items** (1.3%) contain original content, all confined to **5 of the 50 themes** (SPOK 8, Antonim 3, Kalimat 3, Majas 3, Sinonim 3). Of those 20, one (`BC-SINONIM-0003`) has a **wrong answer key** (key = the stem word itself), and every one of the remaining 19 is **Level-1 recall with no stimulus** — structurally sound but pedagogically shallow.

**Verdict: the current 50-theme bank is NOT suitable for diagnostic assessment today.** It measures recognition of terminology, not language ability. The bank is an asset only as a *source of theme names and a few salvageable items*, not as content.

**Production exposure (the serious part):** broken items **can and do reach students today** through the guru assignment path:
- `POST /api/guru/bank-soal/send` → picks `source: MASTER_BANK` questions with **no content gate** and sends them to student groups.
- `GET /api/guru/latihan/pick` → serves the same pool to guru practice.
- `POST /api/player/diagnostic` fallback → **already gated** (`lib/diagnostic-ai/bank-gate.ts`, shipped `eef46d6`).
- `POST /api/player/adaptive-practice` → has its own inline template gate.

The P0.5 diagnostic gate (commits `1575d13` + `eef46d6`) closed the diagnostic path; the guru send path is the remaining open leak.

---

## 2. Current Question Bank Architecture

```
data/question-bank/master/{50 tema}.json     ← source of truth for MASTER_BANK (1.500)
   │  upsert (scripts/seed-question-bank.ts)
   ▼
Soal (source=MASTER_BANK, kodeSoal=BC-*, topik={Tema}, 1.500 baris)
   │
   ├─► app/api/guru/latihan/pick          → guru practice        (NO content gate)
   ├─► app/api/guru/bank-soal/send        → assignments to murid (NO content gate)  ⚠
   ├─► app/api/player/adaptive-practice   → inline template gate (catches 3 pola)
   └─► app/api/player/diagnostic          → lib/diagnostic-ai/bank-gate.ts (eef46d6) ✓
```

Metadata layer (`QuestionMetadata`, source=BANK_SOAL, 195 rows): **177 APPROVED** (90 IMPORT/ADH + **87 HUMAN_REVIEW BC-master items, 83 of which are templates**) + **18 NEEDS_REVIEW** (17 templates). The 87 "HUMAN_REVIEW/APPROVED" rows are how broken items entered the diagnostic candidate pool — review approved *taxonomy* (skill/topic/type), never *content*.

---

## 3. Source Inventory

| # | Source | Location | Model/File | Est. Items | Themes | Production Used? | Status |
|---|--------|----------|-----------|-----------:|--------|------------------|--------|
| 1 | **Master Bank** | `data/question-bank/master/*.json` (50 files) | JSON + `Soal` (source=MASTER_BANK) | 1,500 | 50 | ✅ guru latihan/send, adaptive, diagnostic (gated) | **CRITICAL — 98.7% template** |
| 2 | **Aksi Hari Ini (ADH)** | `data/question-bank/aksi-hari-ini-batch-001.json` | `Soal` (source=IMPORT, kode `ADH-*`) | 90 | none (daily topics) | ✅ daily-action/quests | Clean (passage-based) |
| 3 | **AI Bank** | DB only | `Soal` (source=AI, no kodeSoal) | 95 | 1–2 (laporan observasi etc.) | ✅ guru AI-generate | OK (per-sample) |
| 4 | **QuestionMetadata** | DB | `QuestionMetadata` (BANK_SOAL) | 195 | 50 (points at 1–3) | ✅ adaptive/diagnostic pool | **87/105 BC rows template, APPROVED** |
| 5 | **UKBI** | `data/question-bank/ukbi/{sd,smp,sma,guru}` | `UKBIQuestion` | 1,330 | UKBI seksi (5) | ✅ simulasi UKBI | Quality-gated (prior phases) |
| 6 | **TKA** | `data/question-bank/tka/*` | `TKAQuestion` | 355 | TKA kompetensi | ✅ simulasi TKA | Quality-gated |
| 7 | **Game** | DB | `GameQuestion` | 6,250 | game types | ✅ games | Not in this audit's scope |
| 8 | **Quiz/Tugas** | DB | `QuizQuestion` | 693 | per quiz | ✅ kuis | Not in scope |
| 9 | **Paket Kompetensi** | DB | `PaketKompetensi` | 17 | UKBI/TKA tracks | ✅ | Not in scope |
| 10 | **Jalur Cerdas** | DB `LearningUnit.content` | JSON in units | 284 units (390+ Q) | 12 levels | ✅ arena | Validated (jalur-leakage tests) |
| 11 | **DailyAction** | DB | `DailyAction` | 0 rows | — | ✅ (empty) | Table migrated, empty |

**Total question rows in DB: 1,685 `Soal` + 1,330 UKBI + 355 TKA + 6,250 game + 693 quiz + 390+ jalur ≈ 10,700+.** The "≈1,500 claim" refers only to the master bank.

---

## 4. 50 Theme Master List

All 50 themes exist as: JSON file → `Soal.topik` (exact match, 30 rows each) → guru UI category. **Names are consistent across all three layers** (no case/alias drift). Two near-duplicate pairs exist: `Editorial`/`Teks Editorial` and `Kalimat`/`Kalimat Efektif` — distinct files with distinct content (both equally templated).

| # | Theme (file = topik) | Source | Items | Active? | Duplicate Risk | Initial Quality |
|---|---------------------|--------|------:|---------|----------------|-----------------|
| 1 | SPOK | master/spok.json | 30 | ✅ | Low (8 real + 22 tpl) | **8 usable (recall)** |
| 2 | Antonim | master/antonim.json | 30 | ✅ | High | 3 usable (recall) |
| 3 | Kalimat | master/kalimat.json | 30 | ✅ | High | 3 usable (recall) |
| 4 | Majas | master/majas.json | 30 | ✅ | High | 3 usable (recall) |
| 5 | Sinonim | master/sinonim.json | 30 | ✅ | High | 2 usable + 1 WRONG_KEY |
| 6–50 | All other 45 themes | master/*.json | 30 each | ✅ | **CRITICAL (exact in-file dupes)** | **0 usable** |

Full per-theme template breakdown (re-derived 2026-09-04, matches Phase 7 artifact exactly):

```
theme               contoh  pernyataan  jelaskan  other(real)
anekdot..teks-ulasan  21        6          3        0   ← 45 themes identical
antonim/kalimat/majas/sinonim  19        5          3        3
spok                          16        4          2        8
TOTAL                       1037      294        149       20
```

---

## 5. Item Count by Theme

Every theme has exactly **30 items** (50 × 30 = 1,500). Distribution of types in the bank: PILIHAN_GANDA 1,050 · BENAR_SALAH 300 · ISIAN_SINGKAT 150. Metadata: MUDAH 600 / SEDANG 600 / SULIT 300; `levelBerpikir` 1–5 assigned uniformly (300/450/250/300/200) **regardless of actual content** — the numbers were generated, not measured.

---

## 6. Quality Distribution (A–E)

Applied to **all 1,500 items** via the Phase 7 classifier (`lib/master-recovery`, 49-test harness, deterministic) + independent re-derivation + human read of all 20 real-content items.

| Class | Count | % | Definition |
|-------|------:|--:|------------|
| **A — KEEP** | 0 | 0% | Strong enough to preserve untouched. **None** — even the real items are recall-only and lack stimuli. |
| **B — SALVAGE** | 19 | 1.3% | Core idea useful, needs rewrite: the 13 GOLD + 6 auto-repairable items. |
| **C — REBUILD** | 0 | 0% | Concept useful, item weak — indistinguishable from B here; B covers them. |
| **D — RETIRE** | 1,480 | 98.7% | Template garbage: 1,037 concept-tautology + 294 pernyataan-tautology + 149 jelaskan-with-fake-option. |
| **E — BROKEN** | 1 | 0.07% | `BC-SINONIM-0003` — answer key points to the stem word ("Berani" → key 2, the word itself; correct is "Gagah" index 3). |

Rubric profile of the 19 salvageable items (0–3): Content correctness 3, Single-best-answer 3, Stimulus quality **0** (no stimuli), Relevance of stimulus n/a, Cognitive demand **1** (all L1 recall), Language quality 3, Distractor quality 2 (real but easy), Difficulty integrity 2, Curriculum relevance 3, Diagnostic value **1** (a correct/incorrect response on "antonim dari panas" tells us almost nothing about ability).

---

## 7. Template Contamination

| Theme group | Template rate | Class |
|-------------|--------------:|-------|
| 45 themes (teks-*, ejaan, kata-baku, puisi, pantun, dll.) | 100% | **CRITICAL** |
| antonim / kalimat / majas / sinonim | 90% | **HIGH** |
| SPOK | 73% | **HIGH** |

The three generator patterns (from `scripts/build-question-bank-data.ts:175–184`):
- `text = "Berikut ini yang termasuk contoh ${theme.label} adalah..."` → options `[Konsep, "Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"]`, key 0.
- `"Pernyataan: {Konsep} adalah bagian dari materi Bahasa Indonesia. Benar/Salah"` → key True.
- `"Jelaskan pengertian ${theme.label} menurut pemahaman Anda."` → options `[Konsep]`, key 0.
- Explanation template: `"${theme.label} adalah jawaban yang tepat karena sesuai dengan konsep yang dimaksud."`

**No theme is free of contamination.** "Contoh ... adalah..." is the single most damaging pattern in the entire bank: it has no correct answer (the concept is not an example of itself), it leaks the answer in the stem/option, and it is answerable without reading.

---

## 8. Duplicate Analysis

| Measure | Result |
|---------|--------|
| Exact duplicates (normalized text+options+key) | **1,330** (89%) |
| Duplicate groups | **150 groups** (21/19/16 member template families per file) |
| Canonical items after dedup | 170 (150 template + 20 real) |
| Near-duplicates (genuine text variation) | **0** — members are byte-identical copies |
| Cross-file structural dupes | **50×** — the same three filler distractors repeat in all 50 files |
| Unique pedagogically distinct items | **20** |

Every one of the 1,480 template items is an exact copy of one of 3 family members in its own file (21× "contoh", 6× "pernyataan", 3× "jelaskan"). A student who sees one sees all — and the **correct-answer-position pattern (always key 0) is fully predictable**.

---

## 9. Cognitive Distribution

Inferred from actual content (metadata `levelBerpikir` is untrustworthy — it was assigned arithmetically):

| Level | Bank-wide | Notes |
|-------|----------:|-------|
| R1 Recognition/recall | **~1,499 (99.9%)** | definition recognition, term identification, "apa itu / contoh apa / antonim apa" |
| R2 Comprehension | 0 | no passages to comprehend |
| R3 Application | 1 | SPOK-0006 (identify S-P-O pattern) |
| R4 Inference/analysis | 0 | — |
| R5 Evaluation | 0 | — |
| R6 Synthesis | 0 | — |

**The bank is a recall engine.** Even the 20 real items: 19 are R1, 1 is R3. There are zero stimulus-based items in the entire 1,500.

---

## 10. Skill Distribution

Actual measured skills (by content, not label):

| Skill family | Items | Notes |
|--------------|------:|-------|
| Terminology recognition (definition/concept naming) | 1,480 | "contoh X / jelaskan X / pernyataan X" — **not a language skill** |
| Vocabulary (sinonim/antonim recall) | 9 | 6 sinonim + 3 antonim real items |
| Grammar component ID (SPOK) | 8 | subjek/predikat/objek/keterangan recall |
| Sentence-type classification (kalimat) | 3 | deklaratif/interogatif/imperatif/eksklamatif |
| Figurative language ID (majas) | 3 | personifikasi/metafora/simile recall |

Absent entirely: reading comprehension (eksplisit/inferensi/gagasan utama), text structure, text purpose, editing/EYD application, coherence, argument evaluation, evidence-based selection, contextual meaning. **0 of 50 themes deliver stimulus-based items today.**

---

## 11. Diagnostic Value

| Value | Themes | Reason |
|-------|--------|--------|
| **NONE** | 45 of 50 | Template items give zero evidence — a correct answer means the student knows the answer is "always option A" or recognizes the concept name. |
| **LOW** | SPOK, Antonim, Kalimat, Majas, Sinonim | A single vocabulary/grammar recall response carries negligible information about ability; no IRT-style discrimination possible at this depth. |
| **HIGH (potential only)** | Teks Berita, Teks Eksplanasi, Ide Pokok, Simpulan, Gagasan Utama, Cerpen, Puisi, Teks Argumentasi, Resensi, Editorial, Anekdot | *If rebuilt* with authentic passages, these themes can produce discriminating items (main idea, inference, structure, purpose, evaluation). Currently 0 usable items here. |

**Diagnostic conclusion:** the bank cannot estimate ability for any skill today. Rebuilding must prioritize stimulus-based reading items because only they generate the evidence a diagnostic needs.

---

## 12. Theme-by-Theme Audit (all 50)

Common facts for **all 50 themes**: 30 items, 3 template families, exact in-file dupes, answer-position leakage (key 0), explanation template, `levelBerpikir`/`difficulty` assigned arithmetically, zero stimuli. "Usable" below = non-template real-content items.

### Theme 1 — SPOK
- Items: 30 · Usable: 8 (0001–0008) · Sources: master/spok.json
- Quality: B (7 real MCQ + 1 wrong-typed). Real items identify subjek/predikat/objek/keterangan in short sentences — valid but R1 recall.
- Defects: 22 templates (16 contoh + 4 pernyataan + 2 jelaskan); SPOK-0005 typed ISIAN with options (WRONG_METADATA); SPOK-0008 typed BENAR_SALAH with options.
- Preserve: SPOK-0001/0002/0004/0006/0007 (real MCQ). Salvage: 0003/0005/0008 (type→PG).
- Retire: 22 templates. Rebuild: contextual sentence-analysis items (find subject in a 2-clause sentence; identify missing element).
- Diagnostic suitability: **LOW–MEDIUM** (grammar is measurable, but only with richer sentences).
- Blueprint: primary competency = kalimat efektif/sintaksis; archetypes C (contextual sentence) + M (error diagnosis) + D (revision). Cognitive R2–R3. 20–30 items.
- Priority: **P1**

### Theme 2 — Antonim
- Items: 30 · Usable: 3 · Sources: master/antonim.json
- Quality: B (real antonym recall, valid keys). Defects: 27 templates.
- Preserve: ANTONIM-0001/0002/0003. Retire: 27 templates.
- Rebuild: meaning-in-context antonym (word in a sentence) + L (meaning-in-context) over bare recall; prefer passage-based where the antonym is inferable from context.
- Diagnostic: LOW alone; supports VOCABULARY evidence.
- Blueprint: archetype L + C; 15–20 items; R2. Priority: **P2**

### Theme 3 — Kalimat
- Items: 30 · Usable: 3 · Sources: master/kalimat.json
- Quality: B (kalimat-jenis classification, valid). Defects: 27 templates; KALIMAT-0003 typed BS with options.
- Preserve: KALIMAT-0001/0002/0003 (→PG). Retire: 27.
- Rebuild: kalimat efektif (D/M archetypes) — ambiguity, redundancy, subject-predicate agreement.
- Diagnostic: MEDIUM (kalimat efektif is a strong writing-evidence skill).
- Blueprint: archetype D + M; 20–30; R2–R3. Priority: **P1**

### Theme 4 — Majas
- Items: 30 · Usable: 3 · Sources: master/majas.json
- Quality: B (real figurative-language ID). Defects: 27 templates; MAJAS-0003 typed BS.
- Preserve: MAJAS-0001/0002/0003 (→PG). Retire: 27.
- Rebuild: figurative language **from authentic literary passages** (G. Poetry interpretation / F. Literary passage) — interpret effect, not just name it.
- Diagnostic: LOW alone, supports LITERATURE evidence.
- Blueprint: archetype G + F; 15–20; R2–R3. Priority: **P2**

### Theme 5 — Sinonim
- Items: 30 · Usable: 3 (1 broken) · Sources: master/sinonim.json
- Quality: E for SINONIM-0003 (key = stem word; correct = "Gagah" idx 3); B for 0001/0002.
- Preserve: SINONIM-0001/0002; fix key 0003 → 3. Retire: 27 templates.
- Rebuild: synonym-in-context (replace word in sentence without changing meaning) — L archetype.
- Diagnostic: LOW alone. Priority: **P2**

### Themes 6–18 — Tata Bahasa group (Paragraf, Ide Pokok, Gagasan Utama, Simpulan, Makna Kata, Imbuhan, Kata Baku, Kata Tidak Baku, PUEBI, Ejaan, Tanda Baca, Kalimat Efektif, Artikel)
- Items: 30 each · Usable: **0** · Sources: master/*.json
- Quality: D (100% template). **These are the highest-value diagnostic themes** (ide pokok, simpulan, makna kata, ejaan) with zero real content.
- Retire: all 30 each. Rebuild from scratch: Ide Pokok/Gagasan Utama/Simpulan → **A. Reading passage + inference** (R2–R4); Makna Kata → L (meaning-in-context); Imbuhan → C/M; PUEBI/Ejaan/Tanda Baca → D/M (editing); Kalimat Efektif → D/M; Artikel → H (functional) + A.
- Diagnostic: **HIGH** for Ide Pokok, Gagasan Utama, Simpulan, Makna Kata, Ejaan, Kalimat Efektif (core reading + writing evidence).
- Priority: **P0** for Ide Pokok, Simpulan, Makna Kata, Ejaan, Kalimat Efektif; P1 for others.

### Themes 19–32 — Sastra group (Puisi, Pantun, Syair, Gurindam, Cerpen, Novel, Drama, Fabel, Legenda, Hikayat, Mitos, Cerita Inspiratif, Poster+)
- Items: 30 each · Usable: **0**
- Quality: D. Retire: all.
- Rebuild: Cerpen/Novel → A/F (passage + unsur cerita, konflik, tokoh, amanat — evidence-based); Puisi → G (interpretation, diksi, imaji, amanat); Pantun/Syair/Gurindam → G/F (structure + pesan); Drama → F (dialog → karakter/konflik); Fabel/Legenda/Hikayat/Mitos → F (nilai, unsur).
- Diagnostic: MEDIUM–HIGH (sastra passage items discriminate comprehension + interpretation).
- Priority: **P1**

### Themes 33–44 — Jenis Teks group (Teks Deskripsi, Narasi, Eksposisi, Eksplanasi, Persuasi, Argumentasi, Prosedur, Berita, Ulasan, Editorial, Resensi, Teks Editorial)
- Items: 30 each · Usable: **0**
- Quality: D. Retire: all.
- Rebuild: **A/B/D** — the single most diagnostically valuable family. Teks Berita → H (5W+1H, fakta/opini, struktur); Teks Eksplanasi → A (sebab-akibat, struktur); Teks Argumentasi/Editorial → I (argument analysis, fakta/opini, kesimpulan); Teks Prosedur → H (urutan, verba imperatif); Teks Ulasan/Resensi → B (evaluasi + struktur).
- Diagnostic: **HIGH — top rebuild family** (this is where UKBI-style reading evidence lives).
- Priority: **P0** for Berita, Eksplanasi, Argumentasi, Editorial; P1 for others.

### Themes 45–50 — Fungsional group (Surat Pribadi, Surat Dinas, Proposal, Pidato, Poster, Iklan, Slogan)
- Items: 30 each · Usable: **0**
- Quality: D. Retire: all.
- Rebuild: H. Functional text archetype — surat dinas (bagian surat, ejaan alamat), iklan/slogan (pesan, daya tarik, struktur), pidato (struktur, tujuan), proposal (bagian).
- Diagnostic: MEDIUM (functional literacy evidence).
- Priority: **P2**

---

## 13. Top 20 Systemic Problems

1. **The generator, not content**: 1,480/1,500 items produced by 3 string templates (no editorial input).
2. **Tautology-as-correct-answer**: "contoh X → X" — no correct answer exists; leaks the key.
3. **Untestable BENAR_SALAH**: "Pernyataan: X adalah bagian dari materi" — always True, tests nothing.
4. **Fake-option ISIAN**: "Jelaskan pengertian X" with the answer as its own option.
5. **Filler-distractor reuse**: the same 3 distractors in all 50 files ("Menulis cerita pendek…").
6. **Answer-position leakage**: key 0 in every template family.
7. **Exact duplicates**: 1,330 dupes in 150 in-file families; a session can serve identical text twice.
8. **Zero stimuli**: no passages, no contexts, no functional texts in the entire bank.
9. **Recall ceiling**: ~99.9% R1; no R2–R6 anywhere.
10. **Untrustworthy metadata**: `levelBerpikir`/`difficulty` assigned arithmetically (e.g., every SULIT item is a template copy of an EASY item).
11. **Metadata approval approved taxonomy, not content**: 87 HUMAN_REVIEW/APPROVED rows, 83 templates.
12. **Open production leak**: guru send/pick serve the pool without a content gate (diagnostic is gated; these are not).
13. **Explanation template**: "X adalah jawaban yang tepat karena sesuai dengan konsep" — no pedagogy.
14. **Wrong key on a "gold" item**: SINONIM-0003 (key = stem word).
15. **Wrong types**: 7 items typed BS/ISIAN while carrying 4-option PG content.
16. **No source attribution**: provenance claims HUMAN_REVIEW for generator output.
17. **Theme overlap confusion**: Editorial/Teks Editorial, Kalimat/Kalimat Efektif — separate files, same template.
18. **No discrimination potential**: with 20 near-identical items per theme, no item can separate abilities.
19. **Curriculum mismatch**: `kelas`/`semester`/`kompetensi` fields are set but content isn't grade-appropriate (a "SULIT kelas 7" item is the same text as "MUDAH kelas 9").
20. **No render-safety concern but zero assessment value**: items render fine (CASE 2 not implicated) — the failure is 100% content (CASE 1) plus selector eligibility (CASE 3), now partly mitigated by the bank gate.

---

## 14. Recommended Rebuild Strategy

1. **Immediately**: gate the two remaining open paths (`guru/bank-soal/send`, `guru/latihan/pick`) with `isDiagnosticSafeItem` / the same template detectors used by `bank-gate.ts` — code-only, no DB change (mirror of `eef46d6`).
2. **Quarantine (DB, needs founder approval)**: re-status the 87 template metadata rows to `NEEDS_REVIEW`/`DRAFT` and mark the 1,480 template `Soal` rows inactive — so even ungated paths can't serve them. Additive, reversible, no deletion.
3. **Salvage (19 items)**: type-repair 6 (BS/ISIAN→PG), fix SINONIM-0003 key, adopt as seeds of the 5 grammar themes.
4. **Rebuild in waves (content phase, NOT this audit)**:
   - Wave 1 (P0): Teks Berita, Teks Eksplanasi, Ide Pokok, Simpulan, Makna Kata, Kalimat Efektif, Ejaan — stimulus-based reading items (10–15 per theme to start).
   - Wave 2 (P1): Argumentasi, Editorial, Cerpen, Puisi, Teks Ulasan, Gagasan Utama, SPOK, Teks Prosedur, Resensi, Anekdot.
   - Wave 3 (P2): remaining 30 themes at 10 items each minimum.
5. **Re-run every rebuilt item through**: structural validator → content gate → semantic review → duplicate gate (the Phase 7 PASS A/PASS B machinery already exists; reuse it).
6. **Set per-theme targets**: 20–30 quality items per theme for full coverage; 10 for launch-critical themes.

---

## 15. 50 Theme Blueprint Summary

| Archetype | Recommended for | Themes |
|-----------|-----------------|--------|
| A. Reading passage + inference | main idea, structure, cause-effect | Ide Pokok, Gagasan Utama, Simpulan, Teks Eksplanasi, Teks Deskripsi, Teks Narasi |
| B. Reading passage + evaluation | review, argument, editorial | Resensi, Teks Ulasan, Teks Editorial, Editorial, Teks Argumentasi |
| C. Short contextual sentence | grammar in context | SPOK, Kalimat Efektif, Imbuhan, Makna Kata |
| D. Editing / sentence revision | EYD application | PUEBI, Ejaan, Tanda Baca, Kalimat, Kalimat Efektif |
| E. Comparative text | — | (none immediate) |
| F. Literary passage | fiction elements | Cerpen, Novel, Drama, Fabel, Legenda, Hikayat, Mitos, Cerita Inspiratif |
| G. Poetry interpretation | figurative language, amanat, diksi | Puisi, Pantun, Syair, Gurindam, Majas |
| H. Functional text | practical documents | Surat Pribadi, Surat Dinas, Proposal, Pidato, Poster, Iklan, Slogan, Teks Prosedur, Teks Berita, Artikel |
| I. Argument analysis | claim/evidence/opinion | Teks Argumentasi, Teks Persuasi, Editorial, Teks Eksposisi |
| J. Data/table + language reasoning | — | (future) |
| K. Multi-sentence coherence | ordering, connectors | Paragraf, Kalimat Efektif |
| L. Meaning-in-context | vocabulary | Makna Kata, Sinonim, Antonim, Imbuhan |
| M. Error diagnosis | identify-and-fix | Ejaan, PUEBI, Kalimat Efektif, Tanda Baca |

Cognitive target per rebuilt theme: **R2 40% / R3 30% / R4 25% / R5–R6 5%** — a direct inversion of today's 99.9% R1. Difficulty: MUDAH 25% / SEDANG 45% / SULIT 30%.

---

## 16. Recommended First Theme to Rebuild

**Teks Berita (P0).** Rationale:
1. Highest diagnostic value per item (5W+1H, fakta/opini, struktur berita — clean R2/R3 evidence).
2. Curriculum-critical across kelas 7–12 (recurring KD).
3. Stimuli are easy to source authentically (real short news passages) — fastest safe authoring.
4. Blueprint is crisp: 10 items = 2× (identify info eksplisit), 2× (gagasan utama), 2× (fakta/opini), 2× (struktur), 2× (judul/purpose).

Runner-up: **Ide Pokok** (the single most taught reading skill in the curriculum) — rebuild second.

---

## 17. Rules for the New Question Factory

1. **Every item needs a stimulus** (passage, sentence, text, or functional document) — no bare definition items.
2. **One defensible answer**: the key must be provable from the stimulus alone; distractors must be plausible-but-wrong, not category errors.
3. **No answer-position patterns**: shuffle keys; never let option A be systematically correct.
4. **No terminology tautologies**: never "contoh X / jelaskan X / pernyataan X".
5. **No cross-theme filler reuse**: every distractor must belong to the item's own content domain.
6. **Cognitive mix enforced per theme** (R2 40 / R3 30 / R4 25 / R5+ 5) — not flat L1.
7. **Grade-fit content**: stimulus length and vocabulary must match the declared `kelas`.
8. **Metadata from content, not arithmetic**: difficulty/levelBerpikir assigned by human/AI review of the item, with a gate.
9. **Mandatory two-pass gate before production**: PASS A structural (fields, options≥2, key in range, no dup options) → PASS B semantic (single correct, no ambiguity, explanation ≠ template, explanation agrees with key) → duplicate-collision gate. Reuse `lib/master-repair/validate.ts`.
10. **Content gate at every delivery path** (diagnostic ✓, adaptive ✓, guru send/pick — add) — defense in depth; never trust approval status alone.
11. **Provenance honesty**: mark AI-authored items `AI_ASSISTED`, human `HUMAN_REVIEW` only after a human actually reads content; `APPROVED` only then.
12. **Answer keys server-side only**; student payloads must never carry key/explanation/scoring internals (already enforced, keep it).

---

## 18. Final Recommendation (answers to the 8 questions)

1. **Is the 50-theme bank suitable for diagnostic assessment TODAY?** **No.** 98.7% is template garbage with zero evidence value; the 19 salvageable items are recall-only. The diagnostic system currently relies on the (gated) bank fallback + AI generation — AI generation is the only working source today.
2. **KEEP / SALVAGE / REBUILD / RETIRE / BROKEN:** **0% / 1.3% (19) / 0% (as-is) / 98.7% (1,480) / 0.07% (1)**. In rebuild terms: ~100% of themes need content creation; only 19 items can seed 5 themes.
3. **Top 5 priority themes:** Teks Berita, Ide Pokok, Teks Eksplanasi, Simpulan, Makna Kata (all currently 0 usable items; all high diagnostic value; all core curriculum).
4. **Rebuild FIRST:** Teks Berita.
5. **Why:** highest per-item diagnostic value, authentic stimuli easy to source, curriculum-ubiquitous, clearest blueprint (see §16).
6. **Target per theme:** 20–30 high-quality items per theme; 10 minimum for P0 themes before relaunch.
7. **What must NOT be auto-generated:** terminology-tautology items, "jelaskan X" with self-answer options, filler-distractor MCQs, any item without a stimulus, and any item whose metadata is filled by arithmetic. AI may *draft* stimulus-based items, but every item needs the two-pass gate + human content review before APPROVED.
8. **Required validation gates before production:** PASS A structural → PASS B semantic → duplicate collision → content gate (`isDiagnosticSafeItem`) at each delivery path → human content review with `provenance=HUMAN_REVIEW` semantics → regression assertion "0 invalid candidates in diagnostic delivery pool" (already exists; extend to guru send/pick).

---

## Verification run for this audit

- **DB**: live production Supabase via pooler; read-only queries only (Soal 1,685 = 1,500 MASTER_BANK + 95 AI + 90 IMPORT; QuestionMetadata 195; UKBI 1,330; TKA 355; Game 6,250; Quiz 693; Paket 17; DailyAction 0; LearningUnit 284).
- **JSON**: all 50 master files re-parsed; template counts (1,037/294/149) re-derived and **match the Phase 7 artifact exactly** — bank unchanged since audit.
- **Prior artifacts consumed**: `master-recovery-2026-08-17.json` (1,500 classifications), `master-repair-candidates/review-2026-08-17.json` (1,481 repair records; only 1 GOLD deterministic — BC-SINONIM-0003 key fix), `docs/PHASE_7_STEP_1/2_MASTER_*.md`.
- **Code paths inspected**: `scripts/build-question-bank-data.ts` (the generator), `scripts/seed-question-bank.ts`, `app/api/guru/latihan/pick/route.ts`, `app/api/guru/bank-soal/send/route.ts`, `app/api/player/adaptive-practice/route.ts`, `app/api/player/diagnostic/route.ts` + `lib/diagnostic-ai/bank-gate.ts`, `lib/master-recovery/*`, `lib/master-repair/*`, `prisma/schema.prisma` (Soal, QuestionMetadata, UKBI/TKA/Paket models).
- **Tests**: none run — read-only audit; existing gate/journey suites (diagnostic-bank-gate 31/31, diagnostic-journey 66/66, ai-diagnostic 97/97) were green at the last shipped commits (`eef46d6`).
- **Zero writes**: no DB changes, no bank edits, no code changes in this pass.

**Files inspected (primary):** `data/question-bank/master/*.json` (50), `data/question-bank/audit/*` (8 artifacts), `MASTER_QUESTION_BANK.md`, `scripts/build-question-bank-data.ts`, `scripts/seed-question-bank.ts`, `app/api/guru/latihan/pick/route.ts`, `app/api/guru/bank-soal/{send,preview,route}.ts`, `app/api/player/adaptive-practice/route.ts`, `app/api/player/diagnostic/route.ts`, `lib/diagnostic-ai/bank-gate.ts`, `lib/question-metadata/taxonomy.ts`, `lib/master-recovery/{engine,detectors,normalize,semantics}.ts`, `lib/master-repair/{engine,validate,deterministic}.ts`, `prisma/schema.prisma`, `docs/PHASE_7_STEP_1_MASTER_RECOVERY.md`, `docs/PHASE_7_STEP_2_MASTER_AI_REPAIR.md`.

**STOP — audit complete. No questions were rewritten, no production data touched, no code changed.**