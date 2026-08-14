# GAME QUESTION QUALITY REPORT

Fase: Game Question Quality, Repair & Question Bank Expansion
Prinsip: GAMEPLAY FUN + LEARNING VALUE + QUESTION RELIABILITY
Status: SELESAI — menunggu Founder Review (belum commit/push)

## 1. Total Game (inventori sumber soal)
| Game | Sumber soal | Format | Jawaban | Randomisasi |
|------|-------------|--------|---------|-------------|
| Menara Cerdas | `lib/game/question-bank` + harvest Jalur Cerdas (DB) | `{soal, opsi[], jawaban(index), penjelasan, lvl}` | index → teks opsi | `pickRampedQuestions` band EASY/MEDIUM/HARD, subset acak |
| Benar atau Salah | sama (via `/api/game/menara`) | sama | sama | sama |
| Kuis Tempur Solo | `QUESTION_BANK` (kini EXPANDED) | sama | index | `kocok()` (Fisher-Yates) + kantong refill |
| Tantang (1v1) | snapshot harvest (`/api/game/tantang`) | sama + shuffle opsi | index (snapshot server) | seeded shuffle server |
| Katastra (KataPlay) | `components/game/kataplay-content.ts` | `{type, instruction, correctAnswer(text), options[]}` | teks opsi | shuffle klien + pilih level |
| Game solo lain (Tebak/Susun/Irama/Lari) | via `/api/game/menara` (satu bank bersama) | sama | index | sama |
| Harvest Jalur Cerdas | `lib/game/harvest.ts` → DB LearningUnit (type JALUR) | normalisasi `{soal, opsi, jawaban}` | index | band lvl 1–12 |

## 2. Total Questions (sebelum → sesudah)
| Bank | Sebelum | Sesudah |
|------|---------|---------|
| QUESTION_BANK (kurasi inti) | 142 | 142 (utuh, tidak di-rewrite) |
| **BANK_EKSPANSI_2026** (baru) | 0 | **+82** (10 Kata Baku, 8 Sinonim, 8 Antonim, 10 Imbuhan, 8 Ejaan, 8 Kalimat Efektif, 6 SPOK, 8 Makna/Majas, 16 Pemahaman Teks) |
| **TOTAL bank MCQ** | 142 | **224** |
| Katastra (kataplay-content) | 73 | **+15 (level baru "Eksplorasi Kata 2": kata benda, kata kerja, kalimat tanya)** = **88** |
| Harvest (bank + DB Jalur Cerdas) | ~390+ | otomatis bertambah via EXPANDED |

## 3. Broken Questions (audit → repair)
- **Struktural (opsi<4, index out-of-range, opsi duplikat, placeholder)**: 0 ditemukan pada 142 inti + 73 katastra + 82 ekspansi.
- **Answer integrity**: 0 salah kunci; 0 multiple-correct; 0 missing answer.
- **False-positive validator yang diperbaiki**: deteksi "opsi duplikat" kini **case-sensitive** — 4 soal ejaan ("17 Agustus 1945" vs "17 agustus 1945", "Bandung" vs "bandung") sempat ter-flag; perbedaan kapitalisasi adalah pembeda SAH pada soal ejaan.
- **Dedupe false-positive yang diperbaiki**: duplikat persis kini memakai tuple (pertanyaan+jawaban+opsi), bukan teks pertanyaan saja — instruksi berulang katastra ("Huruf apa ini?" dengan jawaban berbeda) bukan duplikat.
- **1 typo ekspansi diperbaiki**: opsi "TOP! " → "TOPI".

## 4. Repaired Questions
- 0 repair konten (semua existing valid — sesuai prinsip "jangan ubah soal yang sudah valid").
- 2 perbaikan LOGIKA validator (bukan data): duplicate-option case-sensitivity + exact-duplicate tuple key.

## 5. Quarantined Questions
- **0** — setelah perbaikan false-positive, seluruh 312 soal status ACTIVE (rata-rata skor kualitas **96.4**).
- Mekanisme karantina tersedia: `lib/game-questions/quarantine.ts` (daftar manual + alasan), `lib/game-questions/quality.ts` (`filterEligible` tidak meloloskan QUARANTINED), alasan standar: NO_CORRECT_ANSWER / MULTIPLE_CORRECT / INVALID_OPTIONS / DUPLICATE / MALFORMED / LOW_QUALITY / UNKNOWN.

