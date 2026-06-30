# Phase Public Content Display & Dummy Data Cleanup

## Completed: June 30, 2026

## Penyebab Artikel Tidak Semua Tampil

**Root cause**: `app/artikel/page.tsx` menggunakan direct Prisma query dengan `take: 12` dan **TIDAK ada pagination**. Dari 36 artikel PUBLISHED, hanya 12 termutakhir yang tampil. Sisanya (24 artikel) tersembunyi.

## Solusi

### 1. Artikel — Pagination + Filter (Selesai)

**API (`app/api/artikel/route.ts`):**
- Pagination dengan `skip/take` + `totalPages`
- Parameter: `?page=1&limit=12&author=Washadi&category=Sastra&search=puisi`
- Tidak expose email author (hanya `fullName`, `avatar`, `id`)
- Filter `isPublished: true` wajib
- Order by `publishedAt desc, createdAt desc`

**Halaman (`app/artikel/page.tsx`):**
- Client component dengan `fetch()` ke `/api/artikel`
- Pagination UI: tombol halaman + "Muat Lebih Banyak"
- Filter: Semua, Washadi, Alexander, Dominikus, Sastra, Pembelajaran, Inovasi
- Search input
- Empty state: "Belum ada artikel pada kategori ini."
- All 36 PUBLISHED articles accessible

**Homepage (`app/page.tsx`):**
- Preview 3 artikel terbaru (unchanged)
- Tombol "Lihat Semua" → `/artikel` ✅
- Video section: filter out seed videos (by creatorId)

### 2. Video Dummy (Selesai)

**Status**: 6 video dummy disembunyikan (`isPublished: false`)
- Semua dari seed user `guru@demo.com`
- Tidak ada video real saat ini

**Filter**: Homepage + `/video-belajar` exclude `creatorId === seedUserId`

**Empty state homepage**: "Video pembelajaran pilihan akan segera tersedia."
**Empty state /video-belajar**: "Video pembelajaran sedang disiapkan."

### 3. Toko Karya Dummy (Selesai)

**Status**: 6 produk dummy disembunyikan (`isPublished: false`)
- Semua dari seed user `guru@demo.com`
- 0 purchases, 0 fileKey, fileUrl placeholder
- Tidak ada produk real saat ini

**Filter**: Homepage + `/marketplace` + `/api/marketplace/browse` exclude `sellerId === seedUserId`

**Purchase guard diperkuat** (`app/api/marketplace/purchase/route.ts`):
- Guard baru: `!karya.fileKey || karya.fileUrl?.includes("example.com")`
- Guard existing: `isPublished`, `sellerId !== buyerId`, `price > 0`

**Empty state homepage**: "Toko Karya sedang dikurasi. Produk akan tampil setelah diverifikasi."
**Empty state /marketplace**: "Toko Karya sedang dikurasi. Produk akan tampil setelah diverifikasi."

### 4. Kebijakan Data Dummy

| Data | Tindakan | Alasan |
|------|----------|--------|
| Video seed (6) | `isPublished = false` | Konten demo, bukan real |
| Karya seed (6) | `isPublished = false` | Produk demo, tidak bisa dibeli |
| Artikel founder (30) | Tetap PUBLISHED | Konten original founder |
| Artikel homepage seed (6) | Tetap PUBLISHED | Konten edukasi real (bukan dummy) |
| User/Profile/Payment/Auth | Tidak disentuh | Safety |

### 5. Script

| Script | Fungsi |
|--------|--------|
| `scripts/audit-public-content-display.ts` | Audit jumlah & status artikel/video/karya publik |
| `scripts/cleanup-dummy-public-content.ts` | Archive/hide video + produk dummy (dry-run default) |
| `scripts/test-public-content-display.ts` | 40 assertions untuk public display |

### 6. Risiko Tersisa

1. **Tidak ada video real** — setelah dummy di-archive, section video di homepage dan /video-belajar kosong (menampilkan empty state).
2. **Tidak ada produk real** — Toko Karya kosong sampai guru real upload.
3. **Guard purchase hanya untuk produk baru** — produk yang sudah di-archive tidak bisa dibeli.
4. **Cart localStorage** — User bisa add item yang sudah di-archive, tapi akan ditolak di purchase step.
5. **Seed homepage articles (6)** — masih PUBLISHED, bukan dummy tapi bukan founder articles.

### 7. Next Phase

1. Onboarding guru untuk upload produk real ke Toko Karya.
2. Upload video pembelajaran real.
3. Integrasi upload dengan validasi fileKey.
