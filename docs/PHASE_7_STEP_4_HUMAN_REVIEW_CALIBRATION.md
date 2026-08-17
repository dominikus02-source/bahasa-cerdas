# PHASE 7 STEP 4 — Human Review Calibration & Semantic Quality Gate

Tanggal: 17 Agustus 2026 · Fase: 7.4 · Status: **CALIBRATION COMPLETE — verification GREEN/YELLOW, belum commit** · Sumber: review manual 44 kandidat HUMAN_REVIEW (pilot 7.3) + kalibrasi validator + scoring deterministik 10 dimensi + GOLD exemplar set + harness 22 check.

## 1. Tujuan
Mengkalibrasi kualitas kandidat soal AI (master authoring) sebelum produksi: menilai 44 kandidat HUMAN_REVIEW dari pilot 7.3, menetapkan quality gate semantik (skor 0–50 + hard gate), memperbaiki validator pada pola sistemik, membangun GOLD exemplar set, dan menyediakan regression harness. **TIDAK** ada production authoring (1.431 soal sisa tidak diproses), **TIDAK** ada perubahan sumber, **TIDAK** ada commit/push.

## 2. Input
- `data/question-bank/audit/master-authoring-pilot-2026-08-17.json` — 50 record (sumber + kandidat + gates + evidence + telemetry).
- `data/question-bank/audit/master-authoring-review-2026-08-17.json` — 44 record review (sumber identik, kandidat, reason, detectedRisks, confidence).
- Review manual penuh: `/tmp/candidates44.txt` (520 baris, source+proposal+risks per kandidat).

## 3. Metode Review (per kandidat)
1. Baca source → indikator/KD → jabarkan jawaban yang dapat dipertanggungjawabkan.
2. Baca proposal AI: jawaban ≠ penjelasan? Jawaban disokong konteks? Bahasa baku?
3. Baca distraktor: masuk akal, tidak boleh ada dua jawaban.
4. Catat risiko semantik: kadang tidak terdeteksi validator (kunci sirkular "Drama" untuk soal konsep drama, misatribusi karya).
5. Periksa konteks/difficulty: apakah soal benar-benar menanyakan skill.
6. Periksa quiz "kopi" dari sumber: tujuannya SEBAGIAN memperbaiki soal buruk (nilai pedagogis dipertahankan) — bedakan dari duplikat wajib-block.
7. Tandai kandidat yang TIDAK BISA diverifikasi otomatis → HUMAN_REVIEW (bukan GOLD).
8. Hasilkan: kandidat SCAN_OK / perlu repair / REJECT + band + skor.

Hasil distribusi: **MAJOR-REPAIR 40, MINOR-REPAIR 2 (BC-CERITA-INSPIRATIF-0025, BC-DRAMA-0005), REJECT 2 (BC-CERPEN-0021/0029 — INVALID_CONTRACT, tanpa kandidat)**.

## 4. Skor Kualitas (10 dimensi × 0–5, maks 50)
| Dimensi | Isi |
|---------|-----|
| bahasa | bahasa baku + tanpa markup |
| kunciObjektif | satu kunci pasti, bukan self-answer, semantik valid |
| distraktor | opsi seimbang, tanpa forbidden, tanpa fakta-nama |
| bahasaPenjelasan | penjelasan cukup, tidak generik/template |
| selarasKunci | penjelasan sejalan dengan kunci |
| kesulitan | evidence kesulitan cukup |
| pedagogis | stem benar-benar menanyakan skill |
| orisinalitas | tanpa duplikat vs bank/family/batch |
| konteks | tanpa fakta tak terverifikasi; konteks utuh |
| sumber | sumber tidak dimutasi |

Band: 46–50 GOLD-potential · 40–45 minor repair · 30–39 major repair · <30 REJECT.
**Skor TIDAK pernah mengalahkan hard gate.**

## 5. Hard Gate (fail → TIDAK PERNAH GOLD)
`INVALID_CONTRACT` (tanpa kandidat) · `passB:tanpa-opsi-forbidden` · `passB:tanpa-fakta-nama-tak-terverifikasi` (BARU) · `passC:semantik-valid` (multi-correct) · `passC:penjelasan-selaras-kunci` · `passE:kunci-tidak-terbenam` (non-BS) · `passD` duplikat exact/near/family/bank.

Hasil kalibrasi: **40/44 goldBlocked** (seluruh kandidat dengan kandidat diblokir oleh gate duplikat-vs-sumber/echo konsep — konservatif by design). **0 kandidat GOLD-potential lolos** — semua decision `HUMAN_REVIEW_REQUIRED`.

