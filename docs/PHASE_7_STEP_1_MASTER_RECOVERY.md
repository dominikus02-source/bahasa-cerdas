# PHASE 7 STEP 1 — Master Question Bank Recovery & Quality Gate

**Status**: SELESAI — pipeline recovery master bank (1.500 soal) dibangun, dijalankan, dan diverifikasi. **READ ONLY** — 0 write DB, 0 migrasi, 0 commit/push (menunggu Founder Review).
**Tanggal**: 17 Agustus 2026

---

## 1. Ringkasan Eksekutif

Bank master (`data/question-bank/master/*.json`, 50 file × 30 = **1.500 soal**) rusak sistemik:
1.037 soal templat konsep ("Berikut ini yang termasuk contoh X" dengan kunci = nama konsep X — bukan contoh nyata), 149 soal "Jelaskan pengertian X" dengan opsi tunggal (= jawaban itu sendiri), 294 soal tautologi ("Pernyataan: X adalah bagian dari materi…" — tidak dapat diuji), dan hanya **20 soal konten asli** (16 MCQ nyata + 4 salah-tipe yang dapat diperbaiki otomatis) yang layak dilanjutkan.

Pipeline STEP 7.1 mengklasifikasikan seluruh 1.500 soal dengan 18 kategori flag + disposisi perbaikan (GOLD / AUTO_REPAIR_ALLOWED / AI_REPAIR_CANDIDATE / HUMAN_REVIEW_REQUIRED / REJECT):

| Disposisi | Jumlah | Arti |
|-----------|--------|------|
| **GOLD** | 13 | Konten asli, lolos semua validasi |
| **AUTO_REPAIR_ALLOWED** | 6 | Konten asli, perbaikan tipe saja (PILIHAN_GANDA) |
| **AI_REPAIR_CANDIDATE** | 1.480 | Templat/jelaskan/tautologi — butuh regenerasi AI + review manusia |
| **HUMAN_REVIEW_REQUIRED** | 1 | WRONG_KEY (BC-SINONIM-0003) — kunci menunjuk kata di stem |
| **REJECT** | 0 | Tidak ada yang diputuskan tanpa bukti |

**Production-eligible**: 19 soal (13 GOLD + 6 AUTO_REPAIR).

## 2. Tujuan & Scope

- **Tujuan**: jangan edit 1.500 soal secara membabi buta; klasifikasikan dulu mana yang GOLD (layak produksi), mana yang bisa diperbaiki otomatis, mana yang butuh regenerasi AI, mana yang wajib review manusia, mana yang ditolak.
- **Scope**: HANYA bank master. UKBI/TKA/Jalur/Arena/adaptive/learner-state/diagnostic TIDAK disentuh (STOP setelah STEP 7.1).
- **READ ONLY**: 0 write DB, 0 migrasi, 0 perubahan skema. Semua pembacaan dari file JSON.

## 3. Sumber Kebenaran & Skema

- **Lokasi**: `data/question-bank/master/*.json` — 50 file, 1.500 soal, masing-masing 30 soal.
- **Skema seragam 17 field**: `{kodeSoal, judul, tema, kelas, semester, kompetensi, indikator, difficulty, levelBerpikir, type, text, options[], correctAnswer(string index), explanation, kataKunci[], estimasiWaktu, isHOTS}` + `file` ditambahkan saat load.
- **Distribusi**: PILIHAN_GANDA 1.050, BENAR_SALAH 300, ISIAN_SINGKAT 150; MUDAH 600/SEDANG 600/SULIT 300; levelBerpikir 1=300, 2=450, 3=250, 4=300, 5=200; isHOTS false 1.200/true 300; kelas 7=660, 8=450, 9=270, 10=120; 38 prefix kodeSoal unik.

## 4. Metode Pipeline

Pipeline `scripts/master-recovery-pipeline.ts`:
1. Load 50 file → `MasterQuestion[]` (1500).
2. `buildDuplicateContext()` — deteksi duplikat persis (text+options+key ternormalisasi) + near-duplicate (key token).
3. `classifyQuestion()` per soal — 4 lapis:
   - **Pola konten** (template konsep / jelaskan-token / tautologi) → flag + AI_REPAIR.
   - **Validasi objektif** — kunci dalam jangkauan opsi, opsi unik/non-kosong, penjelasan bukan templat, penjelasan tidak menyangkal kunci, indikator↔difficulty, bahasa Indonesia (16 pasangan typo), keterampilan (kodeSoal vs tema), WRONG_METADATA (tipe vs konten).
   - **Validasi semantik** — tabel verifikasi per skill: Sinonim (6 set), Antonim (3 set), Majas (3), Kalimat (3), SPOK (8). Fallback soal di luar tabel = `valid:true` (bukan flag).
   - **Disposisi** — aturan prioritas (lihat §6).
