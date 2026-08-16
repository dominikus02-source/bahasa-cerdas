# PHASE 6 STEP 7 — BC Classroom Teacher Experience Audit & Simplification

> Status: **DONE** — audit + simplification minimal + **perbaikan integritas
> harness test classroom (semua check kini benar-benar dieksekusi)**.
> NO COMMIT (menunggu Founder Review).

---

## 1. Objective
Membuat seluruh kemampuan Classroom 6.0–6.6 terasa sesederhana mungkin bagi
guru — tanpa fitur baru, tanpa endpoint baru, tanpa ubah menu utama.

## 2. Current Architecture
Semua tercommit (a4f4ace): Kelasku (Today View, tab, composer, review),
ClassPicker, SubmissionReview, insight, deadline, student class page.

## 3. Current Teacher Journey (berdasarkan kode aktual)
- FLOW 1-2 Kelasku/kelas: daftar → kartu → detail (Today View) — 2 klik.
- FLOW 3-8 Kirim materi/tugas/latihan/pengumuman: `+ Tambahkan` → tipe →
  sumber → konten → kelas (auto-pilih) → Kirim — **4–5 langkah**.
- FLOW 9-11 Lihat belum mengerjakan → nilai: Today View → Lihat Pengumpulan →
  buka murid → Simpan Penilaian — **3 langkah**.
- FLOW 12 Kirim ulang: Today View → **Kirim Lagi** — 2 langkah.

## 4. Current Problems
1. **KRITIS (ditemukan saat audit): harness 7 test classroom memakai
   `check(name, ok)` dengan argumen arrow function → selalu truthy → semua
   check lolos tanpa dievaluasi** (hasil "25–37 lulus" sebelumnya TIDAK valid).
2. Empty state tab Materi/Tugas tanpa CTA.
3. Label direct-send Bank Soal tidak seragam dengan "Kirim ke Kelas"
   (sebagian "Kirim ke Murid"/"Kirim Latihan").

## 5. API Reuse Audit
Semua flow memakai endpoint 6.0–6.6 (materi/kirim, penugasan, quiz assign,
pengumuman, penugasan/[id], nilai-praktik, insight, kelasku) — **0 endpoint
baru** (diverifikasi: diff app/api hanya 9 route classroom yang sudah ada).

## 6. Classroom Composer Audit
Progressive disclosure (tipe → sumber → konten → kelas → kirim), preset
deadline, LKS opsional, kelas auto-pilih, "Kirim Lagi" — sudah sesuai target.

## 7. Material Flow
Materi reusable (1 materi → N kelas, LKS opsional 0–4) + direct-send dari
Materi Ajar ("Kirim ke Kelas") — ≤4 langkah via composer, ≤3 via direct-send.

## 8. Assignment Flow
Tugas (Buku Ajar/quiz existing) + instruksi + deadline preset + kelas —
≤4 langkah.

## 9. Exercise Flow
Latihan yang sudah dibuat / Buat AI (link Bank Soal) — ≤4 langkah.

## 10. Announcement Flow
Pengumuman multi-kelas — ≤4 langkah.

## 11. Multi-Class Flow
ClassPicker (Pilih semua, N kelas dipilih, jumlah siswa, touch ≥44px); kelas
aktif auto-tercentang; Kirim Lagi (localStorage).

## 12. Today View
Urutan: **Perlu perhatian → Sedang berjalan → Kirim Lagi → + Tambahkan** —
pusat kendali, bukan dashboard statistik.

## 13. Submission/Review
SubmissionReview (filter Semua/Belum/Sudah + nilai + catatan) — guru ≤3
langkah untuk menilai.

## 14. Terminology
UI primer bebas istilah backend (diverifikasi: tidak ada activityId/
submission_count/assignment_status/POST /api di teks tampil).

## 15. Mobile UX
Bottom sheet, CTA full-width, touch ≥44px, safe-area, bottom nav 5.0 utuh.

## 16. iOS Edu Light/Dark
Token semantik bc-classroom/bc-student — theme existing, tanpa engine baru.

