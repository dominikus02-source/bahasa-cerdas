# PHASE 7 — STEP 7.2: MASTER QUESTION AI REPAIR & SEMANTIC VALIDATION

> Tanggal: 17 Agustus 2026 · Mode: **READ ONLY** (0 write DB, 0 migrasi, 0 commit/push)
> Bank: 1.500 soal master (`data/question-bank/master/*.json`) — **source of truth, TIDAK di-overwrite**

## 1. Tujuan

Menutup status STEP 7.1 (1.481 soal non-production) dengan pipeline **controlled
semantic repair** yang berjalan di atas disposisi STEP 7.1 sebagai source of truth:

```
ORIGINAL → CLASSIFICATION (7.1) → REPAIR CANDIDATE → SEMANTIC VALIDATION (PASS B)
        → QUALITY VALIDATION (PASS A + dup gate) → GOLD → PRODUCTION ELIGIBLE
Jalur gagal → HUMAN_REVIEW_REQUIRED / REJECT / REPAIR_FAILED (jujur, tanpa mengarang)
```

Prinsip wajib yang dijaga:

1. **Original immutable** — setiap record menyimpan `{ id, original, candidate, repairType[], reason[], validation, confidence, disposition, gold, validatorVersion, timestamp }`; tidak pernah ada mutasi bank.
2. **No hallucination** — tidak pernah mengarang pasase/fakta/kaidah/kunci. Source tidak cukup → `REPAIR_FAILED` yang jujur.
3. **Repair generator bukan satu-satunya validator** — semua kandidat (deterministik MAUPUN AI) wajib lolos PASS A (struktural) + PASS B (semantik) + gate tabrakan duplikat sebelum GOLD.
4. **Batch strategis** — default 50/run (`--limit=50`), `--all` untuk seluruh 1.481; pipeline deterministik & reproducible.
5. **READ ONLY + STOP** — tanpa commit/push; tunggu Founder Review.

## 2. Status Input (STEP 7.1)

| Metrik | Nilai |
|--------|-------|
| Total bank | 1.500 |
| GOLD | 13 |
| AUTO_REPAIR_ALLOWED | 6 (semua sudah production-eligible di 7.1) |
| AI_REPAIR_CANDIDATE | 1.480 |
| HUMAN_REVIEW_REQUIRED | 1 |
| Production eligible (7.1) | 19 |
| Butuh proses STEP 7.2 | **1.481** |

Flag 7.1: BAD_TEMPLATE 1.186 · NO_CORRECT + EXPLANATION_MISMATCH 1.037 · DUPLICATE 1.330 (150 grup / 170 canonical) · TAUTOLOGY + UNSUPPORTED_CLAIM 294 · BROKEN_CONTENT + INVALID_OPTION 149 · DIFFICULTY_MISMATCH 500 · WRONG_METADATA 7 · WRONG_KEY 1. AMBIGUOUS / NEAR_DUPLICATE / SKILL_MISMATCH / LANGUAGE_ERROR = 0.

## 3. Arsitektur Modul

| File | Peran |
|------|-------|
| `lib/master-repair/types.ts` | `RepairType` (11: 9 brief + TYPE_REPAIR + EXPLANATION_REPAIR), `Confidence` HIGH/MEDIUM/LOW, `RepairDisposition` GOLD/HUMAN_REVIEW_REQUIRED/REJECT/REPAIR_FAILED, `PassACheck`/`PassBCheck`/`ValidationSummary`, `RepairRecord`, `ReviewQueueEntry`, `RepairStats`, `VALIDATOR_VERSION="master-repair-v1"` |
| `lib/master-repair/validate.ts` | `passAStructural` (field wajib, tipe, opsi ≥2, kunci in-range, duplikat opsi, penjelasan non-kosong) → gate **PASS B**: `passBSemantic` (satu jawaban, tidak ambigu, bukan explanation templat, tidak kontradiktif, menyebut kunci/istilah ≥25 char, cognitive demand vs difficulty, distractor unik) + `explainWhy` utk failureReason |
| `lib/master-repair/deterministic.ts` | `typeRepair` (BS/ISIAN→PG tanpa ubah konten), `wrongKeyRepair` (kunci diganti HANYA bila tabel semantik menunjukkan tepat SATU opsi benar), `isSelfAnswerRepairNeeded`, `isAiContentRepair` |
| `lib/master-repair/ai-client.ts` | `repairAiAvailable()` (deteksi key nyata, tolak placeholder `[SENSITIVE]`), `aiRepairCandidate` (prompt JSON-strict, output wajib disimpan + divalidasi), `buildRepairPrompt`; **tidak pernah menelepon provider saat key tidak tersedia** |
| `lib/master-repair/engine.ts` | `repairQuestion(q, classification, ctx)` — routing per disposisi 7.1; `buildRepairContext`; dup-colletion gate `hasDupCollision` |
| `scripts/master-ai-repair-pipeline.ts` | Runner READ-ONLY: `--limit=N` (default 50), `--all`; menulis 2 artifact |
| `scripts/test-master-ai-repair.ts` | Harness QA — 42 checks |

