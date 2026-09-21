# GB4 — TOKOH SASTRA INDONESIA · FORENSIC AUDIT

Status: **READY FOR IMPORT** (founder approved the 5 fixes on 2026-09-20; applied to working manifest only, source files untouched).

Applied fixes (working representation, provenance per row):
- Hamka#015 → A `Di Tanah Semenanjung dan catatan haji Mandi Cahaya di Tanah Suci.` (`BC-GB4-HAMKA-025`)
- Marah Rusli#009 → A `La Hami` (`BC-GB4-MARAH-025`)
- Sapardi#006 → A `Pingkan Melipat Jarak dan Hujan Bulan Juni.` (`BC-GB4-SAPARDI-025`)
- STA#015 → A `Kalah Berjuang Menang Berjuang` (`BC-GB4-STA-025`)
- Taufiq#015 → A `Katastrofi Cinta dan Seulawah.` (`BC-GB4-TAUFIQ-025`)
- Final gate: KEEP 250 · REVIEW 0 · BLOCK 0 · exact-dups 0 · overlap vs 3.289 = 0 · 250 unique codes · 0 missing fields.
- Manifest: `data/founder-bank-gb4/manifest.json` — 250 rows (200 PG + 50 TF).

## SOURCE
- Folder: `TOKOH SASTRA INDONESIA` (10 `.md` files, flat, 6.314 lines total)
- Files: 10 (9× `TOKOH SASTRA INDONESIA — <FIGURE>.md` + `Tema_02_Pramoedya_Ananta_Toer.md`)
- Themes: 10 — Chairil Anwar, Pramoedya Ananta Toer, Amir Hamzah, Sutan Takdir Alisjahbana, Marah Rusli, Armijn Pane, Hamka, W.S. Rendra, Sapardi Djoko Damono, Taufiq Ismail
- Raw questions: 250 (10 files × declared 25 = 250 found, 0 missing)
- Format: `## SOAL NNN` blocks; `Type` PILIHAN_GANDA / BENAR_SALAH; inline `Difficulty`; `Pertanyaan:`/`Pernyataan:`; block or inline A–D; `Jawaban:` letter or BENAR/SALAH; `Pembahasan:` + `Sumber:` (Perpusnas refs preserved in manifest as `sumber`)
- Pramoedya file uses escaped-markdown + inline options (parser handles both; content verified identical quality)

## FORENSIC
- KEEP: 245 · REVIEW: 5 · BLOCK: 0
- Exact duplicates: 0 (normalized stem+options, in-corpus)
- Near duplicates: 0 (generic closing prompts differ by stimulus — verified distinct)
- Existing-bank overlap: **0 stems, 0 content rows vs 3.289 active MASTER_BANK**
- Missing explanations: 0 · Malformed: 0 · Placeholders: 0 · Subjective patterns: 0
- TF key/explanation consistency: 50/50 PASS
- PG key/explanation weak-link review: 7 sampled, all coherent (single defensible answer, plausible distractors)
- Year/fact scan (53 dated questions): canonical values (Chairil 1922/1949, STA 1908, Siti Nurbaya 1922, Sapardi 2020, Hamka 1981, Amir 1946, Poedjangga Baroe 1933, Belenggu 1940). Deep external fact-check sampled, not exhaustive — see note.

## REVIEW ITEMS (need founder decision on exact final option text)
All 5 share one pattern: option A holds author deliberation
`"<draft>" (atau "<alt>") -> Mari gunakan judul sahih: <Z>`, and the
explanation confirms Z. Proposed final A = Z (detailed below).
Nothing auto-applied; all 5 HELD OUT of the manifest.

