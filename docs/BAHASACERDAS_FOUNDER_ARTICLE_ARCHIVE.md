# Founder Article Archive — BahasaCerdas

## Tujuan
Membangun arsip editorial yang memperkuat positioning BahasaCerdas sebagai platform edukasi Bahasa Indonesia yang kredibel, dengan artikel dari tiga pendiri yang mencakup visi produk, pedagogi, dan komunitas.

## Founder dan Fokus Tulisan

| Founder | Email | Peran | Fokus |
|---------|-------|-------|-------|
| Washadi | hdsastra47@gmail.com | Co-Founder & Head of Community | Sastra, komunitas, MGMP, literasi, budaya |
| Alexander Suryanta | alexsurya1968@gmail.com | Co-Founder & Head of Content | Pembelajaran, modul ajar, asesmen, kurikulum |
| Dominikus Wahyu | dominikus.02@gmail.com | Founder & CEO | Produk, AI, teknologi, inovasi, visi |

## 30 Artikel (10 per founder)
Rentang tanggal: 24 Mei 2026 — 30 Juni 2026. Setiap tanggal berbeda.

## Prinsip Tanggal Publikasi
- `publishedAt` = tanggal publikasi editorial (sesuai jadwal arsip)
- `createdAt` = waktu sebenarnya saat seed dijalankan (tidak dimanipulasi)
- `updatedAt` = diatur otomatis oleh Prisma

## Keamanan
- Artikel hanya PUBLISHED jika authorId valid dari akun founder asli
- Seed gagal jika salah satu akun founder tidak ditemukan
- Tidak ada deleteMany/truncate/drop
- Tidak ada klaim "resmi pemerintah"
- UKBI/TKA articles wajib menyertakan disclaimer
- Tidak ada data/statistik palsu

## Seed
```
npm run seed:founder-articles:dry-run   # Dry-run, tidak menulis DB
npm run seed:founder-articles           # Execute, upsert by slug
npm run seed:founder-articles -- --force  # Overwrite artikel non-FOUNDER_ARCHIVE
```

## Fase Berikutnya
1. Article Studio
2. AI draft generator
3. Jadwal artikel mingguan
4. Artikel komunitas MGMP
5. Artikel UKBI/TKA Practice
