# PHASE 2 STEP 4E.2 — Diagnostic → Personalized Learning Activation

> Status: **DONE** — lapisan personalisasi wired end-to-end.
> Prinsip founder: "BC jangan hanya tahu nilai murid. BC harus tahu muridnya."

---

## 1. Founder Objective

Hasil diagnostik harus MENGAKTIFKAN pengalaman belajar berikutnya. Dari
"BC memberi soal yang sama kepada semua murid" menjadi "BC mengenali kemampuan
setiap murid → memahami bagian yang perlu diperkuat → memilih latihan berikutnya
yang paling relevan → terus memperbarui profil belajar." Awal dari BC
PERSONALIZATION LOOP.

## 2. Current Architecture (sebelum 4E.2)

- Diagnostik: `lib/diagnostic/*` (config/types/selector/profile) + route
  `app/api/player/diagnostic` — reuse `AdaptivePracticeSession`
  (reasonCode=DIAGNOSTIC) + `LearningEvidence` (source BANK_SOAL), tanpa XP/koin.
- Adaptive: `lib/adaptive-practice/selector.ts` (threshold WEAK_SKILL
  attemptCount ≥ 5, NO_DATA rotation deterministik) + route
  `app/api/player/adaptive-practice` (preview/start/answer/complete, XP
  exactly-once via awardXp reference=session.id).
- LearnerState: `lib/learner-state/service.ts` — agregasi SQL LearningEvidence
  (JOIN QuestionMetadata APPROVED) → per-skill attempts/accuracy/trend.
- Student Home: `components/student-home/home-data.tsx` (single source
  preview: adaptive + diagnostic) → `ContinueLearningCard`.

## 3. Audit Findings (4E.2)

| Q | Temuan |
|---|--------|
| A. Di mana profil diagnostik disimpan? | TIDAK ditabelkan — dihitung on-demand server-side dari LearningEvidence sesi diagnostik (`buildSessionProfile`) atau back-compat dari LearnerState (`computeDiagnosticProfile`). |
| B. Adaptive mengonsumsi evidence diagnostik? | YA — via LearnerState (agregasi tanpa filter source; diagnostik & adaptive sama-sama source=BANK_SOAL). |
| C. Kondisi reason code selector | WEAK_SKILL: attemptCount ≥ 5 + akurasi terendah + trend ≠ IMPROVING · PROGRESSION: evidenced + trend IMPROVING · PRACTICE_GAP: ada riwayat (attemptCount>0) tapi < 5, yang terlama dulu · NO_DATA: tanpa riwayat, rotasi deterministik (rotationKey hari). |
| D. Evidence diagnostik tak bisa dibedakan? | BENAR — agregasi hanya JOIN QuestionMetadata; inilah yang membuat diagnostik memengaruhi adaptive secara alami. |
| E. Selector bisa prioritaskan skill terlemah? | Bisa bila skill itu sudah ≥ 5 bukti (WEAK_SKILL). Sebelum itu: PRACTICE_GAP/NO_DATA — jujur, sesuai threshold 4D yang dijaga. |
| F. Skenario murid | 1–4 attempts → PRACTICE_GAP (terlama) · ≥5 → WEAK_SKILL/PROGRESSION · semua belum → NO_DATA rotasi · Reading STRONG + Grammar WEAK (≥5 ev) → GRAMMAR WEAK_SKILL; sebelum ≥5 → PRACTICE_GAP. |
| G. Student Home menampilkan aksi personal? | Sebagian — judul/reason selector tampil; BELUM ada state B/C/D, penjelasan confidence-aware, atau "Profil siap". |
| H. Preview menjelaskan "Kenapa latihan ini?" | reasonCode/reasonText selector ada, tapi belum ada narasi personalisasi (target label + explanation confidence-aware). |

## 4. Diagnostic → LearningEvidence

Tidak berubah (4E/4E.1): jawaban diagnostik diverifikasi server-side
(`String(answer) === String(question.correctAnswer)`), ditulis via
`upsertLearningEvidence` (source BANK_SOAL, activityId=session.id, skill dari
metadata APPROVED). Tanpa XP/koin.

## 5. LearningEvidence → LearnerState

Tidak berubah: `getLearnerState` agregat SQL per skill (attemptCount,
correctCount, recent*, accuracy, trend, confidence, masteryState). Evidence
diagnostik otomatis termasuk.

## 6. LearnerState → Adaptive Practice