## 6. Duplicate Analysis
- Exact duplicate (tuple penuh): **0**.
- Near-duplicate (Jaccard ≥ 0.85): **2 grup** — keduanya template-family kata baku yang sah (stem "Manakah penulisan baku.../Bentuk baku..." dengan kata berbeda) — DITANDAI saja, tidak dihapus (confidence rendah).

## 7. Question Expansion
- 82 soal MCQ baru + 15 katastra baru = **+97 soal**, semua lolos validator (rata-rata skor 96.4), 0 duplikat terhadap inti, ditulis lintas topik kurikulum (kata baku, sinonim/antonim, imbuhan, ejaan & tanda baca, kalimat efektif, SPOK, makna kata & majas, ungkapan, teks prosedur/eksplanasi/berita/iklan/persuasi/cerpen/puisi).
- Setiap soal punya `penjelasan` singkat edukatif ("Jawaban ini tepat karena...").

## 8. Difficulty Distribution (ekspansi)
| EASY | MEDIUM | HARD |
|------|--------|------|
| 28 (34%) | 41 (50%) | 13 (16%) |

Mendekati target 30/50/20 (±15%). Dipetakan ke ramp lvl harvest: EASY→3, MEDIUM→6, HARD→10.

## 9. Topic Distribution (bank gabungan)
Kata Baku 38 · Sinonim 28 · Antonim 28 · Imbuhan 26 · Ejaan 24 · Kalimat Efektif 22 · Ungkapan 21 · Jenis Kata (SPOK/majas/makna) 37 — 8 topik canonical.

## 10. Randomization Test
- Seed sama → hasil sama (deterministik; kompatibel replay).
- Sesi berbeda (seed berbeda) → kombinasi berbeda.
- Anti-repeat: recentIds dibuang (fallback bila pool kecil — tidak pernah gagal).
- Topic spread: round-robin → tidak didominasi satu topik.
- Difficulty balance: sampling menghormati target per-difficulty.

## 11. Anti-repeat Test
- `pickRampedQuestions(clean, count, { recentIds })` — buang soal baru dimainkan bila sisa ≥ count; bila tidak, fallback full pool.
- KuisTempurSolo: kantong refill kini dari EXPANDED (232 → pool lebih besar, repeat lebih jarang).

## 12. Educational Quality Test
- 100% soal punya penjelasan (bank) / hint (katastra).
- 0 placeholder/debug text; 0 pertanyaan absurd; 0 ambiguous flag error.
- Validator menandai warning: stem tanpa sinyal tanya (0 kasus), distractor imbalance (0 kasus), MCQ <4 opsi (0 kasus).

## 13. Test Results
`npm run test:game-question-quality` → **29/29 PASS** (structural, answer integrity, content, validator penuh, dedupe, karantina-vs-gameplay, sampler deterministik/anti-repeat/fallback, difficulty 30/50/20, topic diversity & spread, pool semua game valid).

## 14. tsc
`npx tsc --noEmit` → 0 errors.

## 15. build
`npm run build` (dummy env) → exit 0.

## 16. diff-check
`git diff --check` → bersih.

## 17. Protected Zones
0 diff: prisma/, app/api/, lib/gamification/, lib/learning-loop/, engines/, lib/apk.ts, lib/xp.ts, lib/coins.ts, lib/award-xp.ts, bottom-nav.tsx.
(Sumber soal game ada di `lib/game/*` + `components/game/*` — di luar zona terlindung. Route game app/api TIDAK diubah: picker di lib/game/harvest.ts diberi opsi opsional yang backward-compatible.)

## 18. Remaining Gaps
1. Katastra (KataPlayGame) masih shuffle `Math.random` di klien tanpa anti-repeat lintas sesi — variasi sudah membaik via level baru; anti-repeat penuh = fase berikutnya.
2. Near-duplicate template-family (kata baku/sinonim) masih ada — intentional variety, ditandai bukan dihapus.
3. Harvest dari DB Jalur Cerdas (soal pelajaran) belum di-audit full via validator runtime (sudah lewat quality gate `isValidQuestion` existing).
4. AI generation pipeline (agents/ content-curator) belum di-wire ke validator — rekomendasi fase berikutnya.

## 19. Rekomendasi Founder
- APPROVE fase ini (semua gate hijau).
- Fase berikutnya: wire `lib/game-questions` ke pipeline generation agent (GENERATE → VALIDATE → DEDUPE → REVIEW → APPROVE) dan anti-repeat katastra.