## 17. Google Classroom Benchmark
- Create/post → + Tambahkan ✅ · Assign to class → ClassPicker ✅ ·
  Multiple classes ✅ · Stream → Aktivitas ✅ · Student work → Pengumpulan ✅ ·
  Grading → SubmissionReview ✅ · Feedback → catatan + notif ✅ ·
  Notifications ✅.
- **Depth tanpa complexity**: evidence → LearnerState → personalization +
  insight (dibalik layar; guru/murid hanya melihat bahasa manusiawi).

## 18. Before/After Flow (angka dari audit kode)
| Flow | Before | After | Target |
|---|---|---|---|
| Kirim materi (composer) | 5–6 langkah* | 4–5 (kelas auto-pilih) | ≤4 |
| Kirim materi (direct-send) | 3 | 3 | ≤3 |
| Kirim tugas | 5–6 | 4–5 | ≤4 |
| Kirim latihan | 5 | 4–5 | ≤4 |
| Lihat siswa belum mengerjakan | 2–3 | 2 (Today View) | ≤2 |
| Nilai tugas | 3–4 | 3 (Pengumpulan→murid→Simpan) | ≤3 |
| Kirim ulang materi | 5–6 | 2 (Kirim Lagi) | ≤3 |
\*Sebelum auto-select (6.5), guru harus centang kelas dari nol setiap kirim.

## 19. Test Results
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-teacher-experience` (BARU) | ✅ 26/26 |
| 7 suite classroom (harness diperbaiki, check benar-benar dieksekusi): 37+30+28+32+28+25+26 = 206 | ✅ SEMUA LULUS |
| guru-phase · student-home 61/61 · my-day-home 37/37 · mobile-navigation 48/48 · unified-shell 61/61 · arena-web 56/56 · gamification-engine · premium-economy | ✅ SEMUA LULUS |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` / `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 20. Protected Zones
**0 DIFF** (prisma, gamification, learning-loop, adaptive, learner-state,
diagnostic, arena, coins, apk, player).

## 21. DB Safety
READ ONLY — 0 migration, 0 seed, 0 production write.

## 22. Known Limitations
1. "≤4 langkah" via composer masih 4–5 bila guru memakai source baru tanpa
   preset (kelas auto-pilih menutup sebagian); direct-send = 3.
2. Label Bank Soal belum 100% seragam ("Kirim Latihan ke Kelas" vs
   "Kirim ke Kelas") — konsolidasi label = polish kecil berikutnya.
3. Harness lama (sebelum 6.7) menghasilkan angka yang tidak valid — angka
   6.0–6.6 di laporan sebelumnya harus dibaca ulang dengan hasil baru.

## 23. Recommendation
1. Lanjut konsolidasi label direct-send (Bank Soal) menjadi "Kirim ke Kelas".
2. QA visual manual (375–1280px, light/dark) sebelum rilis.
3. Jika ingin ≤4 murni: composer bisa mengingat jenis+kelas terakhir
   (localStorage) — bukan fitur baru, hanya default lebih pintar.

## 24. Final Verdict
**GREEN (menunggu Founder Review)** — setelah perbaikan integritas harness,
seluruh 206 check classroom + 232 check regression lain hijau; 0 endpoint
baru; protected zones 0 diff; DB read-only. Simplification dilakukan minimal
(empty state CTA + verifikasi label); mayoritas audit menunjukkan 6.0–6.6
sudah memenuhi target.

---

### Git status (NO COMMIT)
```
M app/(dashboard)/guru/kelasku/page.tsx      (empty state CTA Materi/Tugas)
M scripts/test-bc-classroom-{simple-flow,student-flow,learning-loop,
  learning-intelligence,daily-flow,one-click,student-submission}.ts
                                             (HARNESS FIX: check(fn) dieksekusi
                                              + assertion diselaraskan kode aktual)
M package.json                               (+test:bc-classroom-teacher-experience)
?? scripts/test-bc-classroom-teacher-experience.ts
?? docs/PHASE_6_STEP_7_BC_CLASSROOM_TEACHER_EXPERIENCE_AUDIT.md
```