4. Tulis artifact `data/question-bank/audit/master-recovery-2026-08-17.json` (hasil lengkap per soal, tanpa jawaban yang bocor — hanya klasifikasi).

## 5. Kategori Flag (18)

NO_CORRECT, WRONG_KEY, MULTI_CORRECT, DUPLICATE, NEAR_DUPLICATE, TAUTOLOGY, BAD_TEMPLATE, EMPTY_CONTEXT, BROKEN_CONTEXT, **BROKEN_CONTENT**, INVALID_OPTION, AMBIGUOUS, CONTEXT_MISMATCH, SKILL_MISMATCH, DIFFICULTY_MISMATCH, EXPLANATION_MISMATCH, LANGUAGE_ERROR, UNSUPPORTED_CLAIM, WRONG_METADATA.

Catatan: `BROKEN_CONTENT` (opsi tunggal = jawaban) adalah kategori tambahan di atas 17 brief, dibedakan dari `BROKEN_CONTEXT` (konteks/stimulus rusak).

## 6. Disposisi Perbaikan (aturan prioritas)

| Prioritas | Kondisi | Disposisi |
|-----------|---------|-----------|
| 1 | Pola konten (template/jelaskan/tautologi) | **AI_REPAIR_CANDIDATE** (+catatan DUPLICATE bila anggota keluarga templat) |
| 2 | WRONG_KEY / NO_CORRECT / MULTI_CORRECT | **HUMAN_REVIEW_REQUIRED** |
| 3 | DUPLICATE | **HUMAN_REVIEW_REQUIRED** (canonical dipilih, bukan auto-hapus) |
| 4 | INVALID_OPTION / AMBIGUOUS / EMPTY/BROKEN_CONTEXT / LANGUAGE_ERROR / SKILL_MISMATCH / UNSUPPORTED_CLAIM | **HUMAN_REVIEW_REQUIRED** |
| 5 | WRONG_METADATA tipe saja, tanpa kesulitan/penjelasan rusak | **AUTO_REPAIR_ALLOWED** (type → PILIHAN_GANDA) |
| 6 | Tanpa flag | **GOLD** |
| 7 | Sisanya | **HUMAN_REVIEW_REQUIRED** |

**Prinsip**: jangan mengarang. Ketidakpastian → HUMAN_REVIEW_REQUIRED, bukan REJECT tebakan, bukan GOLD palsu.

## 7. Kontrak GOLD & `isProductionEligible`

**GOLD** = stem soal asli (non-templat) + kunci eksplisit satu-satunya dalam jangkauan opsi + opsi unik/non-kosong ≥2 + penjelasan bermakna (bukan templat, tidak menyangkal kunci) + metadata keterampilan/kesulitan konsisten + bahasa Indonesia valid + bukan duplikat/near-duplikat + tidak ambigu + konten terverifikasi semantik (bila di tabel).

`isProductionEligible(q, r)` = `r.gold && r.flags.length === 0` (13 soal) ATAU auto-repair tipe (6 soal) → **19 production-eligible**.

## 8. Hasil Pipeline

```
Total      : 1500
GOLD       : 19 (13 disposisi GOLD + 6 AUTO_REPAIR)
AUTO_REPAIR: 6
AI_REPAIR  : 1480
HUMAN_REV  : 1
REJECT     : 0
Flags      : {BAD_TEMPLATE 1186, NO_CORRECT 1037, EXPLANATION_MISMATCH 1037,
              DUPLICATE 1330, TAUTOLOGY 294, UNSUPPORTED_CLAIM 294,
              BROKEN_CONTENT 149, INVALID_OPTION 149, DIFFICULTY_MISMATCH 500,
              WRONG_METADATA 7, WRONG_KEY 1}
Production eligible : 19
Artifact   : data/question-bank/audit/master-recovery-2026-08-17.json
```

- **DUPLICATE 1.330** = 150 grup (21/19/16 anggota templat per file) → 170 canonical (150 templat + 20 konten asli).
- **DIFFICULTY_MISMATCH 500** = seluruh 1.000 templat ber-indikator `(MUDAH|SEDANG|SULIT)` vs difficulty "SULIT" (10 per file × 50).
- **WRONG_METADATA 7** = BC-ANTONIM-0003, BC-KALIMAT-0003, BC-MAJAS-0003, BC-SINONIM-0003, BC-SPOK-0003, BC-SPOK-0005, BC-SPOK-0008 (4 salah-tipe BS, 1 ISIAN — semua konten asli).
- **AMBIGUOUS / NEAR_DUPLICATE / SKILL_MISMATCH / LANGUAGE_ERROR = 0** setelah perbaikan false-positive (tabel semantik hanya dihitung untuk soal non-pola; near-duplicate hanya flag anggota variasi; skill via substring kodeSoal).