1. Hamka#015 — A currently `*Di Bawah Lindungan Ka'bah* (atau catatan perjalanan *Mandak ke Tanah Suci* / *Di Tanah Melaka*) -> *Mari gunakan judul sahih:* *Di Tanah Semenanjung* dan catatan haji *Mandi Cahaya di Tanah Suci*.` — proposed A: `Di Tanah Semenanjung dan catatan haji Mandi Cahaya di Tanah Suci` (expl confirms).
2. Marah Rusli#009 — A `*Tesna Koesuma* (atau *La Hami*) -> *Mari gunakan judul sahih:* *La Hami*` — proposed A: `La Hami` (expl confirms).
3. Sapardi#006 — A `*Melipat Jarak* (atau novel fiksi *Pingkan Melipat Jarak*) -> *Mari gunakan judul sahih:* *Pingkan Melipat Jarak* dan *Hujan Bulan Juni*.` — proposed A: `Pingkan Melipat Jarak dan Hujan Bulan Juni` (expl confirms Pingkan).
4. STA#015 — A `*Haram Jadah* atau *Anak Haram* / *Kalah Berjuang Menang Berjuang* -> *Mari gunakan judul sahih:* *Kalah Berjuang Menang Berjuang*` — proposed A: `Kalah Berjuang Menang Berjuang` (expl confirms).
5. Taufiq#015 — A `*Dakwatul Islam dan Sajak Kemanusiaan* / *Katastrofi Cinta* -> *Mari gunakan judul sahih:* *Katastrofi Cinta* dan *Seulawah*.` — proposed A: `Katastrofi Cinta dan Seulawah` (expl confirms).

## NORMALIZATION (applied to manifest, documented per row)
- PG: 195 · True/False: 50 (options `[Benar, Salah]`, key = index, GB3 convention)
- Difficulty (source-declared, preserved): MUDAH 51 · SEDANG 134 · SULIT 60 (per-theme ≈5/14/6; target was 7/12/6 — SEDANG-heavy, no manipulation applied)
- `*`/`**` emphasis stripped (formatting only, wording preserved, `fmt_stripped: true`); leading `Stimulus:` label stripped, stimulus content preserved in text (51 rows)
- Answer distribution (pre-rotation): PG keys A=180 B=14 C=5 D=1 — extremely skewed, 7/10 themes ≥18/20 on A. Deterministic rotation planned at import-finalization (GB3 method: `sha256(stable_id) % n`, semantic assert per row, explanation letter-remap; explanations here contain 0 `Opsi-X` refs). NOT applied yet — needs founder approval with this report.
- IDs: `BC-GB4-<CODE>-<NNN>` (CHAIRIL PRAMOEDYA AMIR STA MARAH ARMIJN HAMKA RENDRA SAPARDI TAUFIQ), sequential per theme, 245 unique, `BC-GB4-` collision in DB = 0 (verified read-only)
- kelas `SEMUA`, source `MASTER_BANK`, correctAnswer = option index string (GB2/GB3 convention)

## IMPORT READINESS
- Manifest: `data/founder-bank-gb4/manifest.json` — 245 rows (5 REVIEW held out)
- Expected after founder resolves the 5: 250 rows → active 3.289 + 250 = 3.539
- Invariants for import: additive-only transaction, idempotent on kodeSoal, retired untouched, TKA (425/17/13618/681) unchanged, delivery allowlist via narrow `BC-GB4-` prefix (same mechanism as GB2), RPG pools keep MASTER_BANK exclusion

## ANSWER KEY NORMALIZATION (2026-09-20, manifest only, no DB)

Before: A=180 B=14 C=5 D=1 (200 PG; TF untouched by design).

Method (GB3 convention reused): per PG row, `target = sha256(provenance + "|" + options) % 4`,
rotate options so the correct text lands on target, remap key + explanation
letter-refs. No `Math.random`, no timestamps. TRUE/FALSE never rotated.

After: A=49 B=48 C=54 D=49.

- Rotation: deterministic / PASS (two runs from pre-normalized input → identical md5)
- Semantic integrity: 250/250 PASS (correct-answer text identical before/after; options sets identical; text/theme/difficulty/type/provenance/explanation byte-identical)
- Explanation integrity: PASS (0 letter-refs present, 0 remaps needed)
- Determinism: PASS
- Founder corrections preserved: 5/5

## GATE VERDICT
**BLOCKED — FOUNDER REVIEW REQUIRED** (5 items above). No partial import executed.
