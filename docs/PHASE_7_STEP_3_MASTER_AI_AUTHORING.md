# PHASE 7 STEP 3 — MASTER QUESTION AI AUTHORING & SEMANTIC REPAIR

**Status**: SELESAI (pilot + QA) — **BELUM di-commit/push; menunggu Founder Review.**
**Stamp**: 2026-08-17

## 1. Tujuan
Repair AI_ISSUE (7.1) / AI_REPAIR (7.2) menjadi soal baru yang siap pakai: mesin authoring
master (`lib/master-authoring/`) meminta AI membuat soal baru (stem/opsi/kunci/penjelasan),
lalu **5 gerbang validasi + validasi semantik** memastikan soal itu benar, tidak mencontek
bank, tidak mengandung tautologi/jawaban terbenam/multi-jawaban, dan aman anti-halusinasi.

## 2. Arsitektur
```
MasterQuestion (7.2) → [prompts] → AI (DeepSeek→Groq 120b→20b) → {decision, question, evidence…}
→ parseContract ketat (gagal → INVALID_CONTRACT) → routeByConfidence
→ gates A–E (REJECT/HUMAN_REVIEW_REQUIRED/GOLD) → record + summarize
```

## 3. Hasil Harness QA (`test:master-question-ai-authoring`, 35 check)
**34 PASS + 1 kanari (real fail 0) — exit 0.**
- Provider: T.01 provider failure → REPAIR_FAILED+PROVIDER_FAILED; T.02 retry lalu sukses; T.05 tanpa executor.
- Contract: T.03 empty / T.04 malformed JSON → INVALID_CONTRACT; T.11 opsi < 2.
- Gates: T.07+ GOLD valid SINONIM/ANTONIM/EJAAN/MAKNA_KATA/KONSEP; T.08+ SPOK/MAJAS/KALIMAT_EFEKTIF → HUMAN_REVIEW_REQUIRED (jujur, tanpa tabel verifikasi); T.09 self-answer; T.10 multi-correct; T.12 penjelasan template; T.13 tautologi; T.14/15/16 duplikat & near-duplicate vs bank/batch; T.17–19 evidence & kontrak halusinasi; T.20 corrupt per-gate; T.21/22 routing REJECT/HUMAN_REVIEW; T.24 idempotensi; T.26 statistik; T.06 tanpa kebocoran secret.

**Fix kunci selama QA**: `answerIndex()` (kunci AI berupa teks opsi → index via normOption); `mq()` membawa explanation (fix penjelasan-template); languageError hanya memindai stem+explanation dengan kutipan ('…') dinormalkan (opsi EJAAN sengaja memuat salah eja); cek "stem-berakhiran =/ialah/adalah" dihapus (phrasering MCQ normal; leakage tetap dijaga passE); passD near-hit membandingkan kunci bank ter-resolve vs kunci kandidat; engine hanya menandai INVALID_CONTRACT bila `attempted && contract null && errorCode undefined` (error provider tidak tertimpa); classifySkill menangkap /bermakna|maknanya/ → MAKNA_KATA.

## 4. Hasil Pilot 50 (Groq nyata, `pilot:master-ai-authoring`, 3 pass resume)
| Metrik | Nilai |
|--------|-------|
| Total diproses | 50 (checkpoint resume; 4 masih PROVIDER_FAILED rate-limit 429 Groq) |
| **GOLD** | **2** (BC-CERPEN-0010 KONSEP, +1) |
| **HUMAN_REVIEW_REQUIRED** | **44** |
| REPAIR_FAILED | 4 (semua HTTP 429 Groq free tier) |
| INVALID_CONTRACT | 2 (BC-CERPEN-0021/0029 — AI keluar dari kontrak) |
| Provider | groq 46, unknown 4 |
| GateFailures | passA 0 · passB 4 · passC 0 · passD 112 · passE 38 |
| avgLatencyMs | 2456 |

**Bacaan**: passD mendominasi = pembersih duplikat bekerja keras (kandidat near-duplicate
bank/family/batch di-DOWNGRADE jujur ke HUMAN_REVIEW, bukan dipaksa GOLD). passA 0 = tidak
ada jawaban di luar opsi. 2 INVALID_CONTRACT diverifikasi: AI mengirim soal yang tidak
memenuhi kontrak ketat → aman, tidak bocor ke GOLD.

## 5. Keamanan
- Source (MasterQuestion asli) TIDAK pernah dimutasi; `sourcePreserved` diverifikasi.
- `correctAnswer` AI (teks) dikonversi ke **index** di dalam gates; record GOLD hanya memuat soal dengan kunci valid (index in-range, passC `kunci-objektif`).
- Error sanitized (regex `sk-[A-Za-z0-9_-]+`/`AIza[0-9A-Za-z_-]+`), tanpa secret; harness T.06 & pilot memverifikasi 0 pola key di artifact.
- Artifact review (untuk manusia) sengaja TIDAK memuat candidate question.

## 6. Artifacts
- `data/question-bank/audit/master-authoring-pilot-2026-08-17.json` (50 records + stats)
- `data/question-bank/audit/master-authoring-review-2026-08-17.json` (44 review)
- `data/question-bank/audit/master-authoring-checkpoint-2026-08-17.json` (resume-safe)

## 7. Verifikasi
| Check | Hasil |
|-------|-------|
| `npm run test:master-question-ai-authoring` | ✅ 34 pass, real fail 0 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (lib/master-authoring + pilot + harness) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 |
| DB | ✅ 0 write / 0 migrasi (read-only terhadap bank) |

## 8. Verdict & Next
**YELLOW — layak lanjut, perlu review founder**:
1. 44/50 kandidat menunggu **human review** (`master-authoring-review-2026-08-17.json`) sebelum seed/commit ke bank — proses approval gate 4B.6 bisa dipakai ulang.
2. 4 soal tersisa PROVIDER_FAILED (429) — resume `--offset=0 --delay=4000` saat rate limit longgar.
3. Groq free tier rate-limit ketat → opsi: upgrade kuota, atau batch 10–25 dengan `--delay`.

**Belum di-commit/push — menunggu instruksi Founder** (pola fase 4E/5.x).
