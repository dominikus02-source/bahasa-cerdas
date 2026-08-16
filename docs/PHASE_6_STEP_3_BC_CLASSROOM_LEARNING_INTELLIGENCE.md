# PHASE 6 STEP 3 — BC Classroom Learning Intelligence

> Status: **IMPLEMENTED** — quiz Classroom → LearningEvidence yang TERBACA
> LearnerState → Adaptive & personalization; insight murid & guru berbasis
> evidence; tanpa engine baru. NO COMMIT (menunggu Founder Review).

---

## 1. Current Classroom Flow (sebelum 6.3)
6.0–6.2: guru kirim → murid kerjakan/kumpulkan → guru review/nilai. Evidence:
quiz classroom SUDAH menulis `LearningEvidence` — tetapi dengan `source:
"LATIHAN"` + `questionId: QuizQuestion.id` → **JOIN QuestionMetadata tidak
cocok → LearnerState TIDAK membaca evidence tersebut** (evidence buta).

## 2. Teacher Flow (tambahan)
Tab Nilai → kartu **"Perkembangan Kelas"** (per-skill dari LearnerState
anggota; skill tampil hanya bila evidence kelas cukup ≥5 attempts, selain itu
"Belum cukup data") · Review submission → **"Insight BC"** per murid (kategori
skill + Saran BC) — guru tetap memegang penilaian.

