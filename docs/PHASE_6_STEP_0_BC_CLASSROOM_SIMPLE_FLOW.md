# PHASE 6 STEP 0 — BC Classroom Simple Flow · iOS Edu UX

> Status: **IMPLEMENTED** — Kelasku menjadi BC Classroom dengan satu primary
> action `+ Tambahkan`, composer 4 tipe, ClassPicker multi-kelas, pengumuman
> multi-kelas (additive), iOS Edu design tokens light/dark. NO COMMIT (menunggu
> Founder Review).

---

## 1. Current Classroom Architecture (sebelum)
Kelasku = grid kartu kelas + detail 5 tab (overview/tugas/nilai/pengumuman/materi).
Kirim konten tersebar di 4 halaman library (materi-ajar, bank-soal, panduan-guru)
dengan 4 modal berbeda; pengumuman single-class; tanpa satu CTA "bagikan".

## 2. Existing APIs Discovered & Reused
| Endpoint | Fungsi | Dipakai composer |
|---|---|---|
| `GET /api/group` | daftar kelas guru (+ memberCount) | ClassPicker |
| `POST /api/group` | buat kelas + access code | modal Buat Kelas |
| `POST /api/guru/materi/[id]/kirim` | kirim materi → groupIds[] | Flow Materi |
| `POST /api/guru/penugasan` | tugas unit → groupIds[] + tenggat | Flow Tugas (Buku Ajar) |
| `POST /api/guru/quiz/[id]/assign` | assign quiz → groupIds[] + dueDate | Flow Tugas/Latihan |
| `POST /api/guru/latihan` (GET list) | daftar latihan yang sudah dibuat | Flow Latihan |
| `GET /api/guru/panduan` | daftar bab Buku Ajar | Flow Tugas |
| `GET /api/guru/materi` | daftar materi | Flow Materi |
| `POST /api/guru/pengumuman` | pengumuman — **kini groupIds[] (additive)** | Flow Pengumuman |
| `GET /api/guru/kelasku/[id]` | detail kelas agregat | stream/tabs |
| pengumuman `[id]` PATCH/DELETE | edit/pin/hapus | Aktivitas stream |

**0 endpoint baru** — satu-satunya perubahan backend: `pengumuman` POST
menerima `groupIds[]` (backward-compatible dengan `groupId`).

## 3. Existing Components Reused
- Mobile bottom nav / shell: tidak disentuh (Step 5.0).
- Icon set lucide, next-themes dark: `dark` variant — dipakai token CSS.
- Semua modal/state pattern dari halaman kelasku lama (create/delete/copy code).

## 4. UX Problems Fixed
- 4 modal kirim berbeda → **1 composer** (`+ Tambahkan`).
- Pengumuman per kelas → **multi-kelas**.
- Istilah teknis (Penugasan/QuizAssignment) → **Materi/Tugas/Latihan/Pengumuman**.
- Kelas tidak punya CTA → **+ Tambahkan** (primary) di daftar & detail.
- Detail 5 tab → tab produk: **Aktivitas / Materi / Tugas / Nilai / Orang**.

## 5. New UX Architecture
```
Kelasku (daftar kelas + [+ Tambahkan] + [Buat Kelas])
  → Detail kelas: header (nama, jumlah siswa, kode, [+ Tambahkan])
      → Tab Aktivitas (stream: pengumuman/tugas/materi + form pengumuman cepat)
      → Tab Materi / Tugas / Nilai / Orang
  → ClassroomComposer (sheet): tipe → sumber → konten → kelas → kirim → success
```

## 6. `+ Tambahkan` Flow
Satu tombol (daftar & detail kelas) → bottom sheet (mobile) / dialog (desktop):
**Apa yang ingin kamu berikan?** → Materi / Tugas / Latihan / Pengumuman
(dengan deskripsi bahasa manusia, tanpa istilah backend).

## 7. Materi Flow
`+ Tambahkan → Materi → Sumber (Materi Ajar | Link eksternal) → pilih konten
(search) → [Lanjut] → tenggat opsional → ClassPicker (☑ 7A ☑ 7B) → Kirim Materi`
→ `POST /api/guru/materi/{id}/kirim {groupIds}`. Link eksternal → pengumuman
dengan tautan (endpoint existing).

## 8. Tugas Flow
`+ Tambahkan → Tugas → Sumber (Buku Ajar | Quiz yang sudah dibuat) → pilih bab/quiz
→ [Lanjut] → judul+instruksi+tenggat (default masuk akal) → ClassPicker → Kirim Tugas`
→ `POST /api/guru/penugasan {unitId, groupIds, judul, deskripsi, tenggat}` atau
`POST /api/guru/quiz/{id}/assign {groupIds, dueDate, notes}`.

## 9. Latihan Flow
`+ Tambahkan → Latihan → Sumber (Latihan yang sudah dibuat | Buat dengan AI)`
→ pilih latihan → kelas → `POST /api/guru/quiz/{id}/assign`. "Buat dengan AI"
membuka Bank Soal existing (tanpa duplikasi generator).

## 10. Pengumuman Flow
`+ Tambahkan → Pengumuman → judul + isi + tenggat (opsional) → ClassPicker → Kirim`
→ `POST /api/guru/pengumuman {groupIds, judul, deskripsi, tenggat}` —
**additive multi-class**: createMany + notifikasi murid dedupe + XP guru sekali.
Backward-compatible: `groupId` lama tetap diterima (kelasku lama/form lain).