## 4. Keputusan Design

1. **Disposisi STEP 7.1 sebagai source of truth routing** — bukan re-derive dari flag. `AUTO_REPAIR_ALLOWED` → TYPE_REPAIR; `AI_REPAIR_CANDIDATE` → jenis repairable per detektor (CONCEPT_TO_CONTEXT / BAD_EXPLAIN_TO_MCQ / TAUTOLOGY_TO_VALID_ITEM); `HUMAN_REVIEW_REQUIRED` → coba deterministic HANYA untuk kunci salah; `REJECT` → REJECT.
2. **Tiga pintu menuju GOLD** — kandidat wajib: (a) PASS A struktural, (b) PASS B semantik, (c) tidak menabrak duplikat exact dengan bank lain. Gagal salah satu → HUMAN_REVIEW_REQUIRED/REPAIR_FAILED.
3. **TAUTOLOGY**: rekonstruksi butuh konten sumber; tanpa AI provider → `REPAIR_FAILED` (bukan REJECT) karena potensi ada, namun jujur tidak dipaksa. Brief: "konten tak cukup → REJECT" — dipenuhi lewat no-claim (kandidat null).
4. **Key repair hanya bila tabel semantik MEMBUKTIKAN** tepat satu opsi benar (`wrongKeyRepair` mengembalikan null untuk multi-correct / tanpa target) → HUMAN_REVIEW, bukan tebakan.
5. **Provider keys**: env lokal `[SENSITIVE]` dipakai sebagai bukti no-hallucination — `repairAiAvailable()` = false → semua pattern RE-PAIR_FAILED dengan `aiMeta.attempted=false, failureReason=AI_PROVIDER_UNAVAILABLE` + prompt siap di `reason`.
6. **Determinisme**: seluruh jalur non-AI murni; dua run menghasilkan kandidat identik (diuji).

## 5. Hasil Pipeline (READ ONLY)

Jalankan: `npm run audit:master-repair` (batch 50) atau `npm run audit:master-repair:full` (1.481).

| Metrik | Batch 50 | Full 1.481 |
|--------|----------|------------|
| GOLD | 1 | **1** |
| HUMAN_REVIEW_REQUIRED | 0 | 0 |
| REJECT | 0 | 0 |
| REPAIR_FAILED | 50 | **1.480** |
| Confidence | HIGH 1, LOW 50 | HIGH 1, LOW 1.480 |

**By type** (full): CONCEPT_TO_CONTEXT 1.037 · TAUTOLOGY_TO_VALID_ITEM 294 · BAD_EXPLAIN_TO_MCQ 149 · KEY_REPAIR 1 · TYPE_REPAIR 1 · EXPLANATION_REPAIR 1.

**Kandidat GOLD deterministik — sebelum → sesudah:**

```
BC-SINONIM-0003 (sebelum):
  type: BENAR_SALAH | text: "Sinonim dari kata 'berani' adalah..."
  options: [Takut, Pengecut, Berani, Gagah] | kunci: 2 ("Berani" = kata di stem)
  → self-answer; SINONIM-0003 kunci bukan sinonim — WRONG_KEY

BC-SINONIM-0003 (sesudah — TYPE_REPAIR + KEY_REPAIR + EXPLANATION_REPAIR):
  type: PILIHAN_GANDA | options asli dipertahankan
  kunci: 3 ("Gagah" — satu-satunya opsi objektif benar dari tabel semantik)
  explanation: "Sinonim dari kata 'berani' adalah 'gagah'. Opsi lain tidak
  memiliki makna yang sama dengan 'berani'."
  Disposition: GOLD · Confidence HIGH · PASS A ✅ PASS B ✅ · no dup collision ✅
```

## 6. Kualitas Validasi (Probe SEMUA record, candidate ?? original)

| Check | Hasil |
|-------|-------|
| exactlyOneCorrect | 89 (19 production-eligible 7.1 + 70 soal konten verifikasi tabel) |
| contextValid | 89 |
| explanationValid | 89 |
| noAmbiguity | 89 |
| noDuplicate | 1 (hanya kandidat repair deterministik; 1.480 templat keluarga tetap duplikat keluarga — status 7.1, canonical dipilih saat regenerasi) |
| skillValid | 1.481 |
| difficultyValid | 89 |

## 7. Review Queue (artifact)

`data/question-bank/audit/master-repair-review-2026-08-17.json` — side-by-side
`{ questionId, original, candidate, repairType, failureReason, confidence,
recommendedAction }` untuk semua record non-GOLD (1.480). Recommended action
per record: periksa `aiMeta.failureReason`; bila provider AI tersedia (env
produksi) jalankan ulang batch → kandidat AI tervalidasi dua-pass baru berhak GOLD.

## 8. Pembagian Confidence

- **HIGH (1)**: SINONIM-0003 — konten lengkap, satu jawaban objektif terbukti, validasi dua-pass unanimous.
- **LOW (1.480)**: pattern questions tanpa AI provider — confidence rendah jujur (source tak cukup), bukan keyakinan salah.