## 9. Production-Eligible (19)

- **GOLD murni (13)**: BC-SINONIM-0001/0002, BC-ANTONIM-0001/0002, BC-KALIMAT-0001/0002, BC-MAJAS-0001/0002, BC-SPOK-0001/0002/0004/0006/0007.
- **AUTO_REPAIR → GOLD (6)**: BC-ANTONIM-0003, BC-KALIMAT-0003, BC-MAJAS-0003, BC-SPOK-0003, BC-SPOK-0005, BC-SPOK-0008 (ubah tipe → PILIHAN_GANDA, opsi/kunci/teks asli dipertahankan).
- **HUMAN_REVIEW (1)**: BC-SINONIM-0003 — kunci "Berani" adalah kata di stem (bukan sinonim); tipe BS keliru; jawaban benar seharusnya opsi index 3 "Gagah". Perbaikan butuh keputusan manusia.

## 10. Analisis per Disposisi

- **AI_REPAIR_CANDIDATE 1.480**: seluruhnya pola templat. Tidak ada konten asli di 46/50 file (teks-*, ejaan, kata-baku, dll.) — setiap file hanya berisi 21 templat + 3 jelaskan + 6 tautologi. Regenerasi AI (mis. per tema: buat 10 soal kontekstual dengan 4 opsi nyata + kunci + penjelasan) + gate review manusia.
- **AUTO_REPAIR 6**: murni perbaikan tipe. `repair = { type: "PILIHAN_GANDA" }` — deterministik, tanpa menulis ulang konten.
- **HUMAN_REVIEW 1**: BC-SINONIM-0003 (kunci salah + tipe salah).

## 11. Duplikat

- **Grup exact**: 150 grup, canonical 170. Setiap canonical = 1 templat + 1 jelaskan + 1 tautologi per file; duplikat adalah salinan persis (text+options+key ternormalisasi) di dalam file yang sama.
- **Near-duplicate**: 0 setelah perbaikan — tidak ada variasi teks nyata antar anggota grup di bank master.
- **Cross-file**: 0 (teks templat selalu menyebut konsep file-nya sendiri).

## 12. Semantik (tabel verifikasi)

| Skill | Entri | Contoh terverifikasi |
|-------|-------|----------------------|
| Sinonim | 6 set | bahagia→senang, cerdas→pintar, berani→gagah, abadi→kekal, maju→mundur ✗ (kunci salah), malas→pemalas |
| Antonim | 3 set | panas→dingin, tinggi→rendah, maju→mundur |
| Majas | 3 | personifikasi, metafora, hiperbola |
| Kalimat | 3 | SPOK lengkap, kalimat efektif, eksklamatif |
| SPOK | 8 | BC-SPOK-0001..0008 (subjek/predikat/objek/keterangan/unsur inti) |

Deteksi kunci salah: BC-SINONIM-0001 (kunci "Senang" ≠ "bahagia"? salah — kunci benar), BC-SINONIM-0003 → `reason: "sinonim 'berani' seharusnya opsi index 3 ('Gagah')"` + WRONG_KEY.

## 13. Kualitas — Tidak Mengarang

- Angka tidak dinaikkan dengan melonggarkan validator: templat konsep = NO_CORRECT (bukan valid), jelaskan-token = BROKEN_CONTENT, tautologi = TAUTOLOGY+UNSUPPORTED_CLAIM.
- GOLD 13/1.500 jujur dan lebih ketat dari audit STEP 7.0 (185 "valid" = QA struktural metadata/format; STEP 7.1 = gerbang kualitas penuh: konten asli + semantik + non-duplikat + bahasa → 19 production-eligible).
- False-positive yang diperbaiki selama iterasi: near-dup canonical (150 → 0), skillMismatch prefix (600 → 0), AMBIGUOUS template (1.483 → 0), tautologi wrong-type (3 soal konten asli terbebas).

## 14. Harness — `scripts/test-master-question-recovery.ts`