Tidak berubah: route adaptive memanggil `getLearnerState(userId)` →
`selectAdaptivePractice({ states, candidates, size, rotationKey })`. Threshold
4D (WEAK_SKILL butuh bukti cukup) DIJAGA — produk jujur soal reason.

## 7. Personalization Rules (BARU — `lib/diagnostic/personalization.ts`)

Lapisan ADDITIVE (bukan selector kedua). `buildPersonalizedAction(profile, source)`:

1. Hanya skill dengan bukti (attempts > 0, bukan INSUFFICIENT_EVIDENCE) yang
   bisa menjadi target.
2. Urutkan deterministik: kategori (WEAK < DEVELOPING < STRONG) → akurasi naik
   → nama skill asc. Target = terdepan.
3. Tanpa skill berbukti → `CONTINUE_EVIDENCE` ("BC Masih Mengenali"), tanpa
   target — BUKAN "lemah".
4. `reasonCode`: WEAK_SKILL / DEVELOPING / STRONG (jujur sesuai kategori).
5. `recommendation`: WEAK→EASY, DEVELOPING→MEDIUM, STRONG→HARD.
6. `source`: LEARNER_STATE atau DIAGNOSTIC_PROFILE (dari mana profil dibangun).

## 8. Confidence Rules

- INSUFFICIENT_EVIDENCE (0 bukti) → "belum cukup terukur", never "lemah".
- PROVISIONAL → kalimat hati-hati: "BC melihat X masih perlu diperkuat
  berdasarkan latihanmu sejauh ini."
- PROFILE_CONFIDENT (attempts ≥ 5 && recent ≥ 0.7) → klaim kuat: "BC melihat
  bahwa X masih perlu diperkuat."
- Target skill TIDAK PERNAH diambil dari skill tanpa bukti.

## 9. Personalized Next Action

Contoh (deterministik, server-derived):
- A: Reading STRONG / Grammar WEAK → target GRAMMAR, reason WEAK_SKILL,
  title "Perkuat Tata Bahasa", explanation "BC melihat Tata Bahasa masih perlu
  diperkuat berdasarkan latihanmu sejauh ini."
- B: Reading WEAK / Grammar STRONG → target READING (sama, dibalik).
- C: semua INSUFFICIENT → CONTINUE_EVIDENCE "BC Masih Mengenali".

## 10. Student Home States (ContinueLearningCard)

- **STATE A** (tanpa bukti, preview DIAGNOSTIC): "Kenali Kemampuanmu" + info
  server `"N soal · ±5–8 menit"` + `skillsLabel` (Membaca · Tata Bahasa ·
  Kosakata · Sastra · Menulis — dari DIAGNOSTIC_SKILL_PRIORITY, tidak mengaku
  Mendengarkan karena korpus 0).
- **STATE B** (ADAPTIVE + diagnosticCompleted): "Profil Belajarmu Sudah Siap" —
  "BC sudah mulai mengenali kemampuanmu." + explanation + CTA "Mulai Latihan
  Personal".
- **STATE C** (ADAPTIVE + target skill): "Latihan Untukmu" + targetSkillLabel +
  explanation + CTA "Mulai Latihan".
- **STATE D** (ADAPTIVE tanpa target): "BC Masih Mengenali" — "Beberapa
  kemampuanmu belum cukup terukur." + CTA "Lanjutkan Latihan". Never "kamu
  lemah".
- FALLBACK/GENERAL_LEARNING: "Saran untukmu" + link jalur-cerdas (jujur).

## 11. Adaptive Practice Explanation ("Kenapa latihan ini?")

Preview adaptive kini membawa `personalization` (server-derived dari
`computeDiagnosticProfile(states)` + `buildPersonalizedAction`) dan
`diagnosticCompleted` (read-only `hasCompletedDiagnostic`). reasonCode/reasonText
selector tetap dipertahankan sebagai sumber kebenaran; explanation adalah
lapisan narasi confidence-aware. Klien tidak bisa mengirim reason.

## 12. Security

- Server-authoritative: klien hanya kirim `{ action, size/sessionId/questionId/answer }`; TIDAK PERNAH skill/difficulty/level/score/confidence/reasonCode/XP/coin/profile/evidenceCount (diverifikasi test 15–18).
- `hasCompletedDiagnostic` read-only; gagal query → false (tidak menggagalkan preview).
- Tidak ada jawaban/kunci bocor: personalization hanya label/penjelasan.

## 13. Data Integrity

- Satu sumber kebenaran: LearningEvidence → LearnerState → selector (0 perubahan).
- Personalization murni (tanpa DB) — deterministik, testable.
- Preview single-source tetap di `home-data.tsx` (adaptive + diagnostic).

