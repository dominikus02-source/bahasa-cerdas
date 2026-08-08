# Guru Navigation V2 — Simplify & Consolidate

Tanggal: 8 Agustus 2026
Scope: Information Architecture (IA) + sidebar navigasi guru
Prinsip: **AUDIT → MAP → CONSOLIDATE → VERIFY** — tidak ada route/API/model yang dihapus.

---

## 1. Masalah IA Lama

| Masalah | Contoh |
|---|---|
| Submenu bertingkat (Grandchild) | `Kelasku → Penilaian → Rapor` |
| Terlalu banyak submenu | `Alat Ajar` memiliki 7 item |
| Fitur satu domain dipisah | `Video Pembelajaran` vs `Artikel` vs `Buku Ajar` |
| Menu alias/duplikat | `Pengumuman` dan `Dashboard Kelas` menunjuk ke `/guru/kelasku` |
| Menu yang hanya berbeda nama | `Buku Nilai` dan `Penilaian` adalah domain yang sama |
| Sidebar seperti daftar semua fitur | 12 grup, beberapa dengan submenu |
| Submenu tidak konsisten | Ada yang depth-1, ada yang depth-2 |

---

## 2. IA Baru (maksimal 1 level submenu)

```
🏠 Beranda                        → /guru/beranda
✨ Pusat Literasi                 → /guru/feed-karya
📚 Alat Ajar
   ├── Bank Soal                  → /guru/bank-soal
   ├── Materi Ajar                → /guru/materi-ajar
   ├── Buku Ajar                  → /guru/panduan-guru
   └── Media Pembelajaran         → /guru/media-pembelajaran (baru)
👥 Kelasku
   ├── Dashboard Kelas            → /guru/kelasku
   ├── Tugas                      → /guru/tugas-murid
   ├── Nilai                      → /guru/penilaian
   └── Data Siswa                 → /guru/data-siswa
🎮 Gim                            → /guru/game
🛍 Toko Karya
   ├── Jual Karya                 → /guru/toko-karya
   ├── Jelajahi Karya             → /marketplace
   └── Pendapatan                 → /guru/pengaturan/saldo
📝 Simulasi & Tes
   ├── Simulasi UKBI / TKA / BIGT / Hasil / Tinjau / Dokumen
🤖 Alat AI                        → /guru/ai-tools
👥 Komunitas                      → /guru/komunitas
📅 Kalender                       → /guru/olimpiade
👤 Akun Saya
   ├── Ringkasan Akun             → /guru/akun (Account Center)
   └── Profil                     → /guru/profile
⚙️ Admin (founder only)           → /admin
```

### Catatan desain
- Grup dengan **satu destination** dirender sebagai **link langsung** (tanpa accordion), menghilangkan pola `Beranda └── Beranda`.
- Grup dengan children hanya **1 level** — properti `sub` (grandchild) dihapus dari tipe data.
- `Simulasi & Tes` dipertahankan karena merupakan domain inti UKBI/TKA dan dituntut oleh test (`test-simulation-workflow`, `test-bigt-menu`, `test-phase-simulation-workflow`).

---

## 3. Mapping Old → New

| Menu Lama | Route Lama | Aksi |
|---|---|---|
| Beranda | `/guru/beranda` | Tetap (link langsung) |
| Pusat Literasi | `/guru/feed-karya` | Tetap (link langsung) |
| Alat Ajar → Bank Soal | `/guru/bank-soal` | Tetap |
| Alat Ajar → Materi Ajar | `/guru/materi-ajar` | Tetap |
| Alat Ajar → Buku Ajar | `/guru/panduan-guru` | Tetap |
| Alat Ajar → Video Pembelajaran | `/guru/video-belajar` | **Dikonsolidasikan** → Media Pembelajaran (route tetap hidup) |
| Alat Ajar → Artikel | `/guru/artikel` | **Dikonsolidasikan** → Media Pembelajaran (route tetap hidup) |
| Alat Ajar → Kuis | `/guru/kuis` | **Dihapus dari sidebar** — diakses via Bank Soal (route tetap hidup) |
| Alat Ajar → Soal | `/guru/soal` | **Dihapus dari sidebar** — diakses via Bank Soal (route tetap hidup) |
| Kelasku → Dashboard Kelas | `/guru/kelasku` | Tetap |
| Kelasku → Tugas | `/guru/tugas-murid` | Tetap |
| Kelasku → Buku Nilai | `/guru/gradebook` | **Dikonsolidasikan** → Nilai (`/guru/penilaian`) (route tetap hidup) |
| Kelasku → Penilaian → Input Massal | `/guru/penilaian/input-massal` | **Dikonsolidasikan** → Nilai (route tetap hidup) |
| Kelasku → Penilaian → Nilai Kuis | `/guru/penilaian/kuis` | **Dikonsolidasikan** → Nilai (route tetap hidup) |
| Kelasku → Penilaian → Rapor | `/guru/penilaian/rapor` | **Dikonsolidasikan** → Nilai (route tetap hidup) |
| Kelasku → Pengumuman | `/guru/kelasku` (alias) | **Dihapus** (duplikat Dashboard Kelas) — pengumuman dikelola di Dashboard Kelas |
| Gim → Arena Permainan | `/guru/game` | Tetap (link langsung, subroute tetap aktif) |
| Gim → Riwayat Aktivitas | `/guru/game/history` | **Dihapus dari sidebar** — link internal di `/guru/game` (route tetap hidup) |
| Toko Karya → Jual/Jelajahi/Pendapatan | 3 route | Tetap (depth 1) |
| Akun Saya → Ringkasan Akun | `/guru/akun` | Tetap (Account Center) |
| Akun Saya → Profil | `/guru/profile` | Tetap |
| Akun Saya → Berlangganan | `/guru/berlangganan` | **Dihapus dari sidebar** — diakses via Akun hub (route tetap hidup) |
| Akun Saya → Notifikasi | `/guru/notifikasi` | **Dihapus dari sidebar** — diakses via Akun hub (route tetap hidup) |
| Akun Saya → Pengaturan | `/guru/pengaturan` | **Dihapus dari sidebar** — diakses via Akun hub (route tetap hidup) |
| Simulasi & Tes (6 item) | 6 route | Tetap (depth 1, dituntut test) |
| Alat AI / Komunitas / Kalender / Admin | — | Tetap (link langsung) |

