# PHASE 6 STEP 8 — BC Classroom Navigation Simplification

> Status: **DONE** — Kelasku menjadi SATU destination sidebar; semua fungsi
> kelas pindah ke dalam konteks kelas. 0 backend change. NO COMMIT.

---

## 1. Before IA
Sidebar Guru grup "Kelasku" punya 4 child nav:
`Dashboard Kelas (/guru/kelasku) · Tugas (/guru/tugas-murid) · Nilai
(/guru/penilaian) · Data Siswa (/guru/data-siswa)` — guru melihat Kelasku
sebagai beberapa aplikasi terpisah.

## 2. After IA
Sidebar: **Kelasku** = satu destination (`/guru/kelasku`), tanpa child.
Semua fungsi kelas berada di dalam konteks kelas:
`Pilih kelas → Aktivitas (default) · Materi · Tugas · Nilai · Orang`.

## 3. Files Changed
| File | Perubahan |
|---|---|
| `components/dashboard/GuruNav.tsx` | Grup `kelasku`: `links[]` → `href: "/guru/kelasku"` (hapus 4 child nav; komentar dokumentasi). Satu-satunya perubahan fase ini. |

**Tidak ada** perubahan API, schema, engine, halaman kelas, student classroom.

## 4. Capability Preservation
Semua fungsi TETAP ada — hanya konteks navigasinya pindah:
- Tugas/Review/Penilaian → tab **Tugas** (Lihat Pengumpulan → SubmissionReview)
  + link ke `/guru/tugas-murid`.
- Nilai/gradebook → tab **Nilai** (rekap + Perkembangan Kelas + link
  `/guru/penilaian` & `/guru/gradebook`).
- Data Siswa → tab **Orang** (anggota + ketua + link `/guru/data-siswa`).
- Aktivitas (default) → Today View (Perlu perhatian · Sedang berjalan · Kirim
  Lagi · + Tambahkan).
- Halaman `/guru/tugas-murid`, `/guru/penilaian`, `/guru/gradebook`,
  `/guru/data-siswa` TETAP hidup (direct URL & link dalam kelas) — tidak
  dihapus.

## 5. API Changes
**0** — backend tidak disentuh (0 endpoint baru, 0 route berubah).

## 6. Protected Zone Verification
**0 diff**: prisma/, adaptive, learner-state, gamification, learning-loop,
award-xp, coins, diagnostic, app/api/player, engines, apk.

## 7. Regression Result
| Suite | Discovered | Executed | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| 6.0 simple-flow | 37 | 37 | 37 | 0 | 0 |
| 6.1 student-flow | 30 | 30 | 30 | 0 | 0 |
| 6.2 learning-loop | 28 | 28 | 28 | 0 | 0 |
| 6.3 learning-intelligence | 32 | 32 | 32 | 0 | 0 |
| 6.4 daily-flow | 28 | 28 | 28 | 0 | 0 |
| 6.5 one-click | 25 | 25 | 25 | 0 | 0 |
| 6.6 student-submission | 26 | 26 | 26 | 0 | 0 |
| 6.7 teacher-experience | 27 | 27 | 27 | 0 | 0 |
| **TOTAL** | **233** | **233** | **233** | **0** | **0** |
| icon-system 48 · unified-shell 61 · guru-phase ✅ · student-home 61 · my-day-home 37 · mobile-navigation 48 · arena-web 56 · premium-economy ✅ · gamification-engine ✅ | ✅ | | | | |

Harness tetap `fn()` (dieksekusi) — bukan truthy.

## 8. Manual UX Result
Belum dieksekusi (tidak ada browser di environment). Rekomendasi sebelum
rilis: sidebar → Kelasku (tanpa child), buka kelas → langsung Aktivitas,
tab Tugas → Lihat Pengumpulan, tab Nilai, tab Orang; mobile 375px; light/dark.

## 9. Known Limitations
1. Halaman `/guru/tugas-murid`, `/guru/penilaian`, `/guru/gradebook`,
   `/guru/data-siswa` masih hidup sebagai route (tanpa entry sidebar) — bisa
   diakses via link dalam kelas & URL langsung; cleanup/penghapusan bukan
   bagian fase ini (backend rule: pertahankan yang masih dipakai).
2. GuruMobileNav drawer tetap menampilkan Kelasku sebagai link tunggal
   (GuruNavList reuse) — konsisten.

## 10. Final Verdict
**GREEN (menunggu Founder Review)** — navigasi disederhanakan (LESS
NAVIGATION), seluruh capability preserved (SAME POWER); 0 backend change;
233/233 classroom checks + regression global hijau; protected zones 0 diff;
tsc/lint/build/diff-check bersih; DB read-only; 0 migration.

---

### Git status (NO COMMIT / NO PUSH)
```
M components/dashboard/GuruNav.tsx            (Kelasku = 1 destination)
M scripts/test-bc-classroom-*.ts              (harness+counters — 6.7/6.7A)
M app/(dashboard)/guru/kelasku/page.tsx       (null-safety hotfix)
M package.json
?? scripts/test-bc-classroom-teacher-experience.ts
?? docs/PHASE_6_STEP_7_BC_CLASSROOM_TEACHER_EXPERIENCE_AUDIT.md
?? docs/PHASE_6_STEP_7A_REGRESSION_INTEGRITY_REVERIFICATION.md
?? docs/PHASE_6_HOTFIX_CLASSROOM_PRODUCTION_RUNTIME.md
?? docs/PHASE_6_STEP_8_BC_CLASSROOM_NAVIGATION_SIMPLIFICATION.md
```
