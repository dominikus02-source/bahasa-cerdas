# PHASE 6 STEP 1 — BC Classroom Student Experience · Simple Learning Flow

> Status: **IMPLEMENTED** — halaman kelas murid (activity stream 4 tipe),
> status submission manusiawi, deep-link notifikasi, URL validation, API
> agregat sisi murid. NO COMMIT (menunggu Founder Review).

---

## 1. Audit Existing Architecture
Sisi murid sebelumnya: `/murid/tugasku` (quiz assignment take/result),
`/arena/tugas` (penugasan + kerjakan: jawaban/praktik upload/link),
`/murid/pengumuman`, `/arena/materi` (viewer materi). Halaman
`/murid/kelasku/[id]` hanya menampilkan ANGGOTA + ketua kelas — **tidak ada
classroom activity stream**. Notifikasi: materi ✓ (/arena/materi), quiz assign
✗ (link salah ke /guru/bank-soal), penugasan ✗ (tidak ada notif murid).

## 2. Existing APIs Reused
| API | Fungsi |
|---|---|
| `GET /api/group/[id]/student` | info kelas + anggota + ketua (header/tab Anggota) |
| `GET /api/murid/tugas` / `quiz/[id]` | take/result latihan (deep-link) |
| `GET /api/murid/penugasan` + `[id]/kerjakan` | flow tugas existing (deep-link) |
| `POST /api/murid/penugasan/[id]/praktik` | pengumpulan file/link (diperkuat validasi URL) |
| `POST /api/guru/penugasan` / `quiz/[id]/assign` / `materi/[id]/kirim` | notifikasi murid ditambahkan/fix |

## 3. Existing Models Reused
Group, GroupMember, MateriKirim, QuizAssignment, QuizSubmission,
Penugasan, PenugasanSubmission, Pengumuman, Notifikasi — **0 model baru**.

## 4. Student Classroom Flow
`/murid/kelasku/[id]` (rewrite):
```
Header: nama kelas · jenjang · guru · kode (salin) · jumlah siswa
Tab Aktivitas: stream gabungan (pengumuman pinned → tugas → latihan → materi)
Tab Anggota: daftar + ketua (fitur lama dipertahankan)
```
Satu request agregat: `GET /api/murid/kelasku/[id]` (membership + 4 sumber +
status submission milik user ini).

## 5. Material Flow
Kartu Materi: judul, ringkasan, guru, tanggal → CTA **"Baca Materi →"** →
`/arena/materi?materiId=` (viewer existing).

## 6. Assignment Flow
Kartu Tugas (penugasan): judul, instruksi, deadline, status → CTA
**"Kerjakan Tugas →"** / "Lihat Pengumpulan" → `/arena/tugas/[id]/kerjakan`
(flow existing: jawaban/praktik).

## 7. Exercise Flow
Kartu Latihan (quiz): judul, jumlah soal, deadline, status → CTA
**"Mulai Latihan →"** / "Lihat Hasil" → `/murid/tugasku/[id]/take` (take/result
existing; adaptive flow tidak disentuh).

## 8. Submission Flow
Reuse: penugasan jenis KUIS (jawaban auto-score) + jenis MATERI (praktik:
upload file via /api/upload/file atau tempel link). CTA ke halaman kerjakan
existing — tanpa UI submission baru.

## 9. Link Submission
Praktik menerima URL eksternal (YouTube/Drive/Canva/dll). **Validasi URL
server-side ditambahkan** (`new URL()` + protokol http/https; javascript:/
file: ditolak). BC tetap bukan video hosting.

## 10. Student Status
4 status manusiawi (server-derived, bukan istilah backend):
`Belum dikerjakan · Sedang dikerjakan · Sudah dikumpulkan · Sudah dinilai (+nilai)`.
Penugasan: dari PenugasanSubmission.status + praktikDinilai; Latihan: dari
QuizSubmission.status (GRADED → nilai).

## 11. Teacher Result
Reuse: `/guru/tugas-murid` (daftar status + praktikNilai + catatan) + Kelasku
tab Tugas (badge "N mengerjakan" + link "Lihat & nilai pengumpulan"). Tidak
perlu halaman baru.

## 12. Multi-Class Behavior
- Satu kiriman (materi/tugas/latihan) → N group rows (reuse, @@unique anti
  duplikat) → muncul di kelas masing-masing murid (API per-kelas scoped
  `groupId: id`).
