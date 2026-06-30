# MGMP Community Activation — BahasaCerdas

## Status
Sistem komunitas sudah ada sejak pengembangan awal. Phase ini mengaktifkan data awal MGMP agar halaman `/guru/komunitas` tidak kosong.

## Arsitektur yang Ada (Tidak Diubah)
- **Model**: Community, CommunityMember, CommunityPost — di Prisma schema
- **API**: `/api/komunitas` (GET/POST), `/api/komunitas/[id]` (GET/POST/PUT), `/api/komunitas/[id]/join` (POST), `/api/admin/komunitas` (GET/PUT/DELETE)
- **UI Guru**: `/guru/komunitas` (daftar + buat), `/guru/komunitas/[id]` (detail + posting)
- **UI Admin**: `/admin/komunitas` (review/approve/reject/archive)
- **Enums**: CommunityType (MGMP, KKG, PUBLIKASI, STUDY_GROUP, LAINNYA), CommunityStatus (PENDING, APPROVED, REJECTED)

## Data Awal MGMP
60 grup komunitas dibuat via seed, meliputi:
- **7 Nasional**: Komunitas Guru BI Nasional, MGMP BI Nasional, Literasi, UKBI, TKA, Bank Soal, AI
- **5 Jenjang**: MGMP SD/SMP/SMA/SMK, Komunitas PPG
- **38 Provinsi**: MGMP per provinsi (Aceh s.d. Papua Barat Daya)
- **10 Topik**: Bank Soal, Modul Ajar, UKBI, TKA, Literasi, Menulis Kreatif, Kaidah BI, AI, Karya Siswa, Pelatihan

Semua grup:
- `isPublic: true` — tampil di halaman publik
- `status: APPROVED` — langsung aktif tanpa perlu review admin
- `isVerified: false` — bukan kanal resmi pemerintah
- Deskripsi mengandung disclaimer bahwa komunitas ini adalah ruang BahasaCerdas

## Keamanan
- Grup seeded tidak mencantumkan email/nomor HP pribadi
- Tidak ada klaim palsu sebagai MGMP resmi pemerintah
- Guru bergabung secara sukarela (tidak ada auto-join)
- Join route memvalidasi community status (APPROVED + isPublic)
- Admin tidak bisa menghapus permanen, hanya mengarsipkan (isPublic false + status REJECTED)

## Perubahan pada Phase Ini
| File | Perubahan |
|------|-----------|
| `data/community-groups/mgmp-groups.json` | Baru — 60 grup MGMP |
| `scripts/seed-mgmp-community-groups.ts` | Baru — seed dry-run default |
| `scripts/validate-mgmp-community-groups.ts` | Baru — validasi JSON |
| `scripts/audit-mgmp-community.ts` | Baru — audit DB + route |
| `scripts/test-mgmp-community-flow.ts` | Baru — 12+ tes integrasi |
| `app/(dashboard)/guru/komunitas/page.tsx` | "Study Group" → "Kelompok Belajar"; badge "Ruang BahasaCerdas" + "Belum Terverifikasi" |
| `app/(dashboard)/admin/komunitas/page.tsx` | Hapus → Arsipkan; "Menunggu Review" → "Menunggu Peninjauan" |
| `app/api/admin/komunitas/route.ts` | DELETE → arsip (isPublic false + status REJECTED) |
| `app/api/komunitas/[id]/join/route.ts` | Validasi community status + Bahasa Indonesia response |
| `docs/BAHASACERDAS_MGMP_COMMUNITY.md` | Baru — dokumentasi |
| `package.json` | 6 npm script baru |

## Roadmap
1. ✅ Data awal MGMP aktif
2. ⬜ Posting diskusi (already exists)
3. ⬜ Bank soal komunitas
4. ⬜ Event/webinar
5. ⬜ Verifikasi pengurus daerah
6. ⬜ Moderasi laporan konten