## 6. Perbaikan Validator (4 perubahan; pola sistemik, bukan melemahkan gate)
| # | File/Tempat | Perubahan | Grounding Temuan Nyata |
|---|-------------|-----------|------------------------|
| 1 | `lib/master-authoring/gates.ts` passB | `FORBIDDEN_OPTION` diperluas: +`semua pernyataan di atas`, `tidak dapat dipastikan`, `cukup benar`, `tidak relevan`; check `tanpa-opsi-forbidden` diperluas | catatan review manual — pola opsi sembunyi |
| 2 | `lib/master-authoring/gates.ts` passB | **Gate BARU `tanpa-fakta-nama-tak-terverifikasi`** (regex `NAMED_FACT_RISK`: judul dalam kutip + "karya", atau "karya" + Nama berkapitalisasi asli, tanpa `/i` agar frasa generik "Karya sastra" tidak kena) | **True positive: BC-CERPEN-0016** — opsi `"Aku Ingin" (puisi karya Chairil Anwar)` = **misatribusi** (puisi itu karya Sapardi Djoko Damono); `"Matahari Terbenam" karya Sitor Situmorang` tidak dapat diverifikasi otomatis |
| 3 | `lib/master-authoring/gates.ts` passE | `penjelasan-pedagogis` diperluas: +`bukan`, `menunjukkan`, `sehingga`, `sedangkan`, `didefinisikan`, `definisi`, `menurut`; khusus `KONSEP` terima justifikasi definisional (`adalah`) | **FP dihapus: BC-CERITA-INSPIRATIF-0025** — explanation "…mengandung pesan motivasi dan contoh nyata yang menginspirasi…" adalah justifikasi yang sah, bukan template |
| 4 | `lib/master-authoring/gates.ts` passE | `kunci-tidak-terbenam-di-stem`: (a) BENAR_SALAH dikecualikan (instruksi "benar atau salah" selalu memuat kunci); (b) span kutipan (‘…’/"…") = SITASI, di-unquote sebelum cek | **FP dihapus: BC-CERPEN-0018 & BC-DRAMA-0008** (BS dengan kalimat dikutip); **19 case PG echo konsep TETAP diblokir** ("contoh Cerpen" → kunci "Cerpen"; "contoh drama" → kunci "Drama" — kunci sirkular, benar diblokir) |

## 7. False Positive / Negative
| Jenis | Jumlah | Detail |
|-------|--------|--------|
| FP kunci-terbenam | 2 | BS “benar atau salah” — diperbaiki (butir 6.4) |
| FP fakta-nama generik | 3 | frasa "Karya sastra…" kena regex lama `/i` — diperbaiki (butir 6.2, tanpa `/i`) |
| FP penjelasan-pedagogis | 1 | justifikasi definisional KONSEP — diperbaiki (butir 6.3) |
| True positive halusinasi fakta | 1 | BC-CERPEN-0016 (misatribusi "Aku Ingin") — GATE BARU menangkap |
| Non-repairable | 1 | BC-CERPEN-0016 (atribusi faktual salah → tulis ulang) |
| False negative | 0 | tidak ada kandidat berkunci salah/multi-correct yang lolos |

## 8. Artifact Kalibrasi
`data/question-bank/audit/master-human-review-calibration-2026-08-17.json` — per kandidat: `decision` (selalu `HUMAN_REVIEW_REQUIRED`), `band`, `score` (0–50), 10 dimensi, `goldBlocked`, `hardGateFails`, `repairable`, `note`; + `report` agregat (distribusi band, riskCounts, unsafeFacts, falsePositiveNotes, verdict).

Ringkasan: total 44 · withCandidate 42 · tanpa `[BC-CERPEN-0021, BC-CERPEN-0029]` · bands `{MAJOR-REPAIR:40, MINOR-REPAIR:2, REJECT:2}` · goldBlocked 40 · repairable 43 · nonRepairable 1 · unsafeFacts `[BC-CERPEN-0016]`.

## 9. GOLD Exemplar Set (fixture harness, 8 skill)
| Skill | Exemplar | Status |
|-------|----------|--------|
| SINONIM | 'cerdas' → pintar | ✅ gates+semantik lolos |
| ANTONIM | 'panas' → dingin | ✅ |
| MAKNA_KATA | 'bangku' konteks → jabatan | ✅ |
| SPOK | BC-SPOK-0001 (Adik = subjek) | **oleh desain → HUMAN_REVIEW** (semanticValidate SPOK butuh kodeSoal terverifikasi yang kandidat AI tidak punya) |
| MAJAS | 'Angin berbisik di malam hari' → personifikasi (tabel MAJAS_VERIFIED) | ✅ |
| EJAAN | nasihat (baku) | ✅ |
| KALIMAT_EFEKTIF | kalimat ajakan → imperatif (tabel KALIMAT_VERIFIED) | ✅ |
| KONSEP | contoh kalimat tanya → "Apa kabar?" | ✅ |