---

## 4. Route yang Dipertahankan (TIDAK ADA yang dihapus)

Semua route berikut TETAP hidup dan bisa diakses langsung / via link internal:

- `/guru/kuis`, `/guru/kuis/new`, `/guru/kuis/[id]/*`
- `/guru/soal`
- `/guru/video-belajar`
- `/guru/artikel`
- `/guru/gradebook`
- `/guru/penilaian/input-massal`, `/guru/penilaian/kuis`, `/guru/penilaian/rapor`
- `/guru/berlangganan`, `/guru/notifikasi`, `/guru/pengaturan`, `/guru/pengaturan/saldo`, `/guru/pengaturan/premium`
- `/guru/game/history` (+ semua subroute game)
- `/guru/bank-soal-tka`, `/guru/bank-soal-ukbi` (bank soal Kemdikbud)

---

## 5. Feature yang Dikonsolidasikan

| Domain | Konsolidasi |
|---|---|
| **Nilai** (Buku Nilai, Penilaian, Input Massal, Nilai Kuis, Rapor) | Satu destination `Nilai` → `/guru/penilaian`. Halaman penilaian kini punya navigasi internal: `[Nilai | Buku Nilai | Input Massal | Nilai Kuis | Rapor]` |
| **Media Pembelajaran** (Video + Artikel) | Satu destination `/guru/media-pembelajaran` dengan tab internal `[Video | Artikel]` yang me-render halaman video & artikel existing |
| **Bank Soal** (Bank Soal, Latihan, Kuis, Soal) | Bank Soal punya navigasi internal `[Bank Soal | Latihan | Kuis | Soal]` |
| **Akun Saya** (Profil, Berlangganan, Saldo, Lencana, Notifikasi, Pengaturan) | `/guru/akun` sudah menjadi Account Center (menu kartu internal); sidebar hanya menampilkan Ringkasan Akun + Profil |

---

## 6. Internal Navigation yang Digunakan

1. **`/guru/penilaian`** — segmented control `[Nilai | Buku Nilai | Input Massal | Nilai Kuis | Rapor]` (Link, active state by pathname).
2. **`/guru/media-pembelajaran`** (baru) — tab `[Video | Artikel]` me-render `VideoBelajarPage` / `GuruArtikelPage` (route lama tetap utuh).
3. **`/guru/bank-soal`** — segmented control `[Bank Soal | Latihan | Kuis | Soal]`.

---

## 7. Compatibility Notes

- `components/dashboard/GuruSidebar.tsx` (standalone) **tidak diubah** — hanya dibaca oleh test (`test-simulation-workflow`, `test-bigt-menu`, `test-phase9h-launch-readiness`). Bukan dipakai di produksi.
- `GuruNav.tsx` masih diekspor `GURU_NAV`, `GuruNavList`, `GuruMobileNav`, `LogOut` — kontrak dengan `app/(dashboard)/guru/layout.tsx` tidak berubah.
- Tipe `NavGroup` berubah: kini mendukung `href` (link langsung) ATAU `links` (depth 1). Properti `sub` dihapus.
- `isActive()` mendukung `activeOn` (prefix tambahan) — `Nilai` tetap aktif saat berada di `/guru/gradebook`.
- Mobile bottom nav: label `Panggung` → `Literasi` (konten sama).

## 8. QA Result

| Check | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (4 file diubah) | ✅ 0 errors (2 pre-existing `<img>` warnings) |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npm run test:bigt-menu` | ✅ 23/23 |
| `npm run build` (dummy env) | ✅ 359 routes, 0 errors |
| Route lama yang dihapus dari sidebar | ✅ Semua masih ada di build output |
| `/guru/media-pembelajaran` | ✅ Baru, build OK |
| Route/API/model dihapus | ❌ TIDAK ADA |