## 3. Student Flow (tambahan)
Halaman kelas → kartu **"Perkembanganmu"** (hasEvidence → insight + CTA
"Lihat Rekomendasimu" → /arena/player/skills; tanpa evidence → "BC masih
mengenalimu...").

## 4. Submission Flow
Tidak berubah (6.1/6.2).

## 5. Grading Flow
Tidak berubah (6.2).

## 6. Feedback Flow
Tidak berubah (6.2).

## 7. Material Flow
Tidak menghasilkan evidence (membaca materi ≠ menguasai) — audit: materi
route tanpa learningEvidence ✓.

## 8. Assignment Flow
Tugas praktik (link/file) tidak mengarang evidence — kontrak belum
memungkinkan penilaian skill yang valid (dokumentasi gap, bukan fake).

## 9. Quiz Flow → LEARNING EVIDENCE (inti 6.3)
`app/api/murid/quiz/[id]/route.ts` (submit): evidence ditulis dari hasil
server (QuizAnswer dihitung vs correctAnswer) dengan **kontrak yang benar**:
- `source: "BANK_SOAL"` (cocok dengan QuestionMetadata → terbaca LearnerState)
- `questionId: soal.kodeSoal` (metadata questionId — bukan QuizQuestion id)
- `skill` & `difficulty` dari QuestionMetadata (status APPROVED)
- `activityId: submission.id` + metadata `{ version, sourceType, sourceId,
  aktivitas: "CLASSROOM_QUIZ" }`
- **Skill TIDAK diinvent**: soal tanpa kodeSoal/metadata → dilewati
- Baris legacy `source: "LATIHAN"` untuk aktivitas itu dibersihkan sekali jalan.

## 10. Multi-Class Flow
Tidak berubah (6.0).

## 11. Notification Flow
Tidak berubah (6.1/6.2).

## 12. LearningEvidence Integration
- **Idempoten**: `@@unique([userId, source, activityId, questionId])` +
  `replaceLearningEvidenceBatch` (deleteMany per aktivitas + createMany
  skipDuplicates) → retry/replay = SATU evidence.
- **LearnerState**: `getLearnerState` JOIN QuestionMetadata (source+questionId)
  → evidence classroom kini otomatis terbaca (attemptCount/accuracy/skill).
- **Adaptive Practice**: membaca states → otomatis mendapat evidence baru
  (selector & threshold WEAK_SKILL ≥5 TIDAK diubah; sebelum cukup → reason
  existing PRACTICE_GAP/NO_DATA).
- **Diagnostic/personalization 4E.2**: kompatibel (jalur BANK_SOAL sama).

## 13. Existing API Reused
`replaceLearningEvidenceBatch`/`upsertLearningEvidence` (lib/learning-loop/
evidence.ts) · `getLearnerState` · `profileFromLearnerState` +
`buildPersonalizedAction` (4E.2) · `GET /api/guru/kelasku/[id]` ·
`GET /api/murid/kelasku/[id]`.

## 14. New API
SATU: `GET /api/guru/kelasku/[id]/insight` (`?muridId=` opsional) — insight
kelas/per-murid berbasis evidence (bukan analytics engine kedua).

## 15. Mobile UX
Kartu insight ringkas; bar per-skill di tab Nilai; insight di modal review
(bottom sheet); CTA full-width; touch ≥44px.

## 16. Light/Dark UX
Token bc-classroom existing (bc-student violet) — tanpa theme engine baru.

## 17. Security
- Insight guru: teacherId pemilik kelas (Forbidden non-owner); `muridId` wajib
  anggota kelas (403).
- Insight murid: membership; profil dihitung server dari user sesi.
- Client tidak mengirim score/skill/level/confidence — semua server-derived
  (isCorrect dihitung vs correctAnswer; evidence dari finalAnswers).

## 18. Tests
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-learning-intelligence` (BARU) | ✅ 32/32 |
| `test:bc-classroom-simple-flow` / `student-flow` / `learning-loop` | ✅ 37/37 · ✅ 30/30 · ✅ 28/28 |
| `test:diagnostic-assessment` / `4e1` / `personalization` | ✅ 48/48 · ✅ 36/36 · ✅ 32/32 |
| `test:adaptive-practice` / `simulation` / `reward-hardening` | ✅ 25/25 · ✅ 21/21 · ✅ 41/41 |
| `test:step3c-evidence` / `learner-state` / `question-metadata` | ✅ 29/29 · ✅ 24/24 · ✅ 24/24 |
| `test:student-home` / `my-day-home` / `mobile-navigation` / `arena-web` | ✅ 61/61 · ✅ 37/37 · ✅ 48/48 · ✅ 56/56 |
| `test:gamification-engine` / `premium-economy` / `guru-phase` | ✅ SEMUA LULUS |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` / `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 19. Protected Zones
**0 DIFF**: prisma/ · LearningEvidence schema · QuestionMetadata schema ·
LearnerState schema · `lib/adaptive-practice/selector.ts` · adaptive reward ·
diagnostic · gamification · learning-loop · UKBI · TKA · Jalur Cerdas · Arena ·
leaderboard · coins · premium · APK · auth. (app/api +3 route classroom,
allowlist diverifikasi 2 test.)

## 20. DB / Migration Status
0 migration · 0 schema · 0 seed. Writes hanya pada application flow existing
yang memang menyimpan LearningEvidence (runtime, saat submit quiz).

## 21. Known Limitations
1. **Tugas praktik (link/file) belum menghasilkan evidence** — kontrak
   penilaian skill belum tersedia (gap terdokumentasi; butuh desain +
   approval sebelum membuat evidence dari praktik).
2. Soal latihan AI tanpa `kodeSoal`/metadata → tidak menghasilkan evidence
   (honest; menunggu metadata enrichment).
3. Quiz lama (submit sebelum 6.3) memiliki baris evidence "LATIHAN" yang buta —
   dibersihkan otomatis saat submission berikutnya di aktivitas yang sama.
4. Insight kelas dibatasi 40 anggota (kelas sekolah normal) — dokumentasi.

## 22. Next Phase
- Metadata enrichment untuk soal latihan AI (agar lebih banyak soal
  menghasilkan evidence).
- Submission praktik → evidence (desain kontrak penilaian skill, approval
  founder).
- "Jadikan Karya" dari submission.

## 23. Verdict
**GREEN** — quiz Classroom kini menghasilkan LearningEvidence yang VALID dan
TERBACA LearnerState → Adaptive Practice & personalization otomatis mendapat
evidence baru; idempoten; tanpa skill palsu; 32/32 test + 18 suite regression
hijau; protected zones 0 diff; 0 migration; tanpa XP/coin baru.

---

### Git status (NO COMMIT)
```
M app/api/murid/quiz/[id]/route.ts              (evidence kontrak benar)
M app/api/murid/kelasku/[id]/route.ts           (+insight personal)
M app/(dashboard)/murid/kelasku/[id]/page.tsx   (kartu Perkembanganmu)
M app/(dashboard)/guru/kelasku/page.tsx         (Perkembangan Kelas)
M components/kelas/SubmissionReview.tsx         (Insight BC per murid)
?? app/api/guru/kelasku/[id]/insight/route.ts   (BARU — insight guru)
?? scripts/test-bc-classroom-learning-intelligence.ts
?? docs/PHASE_6_STEP_3_BC_CLASSROOM_LEARNING_INTELLIGENCE.md
M package.json · M scripts/test-mobile-navigation.ts · test-arena-web.ts
(+ file STEP 6.0/6.1/6.2 yang belum di-commit)
```