## 14. No Schema Changes

0 diff `prisma/`. Tidak ada tabel/kolom baru.

## 15. No Production Writes

READ ONLY. Tidak ada migrasi, seed, `--execute`, atau write otomatis.

## 16. Protected Zones

0 diff: `prisma/`, `lib/gamification/`, `lib/learning-loop/`, `engines/`,
`lib/apk.ts`, `lib/coins.ts`, `lib/award-xp.ts`, `lib/adaptive-practice/`
(selector & route engine — hanya file route yang ditambah field additive),
`lib/learner-state/`, UKBI, TKA, Jalur Cerdas core, Arena core, Leaderboard,
CoinTransaction, premium economy.

## 17. Tests

`scripts/test-diagnostic-personalization.ts` — **32/32** (25 grup minimum +
ekstra): state A/B/D, no-evidence≠weak, wording, target dari profil,
deterministik, A→Grammar/B→Reading, semua-insufficient→continue, wiring
evidence→state→adaptive, threshold 4D dijaga, reason jujur, no client-controlled
field (skill/difficulty/level/XP/coin/reason), no diagnostic XP/coin, prisma 0
diff, protected zones 0 diff, test existing 0 diff, home single-source.

## 18. Regression Results

| Check | Hasil |
|-------|-------|
| `test:diagnostic-personalization` (BARU) | ✅ 32/32 |
| `test:diagnostic-assessment` | ✅ 48/48 |
| `test:diagnostic-4e1` | ✅ 36/36 |
| `test:adaptive-practice` | ✅ 25/25 |
| `test:adaptive-simulation` | ✅ 21/21 |
| `test:adaptive-reward-hardening` | ✅ 41/41 |
| `test:step3c-evidence-ledger` | ✅ 29/29 |
| `test:learner-state` | ✅ 24/24 |
| `test:question-metadata` | ✅ 24/24 |
| `test:my-day-home` | ✅ 37/37 |
| `test:student-home` | ✅ 61/61 |
| `test:arena-web` | ✅ 56/56 |
| `test:gamification-engine` | ✅ SEMUA LULUS |
| `test:premium-economy` | ✅ 63/63 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 |
| `git diff --check` | ✅ bersih |

## 19. Known Limitations

1. WEAK_SKILL penuh hanya setelah ≥ 5 bukti per skill (threshold 4D disengaja);
   sebelum itu kartu tetap jujur (STATE D / PRACTICE_GAP).
2. `diagnosticCompleted` true selamanya setelah sekali selesai — STATE B tetap
   tampil di kunjungan berikutnya (judul "Profil Belajarmu Sudah Siap" masih
   akurat).
3. Explanation berbasis kategori profil; belum ada penjelasan per-soal.
4. Visual QA perangkat nyata belum dieksekusi di sesi ini.

## 20. Future Personalization Roadmap

1. **Second diagnostic** (4 minggu) — bandingkan profil sebelum/sesudah.
2. **Recommendation per subskill** (dari `subskill` metadata) di lapisan
   personalisasi.
3. **Mentor integration**: `PersonalizedLearningAction` → insight mentor harian.
4. **Placement Jalur Cerdas** (provisional) memakai profil diagnostik saat
   membuka unit pertama.
5. **Writing/Listening evidence** ketika korpus constructed + audio siap —
   masuk alur yang sama tanpa perubahan arsitektur.

## 21. Final Verdict

**GREEN** — personalisasi benar-benar wired end-to-end:
Diagnostik → LearningEvidence → LearnerState → Profil → Personalized Action →
Adaptive Practice (target skill nyata, honest reason) → New Evidence → Profil
lebih baik. UI mencerminkan (state A–D, server-derived), tanpa perubahan
protected zone, DB read-only, semua regression hijau.

---

### Git status (akhir fase — NO COMMIT, NO PUSH)

```
M app/api/player/adaptive-practice/route.ts   (preview +fallback: personalization, diagnosticCompleted)
M app/api/player/diagnostic/route.ts          (preview: STATE A fields, EVIDENCE_EXISTS personalization)
M components/student-home/home-data.tsx       (MyDayResponse + personalization fields)
M components/student-home/ContinueLearningCard.tsx (state A–D)
M package.json                                (+test:diagnostic-personalization)
?? lib/diagnostic/personalization.ts
?? lib/diagnostic/completion.ts
?? scripts/test-diagnostic-personalization.ts
?? docs/PHASE_2_STEP_4E2_DIAGNOSTIC_PERSONALIZATION.md
```