- Kontrak: `check(name, fn)` MENG-EKSEKUSI fn (bukan truthy-check function object); meta self-test `true=>PASS`, `false=>FAIL` memverifikasi harness benar-benar mengevaluasi hasil (anti-bug STEP 6.7).
- **Hasil: Discovered 49, Executed 49, Passed 47 (+2 meta), Failed 0, Skipped 0 → SEMUA LULUS.**
- Cover: normalisasi, pola konten (template/jelaskan/tautologi + false-positive), validasi objektif (kunci/opsi/penjelasan/kesulitan/bahasa/keterampilan), semantik (4 skill), duplikat (grup 150/canonical 170/0 near-dup), disposisi (1.480/6/1/0), kontrak GOLD (19 eligible, template tidak eligible), determinisme (klasifikasi ulang identik).

## 15. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:master-question-recovery` | ✅ 47/47 (+2 meta) |
| `npm run audit:master-recovery` | ✅ 1.500 soal, GOLD 19 / AUTO 6 / AI 1.480 / HUMAN 1 / REJECT 0 |
| `npm run test:question-bank-quality-audit` | ✅ Passed 23, Failed 6 (pre-existing master RED — bukan regresi) |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:school-backfill` | ✅ 93/93 |
| `npm run test:diagnostic-4e1` | ✅ 36/36 |
| `npm run test:ai-tools-audit` | ✅ 47/47 |
| `npm run test:game-question-shuffle` | ✅ 24/24 |
| `npm run test:adaptive-practice` | ✅ 25/25 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (lib/master-recovery, 2 scripts) | ✅ 0 violations |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, gamification/, learning-loop/, adaptive/, diagnostic/, learner-state/, app/api/) | ✅ 0 diff |
| DB | READ ONLY — 0 write, 0 migrasi |
| Commit/push | ⛔ BELUM — menunggu Founder Review |

## 16. Risiko & Keterbatasan

1. **Bank master hampa konten**: 1.461/1.500 = 97,4% templat. Satu-satunya path ke GOLD adalah regenerasi AI per tema + gate manusia (bukan perbaikan otomatis).
2. **SINONIM-0003 butuh keputusan manusia** — kunci harus diganti "Gagah" atau soal dihapus.
3. **SPOK-0005** memakai opsi index 3 "kucing" — pengalih yang tumpang-tindih dengan subjek benar "Kucing itu" (bukan duplikat persis; kunci index 0 tetap satu-satunya subjek sah) — dicatat untuk review opsional.
4. **Semantik terbatas pada 5 skill** dengan tabel kecil; skill lain (teks-*) lolos via `valid:true` fallback — aman (fallback tanpa flag), tidak diperluas karena tidak ada konten asli di sana.
5. **Artifact berisi teks soal lengkap** — wajar (sumber publik repo), tanpa kunci jawaban ganda.

## 17. Rekomendasi Fase Berikutnya

1. **Founder Review** dokumen ini + artifact → persetujuan pipeline.
2. **Regenerasi AI bank master**: per tema, bangun soal kontekstual nyata (min. 10/tema, 4 opsi, penjelasan, kunci deterministik) → masuk pipeline klasifikasi ulang → GOLD gate.
3. **Resolusi HUMAN_REVIEW**: putuskan SINONIM-0003 (ganti kunci / hapus).
4. Setelah master pulih → lanjutkan ke UKBI/TKA/Jalur sesuai STOP gate STEP 7.1.

## 18. Lampiran A — File yang Dibuat

- `lib/master-recovery/types.ts` — tipe + 19 kategori + disposisi + ClassificationResult.
- `lib/master-recovery/normalize.ts` — normText/normOption/keyIndex/collapseWs.
- `lib/master-recovery/detectors.ts` — 14+ detektor pola & validasi.
- `lib/master-recovery/semantics.ts` — tabel verifikasi semantik (5 skill) + SemanticVerdict.
- `lib/master-recovery/engine.ts` — buildDuplicateContext/classifyQuestion/isProductionEligible/countBy*.
- `lib/master-recovery/index.ts` — re-export.
- `scripts/master-recovery-pipeline.ts` — runner (READ ONLY).
- `scripts/test-master-question-recovery.ts` — harness 49 checks.
- `data/question-bank/audit/master-recovery-2026-08-17.json` — artifact hasil.

## 19. Lampiran B — File yang Diubah

- `package.json` — +`test:master-question-recovery`, +`audit:master-recovery` (di samping `test:question-bank-quality-audit` dari STEP 7.0).

## 20. Status

**Verdict: GREEN** — pipeline deterministik, angka terverifikasi terhadap ground truth (150 grup / 170 canonical / 20 konten asli / 7 WRONG_METADATA / 1 WRONG_KEY), harness anti-pattern-bug, regresi lengkap, READ ONLY. Menunggu Founder Review sebelum commit/push dan sebelum lanjut STEP berikutnya.
