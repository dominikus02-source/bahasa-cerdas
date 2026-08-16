# PHASE 6 STEP 2 — BC Classroom Learning Loop

> Status: **IMPLEMENTED** — loop end-to-end: kirim → terima → kerjakan →
> kumpulkan → guru lihat ringkasan → review → nilai+feedback → murid lihat
> hasil + notifikasi. NO COMMIT (menunggu Founder Review).

---

## 1. Current Classroom Flow (sebelum 6.2)
6.0 (guru: composer + ClassPicker) & 6.1 (murid: class page stream) sudah
jalan. Gap 6.2: guru belum melihat ringkasan "siapa sudah/belum" per aktivitas,
belum ada layar review submission + nilai dari kelas, murid belum melihat
feedback di halaman kelas, deadline masih tanggal mentah, tidak ada notifikasi
saat tugas dinilai.

## 2. Teacher Flow (baru)
Kelas → tab Tugas → kartu aktivitas dengan **ringkasan "✓ N sudah · ◷ N sedang
· — N belum mengerjakan"** (server-derived dari submissions + jumlah anggota)
→ [Lihat Pengumpulan] → `SubmissionReview` (filter Semua/Belum/Sudah + cari
murid) → buka murid → lihat tautan karya → **Nilai (0–100) + Catatan guru** →
[Simpan Penilaian] → rekap Nilai terisi + notifikasi murid.

## 3. Student Flow (baru)
Halaman kelas: stream **berprioritas** (pengumuman pinned → tugas/latihan belum
dikerjakan → materi → selesai), deadline **manusiawi** ("Besok", "2 hari lagi",
"Terlambat 1 hari"), saat DINILAI tampil **nilai + Feedback guru** di kartu.

## 4. Submission Flow
Reuse penuh: penugasan (jawaban/praktik) + quiz. `GET /api/guru/penugasan/[id]`
menyediakan daftar murid + submission untuk review.

## 5. Grading Flow
Reuse `POST /api/guru/penugasan/[id]/nilai-praktik` (nilai+catatan+
upsertNilaiOtomatis ke rekap). **0 endpoint baru** — hanya ditambah notifikasi.

## 6. Feedback Flow
`praktikCatatan` kini ikut payload murid → ditampilkan "Feedback guru" saat
DINILAI; notifikasi "Tugas Dinilai" (deep-link `/arena/tugas/[id]/kerjakan`).

## 7. Material Flow
Utuh dari 6.0/6.1 (kirim route + CTA murid) — tidak diubah.

## 8. Assignment Flow
Utuh — composer Tugas (Buku Ajar/quiz) + review baru.

## 9. Quiz Flow
Utuh — assign route + tab Tugas guru menampilkan ringkasan quiz + link ke
`/guru/kuis/[id]/results` (hasil existing).

## 10. Multi-Class Flow
Utuh — groupIds[] di semua jalur; ringkasan dihitung per kelas (kelas ini
saja), konsisten tanpa duplikasi.

## 11. Notification Flow
- Kirim penugasan → notif murid (6.1) ✓
- Kirim quiz → notif murid (6.1) ✓
- Kirim materi → notif murid ✓
- **Nilai tugas → notif murid (BARU 6.2)** ✓
- Pengumuman → notif murid ✓

## 12. LearningEvidence Integration
**GAP terdokumentasi (tanpa perubahan)**: quiz/penugasan submission TIDAK
menulis LearningEvidence (evidence saat ini berasal dari adaptive practice,
diagnostic, jalur cerdas). Menghubungkan submission → evidence membutuhkan
keputusan founder + desain (sumber `BANK_SOAL` quiz, activityId assignment)
— tidak dibuat di fase ini sesuai Part O (dokumentasikan, jangan schema baru).

## 13. Existing API Reused
`GET /api/guru/kelasku/[id]` (extended: ringkasan) · `GET /api/murid/kelasku/[id]`
(extended: feedback) · `GET /api/guru/penugasan/[id]` · `POST .../nilai-praktik`
(+notif) · `GET /api/guru/quiz/[id]/results` (link) · composer/ClassPicker 6.0.