## 10. Regression Harness — 22 check + 1 kanari
`scripts/test-master-question-human-review-calibration.ts` (`npm run test:master-question-human-review-calibration`):
exactly-one-correct (42 kandidat riil) · synonym-semantic-relation · antonym-semantic-relation · context-meaning · spok-correctness · majas-classification · ejaan-kaidah · kalimat-efektif · distractor-plausibility · explanation-consistency · hallucination-rejection (fixture fakta-nama) · ambiguity-rejection · duplicate-rejection · near-duplicate-rejection · ai-sounding-rejection · difficulty-validation · pedagogical-value · source-preservation (44/44 sumber identik antar artifact) · gold-hard-gate · reviewer-decision-integrity · calibration-report · exemplar-integrity (7 lolos + SPOK wajib HUMAN_REVIEW) + kanari `SELF: check(false) → FAIL`.

**Hasil: 22/22 lulus, kanari 1 gagal (ekspektasi), real fail 0, exit 0.**

## 11. Kalibrator
`scripts/calibrate-master-human-review.ts` (`npm run calibrate:master-human-review`) — read-only atas artifact pilot+review, menerapkan gate delta (utanpas-forbidden, tanpa-fakta-nama, penjelasan-pedagogis KONSEP, kunci-terbenam BS/sitasi), skor 10 dimensi deterministik, menulis artifact kalibrasi. Tidak pernah menulis DB/sumber.

## 12. Regression (semua lulus)
| Suite | Hasil |
|-------|-------|
| test:master-question-human-review-calibration | ✅ 22/22 + kanari |
| test:master-question-ai-authoring (7.3) | ✅ 34/34 + kanari |
| test:master-ai-repair | ✅ |
| test:question-metadata | ✅ 24/24 |
| test:adaptive-practice / test:adaptive-reward-hardening | ✅ 25/25 · ✅ 41/41 |
| test:diagnostic-assessment / test:diagnostic-4e1 | ✅ 48/48 · ✅ 36/36 |
| test:step3c-evidence / test:learner-state / test:student-home | ✅ 29/29 · ✅ 24/24 · ✅ 61/61 |
| test:gamification-engine / test:guru-phase / test:premium-economy / test:arena-web | ✅ SEMUA LULUS |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (4 file diubah/baru) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ Compiled successfully, exit 0 |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, app/api/, engines/, gamification, adaptive, diagnostic, learner-state) | ✅ 0 diff |
| DB | ✅ READ ONLY — 0 write, 0 migrasi |

## 13. Ringkasan Statistik Kalibrasi
| Metrik | Nilai |
|--------|-------|
| Kandidat masuk HUMAN_REVIEW | 44 |
| goldBlocked (hard gate) | 40 |
| GOLD auto yang lolos | 0 (konservatif — semua kandidat duplikat-vs-sumber karena kandidat menyalin/memperbaiki sumbernya sendiri) |
| Major repair | 40 |
| Minor repair | 2 (BC-CERITA-INSPIRATIF-0025, BC-DRAMA-0005) |
| Reject | 2 (INVALID_CONTRACT, tanpa kandidat) |
| Repairable | 43 |
| Non-repairable (faktual) | 1 (BC-CERPEN-0016) |
| Halusinasi fakta tertangkap | 1 (BC-CERPEN-0016) |
| FP validator diperbaiki | 6 (2+3+1) |
| FN | 0 |

## 14. Verdict
**YELLOW — jujur dan aman.**
- Trust rate: 44/44 kandidat diarahkan ke HUMAN_REVIEW; 0 jawaban salah/multi-correct lolos; 1 halusinasi fakta tertangkap gate baru. **Tidak ada kerusakan yang lolos.**
- Gap utama: kandidat yang **memperbaiki soal sumber** (nilai pedagogis nyata) terus-menerus diblokir gate duplikat (jaccard 1.00 vs family/bank). Ini **konservatif by design** — keputusan JANGAN menurunkan threshold. Opsi lanjut: untuk gelombang produksi, pilot menghadap pool GOLD-independent (kandidat yang benar-benar ORISINIL, belum ada sumber serupa) agar GOLD rate realistis terukur.
- BC-CERPEN-0016 wajib ditulis ulang oleh AI (repair pipeline) sebelum dapat dipertimbangkan.
- Frame semantik sudah dikalibrasi: kunci bisa ditentukan, distraktor diperiksa, gate baru menutup celah fakta bernama, BS dan sitasi tidak lagi FP.

## 15. STOP
Fase kalibrasi selesai. **Belum di-commit/push** (menunggu instruksi Founder). Tidak ada production authoring (1.431 sisa **TIDAK** diproses). Tidak ada DB write. Langkah berikut bila disetujui: 1) commit batch STEP 7.0–7.4, 2) pilot GOLD-independent untuk kalibrasi GOLD rate, 3) repair BC-CERPEN-0016/0021/0029, 4) gelombang produksi bertahap dengan gate baru.