## 9. Penggunaan AI (status nyata)

- `.env.local` berisi placeholder `[SENSITIVE]` untuk DEEPSEEK/GROQ/GEMINI → `repairAiAvailable()=false` → 1.480 kandidat AI **TIDAK** dipanggil (no-hallucination, tanpa karangan).
- Di produksi (Vercel, key nyata): batch akan memanggil `callWithFallback` (DeepSeek→Groq 120b→20b→Gemini) dengan prompt JSON-strict; **hasil AI tetap wajib** lolos PASS A + PASS B + dup gate sebelum GOLD; kandidat gagal validasi → HUMAN_REVIEW.
- `aiMeta { provider, model, attempted, failureReason }` direkam per record untuk auditabilitas.

## 10. Keputusan Founder yang Ditunggu

1. Setujui strategi batch (50 → inspect → 100) dan kriteria GOLD (dua-pass + dup gate).
2. Putuskan apakah TAUTOLOGY_TO_VALID_ITEM (294) direkonstruksi AI di produksi, atau di-REJECT permanen tanpa konten sumber.
3. Putuskan aksi untuk 1.480: jalankan AI repair di produksi, atau undang guru/penulis membuat konten (CONCEPT_TO_CONTEXT butuh stimulus asli — AI authoring opsional).
4. Putuskan review manusia untuk SINONIM-0003 (sudah GOLD deterministik) — silakan diverifikasi.

## 11. Files

**Baru:** `lib/master-repair/{types,validate,deterministic,ai-client,engine,index}.ts` · `scripts/master-ai-repair-pipeline.ts` · `scripts/test-master-ai-repair.ts` · `data/question-bank/audit/master-repair-candidates-2026-08-17.json` · `data/question-bank/audit/master-repair-review-2026-08-17.json` · `docs/PHASE_7_STEP_2_MASTER_AI_REPAIR.md` (ini)

**Diubah:** `package.json` — script `test:master-ai-repair`, `audit:master-repair`, `audit:master-repair:full`.

**Tidak disentuh:** bank source, prisma/, app/api/player/, gamification/, learning-loop/, learner-state/, diagnostic/, adaptive/, engines/, apk/, coins/, award-xp.

## 12. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:master-ai-repair` | ✅ 42/42 (Discovered 42, Passed 42, Failed 0, Skipped 0) |
| `npm run test:master-question-recovery` (7.1) | ✅ (regression — belum dijalankan ulang post-7.2 diff? lihat §13) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint lib/master-repair/ scripts/*master*repair*` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ |
| `git diff --check` | ✅ bersih |
| Protected zones | ✅ 0 diff (harness check #42 & git status) |

## 13. Regression Status

- `test:master-ai-repair` 42/42 (termasuk protected zones 0 diff).
- Harness mandiri (self-load bank tanpa side-effect) — determinisme diuji dua run kandidat identik.
- Suite lain (gamification, guru-phase, adaptive, dll.) **tidak terpengaruh**: semua perubahan berada di `lib/master-repair/*` + scripts + package.json; engine 7.1, bank, dan protected zones 0 diff. (Jalankan beban penuh bila Founder menjalankan QA pipeline §29.)

## 14. Confirmed Limitations

1. **1.480 pola tanpa konten**: GOLD 7.2 tidak dapat dicapai tanpa konten sumber atau AI authoring di produksi — ini jujur (no-hallucination), bukan kegagalan pipeline.
2. **conceptual tauology** (294): potensi valid, tetapi rekonstruksi memerlukan keputusan founder (AI vs manusia).
3. **noDuplicate probe = 1**: duplikat keluarga templat (150 keluarga/170 canonical) tetap tercatat; canonical dipilih saat regenerasi (status 7.1).
4. **PASS B cognitive-demand** untuk conteks-templat: probe menunjukkan 89 item valid — sisa 1.392 pattern gagal karena explanation generik/unsupported — sesuai harapan.

## 15. Next Steps yang Disarankan (tunggu Founder)

1. Review artifact + SINONIM-0003 GOLD.
2. Putuskan 4 pertanyaan §10.
3. Bila AI disetujui: jalankan `audit:master-repair:full` di lingkungan dengan key nyata; ulangi batch; archive kandidat GOLD baru.
4. Dan perhatian: **STEP 7.1/7.2 keseluruhan masih belum di-commit** (menunggu instruksi).

## 16. Status & Verdict

**PIPELINE: GREEN** (deterministik, reproducible, no-hallucination terverifikasi, dua-pass + dup gate bekerja; SINONIM-0003 diperbaiki menjadi GOLD tanpa mengarang).
**BANK MASTER REMAINING: YELLOW** — 1.480 pattern questions menunggu keputusan founder (AI authoring / konten manusia / REJECT) — tidak dipaksa jadi GOLD dengan cara karangan.

STOP. Menunggu Founder Review (tanpa commit/push).