- Membership dijamin server (groupId_userId); submission hanya milik user.

## 13. Notification
- Penugasan: **baru** — notifikasi murid (deep-link `/arena/tugas`).
- Quiz assign: **fix** — notifikasi murid in-app (deep-link `/murid/tugasku`);
  push existing tetap (url `/arena/tugas`).
- Materi: sudah ada (`/arena/materi`).
- Tanpa notification engine baru.

## 14. Mobile UX
Kartu iOS Edu (bc-student violet), CTA full-width, satu aksi per kartu,
bottom sheet/nav existing, touch ≥44px.

## 15. Light/Dark UX
Token `--clr-accent` violet murid (light #7c3aed / dark #a78bfa) di
classroom.css; surface/border/text semantik; memakai next-themes existing.

## 16. Security
- API murid kelasku: membership wajib (403), status submission hanya milik
  user, tanpa expose data siswa lain.
- Praktik: URL divalidasi server; ownership penugasan via group members.
- Klien tidak mengirim studentId/teacherId/score/grade.

## 17. Performance
1 request agregat per kelas (parallel queries, take 30); polling hanya di
kelas aktif? (tidak ada polling baru — fetch on mount + refresh manual);
tanpa N+1 baru; home murid tidak disentuh.

## 18. Tests
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-student-flow` (BARU) | ✅ 30/30 |
| `test:bc-classroom-simple-flow` | ✅ 37/37 |
| `test:guru-phase` · `test:student-home` · `test:my-day-home` | ✅ SEMUA LULUS |
| `test:mobile-navigation` (allowlist classroom) | ✅ 48/48 |
| `test:arena-web` (allowlist classroom) | ✅ 56/56 |
| `test:premium-economy` · `test:gamification-engine` | ✅ SEMUA LULUS |
| `npx tsc --noEmit` · `npm run lint` · `npm run build` · `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 19. Protected Zones
0 diff: prisma/, LearningEvidence, QuestionMetadata, LearnerState, adaptive,
diagnostic, gamification, learning-loop, UKBI, TKA, Jalur Cerdas, Arena core,
Leaderboard, Coin, APK, auth. Perubahan app/api hanya 5 route classroom
(additive, masuk allowlist terverifikasi test).

## 20. DB Status
READ ONLY — 0 migration, 0 seed, 0 production write.

## 21. Known Limitations
1. Home murid ("Aksi Belajarmu") belum menampilkan tugas kelas — ContinueLearningCard
   fokus adaptive/diagnostic; integrasi kelas ke home = fase berikutnya.
2. Status penugasan jenis KUIS "sudah dinilai" bergantung flow penilaian guru.
3. `quiz assign` push (kirimKeBanyakUser) masih menunjuk /arena/tugas (bukan
   kelas spesifik) — deep-link in-app sudah benar.
4. Belum ada "Jadikan Karya" dari submission (fase berikutnya).

## 22. Next Phase
- Student Home: kartu "Aksi Belajarmu" menampilkan tugas kelas yang butuh
  tindakan (prioritas tenggat).
- Submission → "Jadikan Karya" (StudentKarya + sumber opsional, butuh approval
  schema additive).
- Badge "perlu diperiksa" di kartu kelas guru (aggregate count).

## Verdict
**GREEN (menunggu Founder Review untuk commit)** — murid membuka kelas →
lihat stream → pelajari/kerjakan → kumpulkan, dengan status jujur, deep-link
benar, keamanan server-authoritative, 30/30 test + regression hijau, protected
zones 0 diff, DB read-only.

---

### Git status (NO COMMIT)
```
M app/(dashboard)/murid/kelasku/[id]/page.tsx   (rewrite: classroom stream)
M app/api/murid/kelasku/[id]/route.ts           (BARU: agregat murid)
M app/api/guru/penugasan/route.ts               (notif murid)
M app/api/guru/quiz/[id]/assign/route.ts        (notif murid + fix link)
M app/api/murid/penugasan/[id]/praktik/route.ts (validasi URL)
M components/kelas/classroom.css                (bc-student violet + status)
M package.json                                  (+test:bc-classroom-student-flow)
M scripts/test-mobile-navigation.ts             (allowlist)
M scripts/test-arena-web.ts                     (allowlist)
?? scripts/test-bc-classroom-student-flow.ts
?? docs/PHASE_6_STEP_1_BC_CLASSROOM_STUDENT_FLOW.md
```
