# PHASE 6 STEP 4 — BC Classroom Daily Teaching Flow & Teacher Simplicity

> Status: **IMPLEMENTED** — Today view, "Perlu perhatian", stream dengan
> progress, LKS opsional, preset deadline, student "Hari Ini". UX
> orchestration murni: 0 endpoint baru. NO COMMIT (menunggu Founder Review).

---

## 1. Current Flow (sebelum 6.4)
6.0–6.3 sudah punya composer, multi-class, tab Aktivitas/Materi/Tugas/Nilai/
Orang, review submission, insight. Namun guru harus membuka tab per tab untuk
mengetahui kondisi kelas; stream belum menampilkan progress; flow materi belum
mendukung LKS opsional; deadline tanpa preset.

## 2. Duplicate Flows Found
- Ringkasan "✓/◷/—" sudah ada di tab Tugas — kini juga di **Today View** &
  **stream cards** (satu sumber data: `ringkasan*` dari detail API).
- CTA "+ Tambahkan" tetap satu-satunya primary action (tidak ditambah tombol
  per jenis).

## 3. APIs Reused
`GET /api/guru/kelasku/[id]` (ringkasan) · `POST /api/guru/materi/[id]/kirim`
(LKS = panggilan per item) · `GET /api/guru/materi` · `GET /api/guru/panduan` ·
composer endpoints 6.0 · `humanDeadline` (6.2).

## 4. APIs Changed
**0** — STEP 6.4 murni frontend/orchestration.

## 5. Today View (Part B)
Kartu "Hari Ini" di detail kelas: N aktivitas berjalan + 3 baris progress
("18 dari 32 sudah mengumpulkan · 12 belum") + [+ Tambahkan]. Tanpa tab-hopping.

## 6. Composer Simplification (Part C/G)
`+ Tambahkan` → tipe → sumber → konten → kelas → kirim (tetap). Preset
deadline: **Hari ini / Besok / 3 hari / Minggu depan** (+ kustom) di
AssignmentSettings.

## 7. Material Flow (Part D/E)
Pilih Materi → (opsional) **LKS 0–4** → pilih kelas → kirim. "Materi akan
dikirim tanpa LKS." saat kosong; LKS dikirim via endpoint existing per item
(satu konten → banyak kelas). Recent materi = daftar terbaru dari GET materi.

## 8. Book Flow (Part F)
Buku Ajar tetap = sumber Tugas (unit → penugasan) dari 6.0; tidak ada engine
baru (audit: pengiriman "bagian tertentu" = unit picker existing).

## 9. LKS Flow (Part E)
Opsional, maks 4, dari library Materi existing — tanpa model/schema baru.

## 10. Assignment Flow (Part G)
Judul + instruksi + deadline preset + kelas (ClassPicker) — tanpa konfigurasi
teknis.

## 11. Exercise Flow (Part H)
Pilih latihan yang sudah dibuat / Buat dengan AI (link Bank Soal) → kelas.
Konfigurasi minimal.

## 12. Multi-Class (Part I)
ClassPicker existing — "N kelas dipilih" + Pilih semua.

## 13. Success States (Part J)
Banner "✓ Berhasil dikirim" + nama kelas + [Lihat Aktivitas] (6.0) — arah
berikutnya jelas.

## 14. Teacher Attention (Part K)
**"Perlu perhatian"** di Today View (server-derived, tanpa AI): "N siswa belum
mengumpulkan · Tugas X" + [Lihat Pengumpulan]/[Lihat Hasil]; kosong → "Semua
aktivitas berjalan baik."

## 15. Student Priority (Part M)
Kartu **"Hari Ini"** murid: "N tugas belum selesai · M latihan belum selesai"
+ [Mulai] — prioritas tetap rank 6.2 (overdue→deadline→belum→sedang→materi→selesai).

## 16. Empty States (Part O)
Aktivitas (guru & murid) + Materi + pengumpulan — semua sudah manusiawi.

## 17. Mobile
CTA full-width, chips wrap, sheets bottom, touch ≥44px, bottom nav 5.0 utuh.

## 18. Dark/Light
Token bc-student (violet) light/dark — tanpa theme engine baru.

## 19. Tests
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-daily-flow` (BARU) | ✅ 28/28 |
| 6.0 simple-flow 37/37 · 6.1 student-flow 30/30 · 6.2 loop 28/28 · 6.3 intelligence 32/32 | ✅ |
| guru-phase · student-home · my-day-home · mobile-navigation 48/48 · unified-shell 61/61 · arena-web 56/56 · premium-economy · gamification-engine | ✅ SEMUA LULUS |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` / `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 20. Protected Zones
**0 DIFF** (prisma, gamification, learning-loop, adaptive, learner-state,
diagnostic, arena, coins, apk, player, dsb.) — verifikasi `git diff --name-only`.

## 21. DB Status
READ ONLY — 0 migration, 0 seed, 0 write (fase ini tidak menyentuh DB).

## 22. Known Limitations
1. LKS = materi lain (bukan tipe khusus) — konsisten, tanpa schema baru.
2. Book "bagian tertentu" = unit Buku Ajar (bukan sub-bab) — sesuai kapasitas
   existing.
3. Today View menampilkan 3 aktivitas teratas (ringkas); sisanya di tab Tugas.
4. "Mulai" murid mengarah ke kartu pertama yang belum dikerjakan (anchor
   stream) — bukan langsung ke soal pertama.

## 23. Next Phase
- Home guru: kartu "Hari Ini" lintas kelas (agregat dari daftar kelas).
- Badge "N perlu diperiksa" di kartu kelas (daftar kelas).
- Submission → "Jadikan Karya".

## Verdict
**GREEN (menunggu Founder Review untuk commit)** — kriteria sukses terpenuhi:
kirim materi ke 3 kelas ≤ 4 langkah; kasih tugas/latihan ≤ 4 langkah; tahu siapa
belum mengerjakan lewat Today View → 2 langkah. 28/28 test + 12 suite regression
hijau; 0 endpoint baru; protected zones 0 diff; DB read-only.

---

### Git status (NO COMMIT)
```
M app/(dashboard)/guru/kelasku/page.tsx       (Today View + Perlu perhatian + stream progress)
M app/(dashboard)/murid/kelasku/[id]/page.tsx (Hari Ini murid)
M components/kelas/ClassroomComposer.tsx      (LKS opsional + preset deadline)
M package.json                                (+test:bc-classroom-daily-flow)
?? scripts/test-bc-classroom-daily-flow.ts
?? docs/PHASE_6_STEP_4_BC_CLASSROOM_DAILY_FLOW.md
(+ file STEP 6.0–6.3 yang belum di-commit)
```