## 14. New API
**0 endpoint baru** — semua perubahan additive pada payload/route existing.

## 15. Mobile UX
Review = bottom sheet (bc-sheet), CTA full-width, filter chips, cari murid;
ringkasan chips wrap di kartu; touch ≥44px; sticky footer review.

## 16. Light/Dark UX
Token bc-student (violet) + bc-status (belum/sedang/kumpul/nilai) — light &
dark terdefinisi di classroom.css; theme existing.

## 17. Security
- Ringkasan & review: `teacherId` pemilik kelas diverifikasi (penugasan detail
  Forbidden untuk non-owner).
- Murid: membership wajib; submission hanya milik user; feedback hanya milik
  user.
- Review modal: tautan karya dibuka target=_blank + rel=noopener (URL sudah
  divalidasi http/https di praktik route).

## 18. Tests
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-learning-loop` (BARU) | ✅ 28/28 |
| `test:bc-classroom-simple-flow` (6.0) | ✅ 37/37 |
| `test:bc-classroom-student-flow` (6.1) | ✅ 30/30 |
| `test:guru-phase` · `test:student-home` · `test:my-day-home` | ✅ SEMUA LULUS |
| `test:mobile-navigation` (allowlist 6.2) | ✅ 48/48 |
| `test:arena-web` (allowlist 6.2) | ✅ 56/56 |
| `test:unified-shell` | ✅ 61/61 |
| `test:premium-economy` · `test:gamification-engine` | ✅ SEMUA LULUS |
| `npx tsc --noEmit` · `npm run lint` · `npm run build` · `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 19. Protected Zones
0 diff: prisma/, LearningEvidence, QuestionMetadata, LearnerState, adaptive,
diagnostic, gamification, learning-loop, UKBI, TKA, Jalur Cerdas, Arena,
leaderboard, coins, APK, auth. app/api bertambah 3 route classroom additive
(masuk allowlist 2 test).

## 20. DB / Migration Status
READ ONLY — 0 migration, 0 model baru, 0 seed.

## 21. Known Limitations
1. Submission → LearningEvidence belum tersambung (gap terdokumentasi §12).
2. Quiz grading dari kelas → link ke halaman results existing (belum inline
   seperti penugasan).
3. Ringkasan belum tampil di kartu daftar kelas (hanya di detail/tab Tugas).
4. "Untukmu" belum menjadi section eksplisit di beranda murid (hanya urutan
   prioritas di halaman kelas).

## 22. Recommended STEP 6.3
- Student Home "Aksi Belajarmu" menampilkan tugas kelas mendesak (tenggat
  terdekat) + tombol kerjakan.
- Submission → "Jadikan Karya" (approval schema additive: StudentKarya
  sumberType/sumberId).
- Badge "N perlu diperiksa" di kartu kelas guru (aggregate count ringkasan).

## 23. Verdict
**GREEN (menunggu Founder Review untuk commit)** — learning loop lengkap:
guru lihat siapa sudah/belum → review → nilai + feedback → murid lihat hasil +
notifikasi; 0 endpoint baru; 28/28 test + seluruh regression hijau; protected
zones 0 diff; DB read-only.

---

### Git status (NO COMMIT)
```
M app/api/guru/kelasku/[id]/route.ts          (+ringkasan sudah/sedang/belum)
M app/api/murid/kelasku/[id]/route.ts         (+feedback praktikCatatan)
M app/api/guru/penugasan/[id]/nilai-praktik/route.ts (+notif "Tugas Dinilai")
M app/(dashboard)/guru/kelasku/page.tsx       (chips ringkasan + review panel)
M app/(dashboard)/murid/kelasku/[id]/page.tsx (prioritas + deadline + feedback)
M components/kelas/SubmissionReview.tsx       (BARU: daftar+filter+review)
M lib/classroom/deadline.ts                   (BARU: deadline manusiawi)
M package.json                                (+test:bc-classroom-learning-loop)
M scripts/test-mobile-navigation.ts / test-arena-web.ts (allowlist)
?? scripts/test-bc-classroom-learning-loop.ts
?? docs/PHASE_6_STEP_2_BC_CLASSROOM_LEARNING_LOOP.md
```