## 11. Multi-Class Delivery
Semua flow mengirim `groupIds[]` → backend createMany per kelas dengan
@@unique (quiz+group, materi+group, penugasan+user) → **tidak ada duplikasi
konten**. Semua kelas diverifikasi `teacherId` pemilik (authorization server-side).
Partial failure: pesan manusiawi "Belum berhasil dikirim. Coba lagi. Tidak ada
data yang hilang." (endpoint tidak mengekspos status per kelas — documented).

## 12. ClassPicker
Reusable `components/kelas/ClassPicker.tsx`: checkbox multi-kelas (≥44px touch),
Pilih semua / Hapus semua, pencarian (muncul saat >6 kelas), jumlah siswa per
kelas, "N kelas dipilih", validation, disabled state, aria-pressed.

## 13. Mobile UX
- Composer = bottom sheet (rounded top, max-h 92dvh, safe-area) di HP; dialog
  centered di desktop (media 768px).
- Form satu kolom, CTA sticky di footer sheet.
- Kartu kelas grid → 1 kolom otomatis (sm:grid-cols-2 lg:grid-cols-3).
- Tab kelas scrollable horizontal.
- Bottom nav Step 5.0 tidak disentuh.

## 14. iOS Edu Design System
`components/kelas/classroom.css` — semantic tokens scoped `.bc-classroom`:
bg / surface / surface-2 / border / text / text-2 / text-3 / accent / success /
warning / danger + radius & shadow. Cards radius 20px, border subtle, shadow
halus; CTA hijau emerald (Guru); chips pill; input 48px; row 56px; fokus ring.

## 15. Light Mode
`--clr-bg #f4f5f7`, surface putih, teks #16181d — terang, bersih, premium.

## 16. Dark Mode
`.dark .bc-classroom`: bg #0f1117, surface #171a22, border #262b38, teks #f1f2f6,
accent #34d399 — kontras terjaga, kartu/border tetap terlihat, `color-scheme`
diset. Memakai theme existing (next-themes `dark` class), tanpa engine kedua.

## 17. Accessibility
focus-visible ring emerald; aria-label pada dialog/tombol ikon; aria-pressed
pada picker; contrast token (text-2 #5b6270 ≥ 4.5:1 di light); touch target
≥44px; label eksplisit pada input.

## 18. Performance
Composer lazy-load konten hanya saat langkah konten dibuka (tidak fetch bank
soal/materi di halaman awal); daftar kelas 1 request; detail kelas 1 endpoint
agregat + polling 20s (sama dengan pola lama); tidak ada N+1 baru.

## 19. Security
- Server memverifikasi `teacherId` pemilik di semua endpoint (tidak percaya
  klien); pengumuman multi-kelas memvalidasi `groups.length === groupIds.length`.
- Client hanya mengirim id konten + groupIds + field opsional; tidak mengirim
  teacherId/ownership/count.

## 20. Test Results
| Check | Hasil |
|-------|-------|
| `npm run test:bc-classroom-simple-flow` (BARU) | ✅ 37/37 |
| `test:guru-phase` | ✅ SEMUA LULUS |
| `test:mobile-navigation` (allowlist pengumuman) | ✅ 48/48 |
| `test:unified-shell` | ✅ 61/61 |
| `test:premium-economy` | ✅ SEMUA LULUS |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 |
| `git diff --check` | ✅ bersih |

## 21. Protected Zone Verification
0 diff: prisma/, gamification, learning-loop, adaptive, learner-state,
diagnostic, arena, coins, apk, award-xp, app/api/player. Perubahan backend
hanya `app/api/guru/pengumuman/route.ts` (additive multi-class, backward-
compatible) — dicatat sebagai exception di test-mobile-navigation.

## 22. Known Limitations
1. Partial per-class failure belum di-ekspos endpoint (pesan generik manusiawi).
2. Flow "Tugas" belum menyediakan pembuatan instruksi bebas tanpa konten
   (perlu unit/quiz); link eksternal diarahkan via pengumuman.
3. Nilai/Orang tab = ringkasan + tautan ke halaman existing (belum inline).
4. Belum ada koneksi submission → Karya Siswa (fase berikutnya).
5. `Buku Ajar` picker memuat banyak bab — sudah searchable.

## 23. Future Improvements
- Submission → "Jadikan Karya" (StudentKarya + sumber opsional).
- Antrean "Perlu Diperiksa" per kelas dengan badge di kartu.
- Konsolidasi halaman Nilai & Gradebook dalam satu view per kelas.
- Partial-failure per-kelas di endpoint delivery (respons granular).

## 24. Final Verdict
**GREEN (menunggu Founder Review untuk commit)** — Kelasku jauh lebih
sederhana: satu `+ Tambahkan`, 4 tipe flow konsisten, ClassPicker multi-kelas,
pengumuman multi-kelas, reuse 100% backend existing (0 endpoint baru), iOS Edu
light/dark, mobile-first, 37/37 test + seluruh regression hijau, protected
zones 0 diff (satu pengecualian additive terdokumentasi).

---

### Git status (NO COMMIT — menunggu Founder Review)
```
M app/(dashboard)/guru/kelasku/page.tsx      (rewrite BC Classroom UX)
M app/api/guru/pengumuman/route.ts           (groupIds[] additive)
M package.json                               (+test:bc-classroom-simple-flow)
M scripts/test-mobile-navigation.ts          (allowlist pengumuman)
?? components/kelas/classroom.css
?? components/kelas/ClassPicker.tsx
?? components/kelas/ClassroomComposer.tsx
?? scripts/test-bc-classroom-simple-flow.ts
?? docs/PHASE_6_STEP_0_BC_CLASSROOM_SIMPLE_FLOW.md
```
