# PHASE 6 STEP 5 — BC Classroom One-Click Teaching & UX Simplification

> Status: **IMPLEMENTED** — kelas aktif auto-terpilih, "Kirim Lagi" (last
> action), Today View prioritas, success "Tambahkan Lagi", empty state contoh.
> 0 endpoint baru. NO COMMIT (menunggu Founder Review).

---

## 1. Objective
Mengurangi keputusan/klik: guru membuka kelas → tahu kondisi → pilih konten →
pilih kelas (sudah terpilih) → Kirim. Simple di depan, intelligent di belakang.

## 2. Existing Architecture (dipakai ulang)
Composer 6.0 (4 tipe, multi-class) · ClassPicker 6.0 · Today View 6.4 ·
SubmissionReview 6.2 · insight 6.3 · `humanDeadline` 6.2 · endpoint delivery
6.0 (materi/kirim, penugasan, quiz assign, pengumuman).

## 3. Current UX Problems (ditemukan saat audit)
- Kelas tujuan harus dicentang ulang setiap kirim (repetitif).
- Setelah kirim, guru harus membuka composer lagi dari nol.
- Today View menampilkan aktivitas dulu baru "Perlu perhatian" (prioritas
  terbalik — yang butuh tindakan harus paling atas).
- Empty state tanpa petunjuk jenis aktivitas.

## 4. API Audit
| Flow | Existing API | Reusable | New API |
|---|---|---|---|
| Materi | `POST /api/guru/materi/[id]/kirim` | ✅ | — |
| Tugas | `POST /api/guru/penugasan` / `quiz/[id]/assign` | ✅ | — |
| Latihan | `POST /api/guru/quiz/[id]/assign` | ✅ | — |
| Pengumuman | `POST /api/guru/pengumuman` | ✅ | — |
| Multi-class | groupIds[] (semua) | ✅ | — |
| Review | `penugasan/[id]` + `nilai-praktik` | ✅ | — |
**0 endpoint baru.**

## 5. Flow Before
`+ Tambahkan → tipe → sumber → konten → centang kelas (dari nol) → kirim`.

## 6. Flow After
`+ Tambahkan → tipe → sumber → konten → kelas SUDAH terpilih (kelas aktif /
last action) → kirim` · **"Kirim Lagi"** → composer terbuka dengan kelas
terakhir · **"Tambahkan Lagi"** di success → composer terbuka lagi.

## 7. One-Click Principle
- Satu primary CTA: `+ Tambahkan`.
- 4 tipe dengan deskripsi manusiawi.
- Kelas aktif otomatis tercentang; pilihan terakhir diingat (localStorage,
  tanpa state global/schema).
- Konfigurasi teknis tersembunyi (deadline preset, LKS opsional).

## 8. Direct-Send Architecture
Sudah ada & dipetakan: Materi Ajar → [Kirim ke Kelas], Buku Ajar → [Kirim],
Bank Soal → [Kirim ke Murid] — semuanya menuju engine delivery yang sama
(groupIds[]). Tidak ada perubahan; didokumentasikan sebagai jalur reuse.

## 9. Multi-Class Flow
ClassPicker existing: ☑/☐ + jumlah siswa + Pilih semua + "N kelas dipilih".
Dari detail kelas: kelas itu otomatis tercentang (bisa ditambah kelas lain).

## 10. Material Flow
Pilih materi (search/terbaru) → LKS opsional 0–4 ("Materi akan dikirim tanpa
LKS.") → kelas → Kirim (endpoint existing per item).

## 11. Task Flow
Tugas → sumber (Buku Ajar / quiz existing) → judul + instruksi + deadline
preset (Hari ini/Besok/3 hari/Minggu depan) → kelas → Kirim.

## 12. Exercise Flow
Latihan → latihan yang sudah dibuat / Buat dengan AI (link Bank Soal) → kelas
→ Kirim. Tanpa konfigurasi skill/difficulty di UI.

## 13. Announcement Flow
Pengumuman → judul + isi + tenggat opsional → kelas (multi) → Kirim.

## 14. LKS Flow
Opsional (default tanpa LKS); + Tambahkan LKS maks 4 — jelas "tambahan, bukan
wajib".

## 15. Today View
Prioritas baru: **Perlu perhatian** (N siswa belum · [Lihat]) → **Sedang
berjalan** (X/Y sudah · [Lihat]) → **Kirim Lagi** (kelas terakhir) → + Tambahkan.

## 16. Error Handling
Composer: "Belum berhasil dikirim. Coba lagi. Tidak ada data yang hilang."
(tanpa istilah backend).

## 17. Empty States
Kelas kosong + contoh "Materi · Tugas · Latihan · Pengumuman" + CTA Buat Kelas;
aktivitas kosong + CTA Tambahkan.

## 18. Mobile UX
Bottom sheet, CTA full-width, touch ≥44px, safe-area — bottom nav 5.0 utuh.

## 19. Dark/Light Mode
Token bc-student (violet) light/dark — theme existing, tanpa engine baru.

## 20. Performance
Last action = localStorage (0 request); auto-select = state lokal; tidak ada
query/polling baru.

## 21. Protected Zones
**0 DIFF** (prisma, gamification, learning-loop, adaptive, learner-state,
diagnostic, arena, coins, apk, player).

## 22. Test Results
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-one-click` (BARU) | ✅ 25/25 |
| 6.0 37/37 · 6.1 30/30 · 6.2 28/28 · 6.3 32/32 · 6.4 28/28 | ✅ |
| guru-phase · student-home 61/61 · my-day-home 37/37 · mobile-navigation 48/48 · unified-shell 61/61 · arena-web 56/56 · premium-economy · gamification-engine | ✅ SEMUA LULUS |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` / `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 23. Known Limitations
1. Last action disimpan per browser (localStorage) — bukan per akun lintas
   perangkat (aman, tanpa schema; dokumentasi).
2. "Kirim Lagi" mengingat kelas, bukan seluruh konfigurasi (sengaja ringan).
3. Partial per-class failure belum granular (pesan umum manusiawi) — endpoint
   tidak mengekspos status per kelas.

## 24. Founder Acceptance
- S1 kirim materi ke 3 kelas: `+ Tambahkan → Materi → pilih → 3 kelas → Kirim`
  = **4 langkah** ✅ (kelas 3 centang sekali).
- S2 dari Materi Ajar: `Kirim ke Kelas → pilih kelas → Kirim` = **3 langkah** ✅.
- S3 latihan: `+ Tambahkan → Latihan → pilih → kelas → Kirim` = **4 langkah** ✅.
- S4 buka kelas ≤5 detik tahu: **Perlu perhatian** → **Sedang berjalan** →
  **+ Tambahkan** ✅.

## 25. Verdict
**GREEN (menunggu Founder Review untuk commit)** — UX one-click terverifikasi
25/25 + 13 suite regression hijau; 0 endpoint baru; protected zones 0 diff;
DB read-only. Visual QA manual (375/390/768/1280px, light/dark) disarankan
sebelum rilis (kondisi YELLOW→GREEN penuh setelah QA visual).

---

### Git status (NO COMMIT)
```
M app/(dashboard)/guru/kelasku/page.tsx       (auto-select, Kirim Lagi, Today reorder, Tambahkan Lagi, empty chips)
M components/kelas/ClassroomComposer.tsx      (initialClassIds + localStorage last action)
M package.json                                (+test:bc-classroom-one-click)
?? scripts/test-bc-classroom-one-click.ts
?? docs/PHASE_6_STEP_5_BC_CLASSROOM_ONE_CLICK.md
(+ file STEP 6.0–6.4 yang belum di-commit)
```
