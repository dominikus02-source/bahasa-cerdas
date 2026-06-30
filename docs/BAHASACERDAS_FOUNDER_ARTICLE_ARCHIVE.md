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

## Batch 2 — Quality Rewrite (June 30, 2026)

Batch pertama (30 artikel) menjalani rewrite kualitas menyeluruh karena skor audit awal rata-rata 22/100 (perlu tulis ulang total).

### Perubahan
- Konten ditulis ulang 100% — tidak ada paragraf dari batch pertama yang dipertahankan
- Setiap founder mendapat suara tulisan yang berbeda
- Struktur bervariasi (refleksi, opini, esai, panduan praktis, catatan komunitas, visi produk)
- Cover image dari Unsplash dengan lisensi legal ditambahkan ke setiap artikel
- Frasa AI generik dihilangkan
- Contoh konkret ditambahkan ke setiap artikel

### Hasil Audit
| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Skor rata-rata | 22 | 93 |
| Artikel siap terbit (≥86) | 0 | 25 |
| Artikel perlu polish (71-85) | 0 | 5 |
| Artikel perlu revisi besar (41-70) | 0 | 0 |
| Artikel perlu tulis ulang (0-40) | 30 | 0 |
| Rata-rata Washadi | 19 | 94 |
| Rata-rata Alexander | 26 | 98 |
| Rata-rata Dominikus | 21 | 88 |
| Artikel dengan cover image | 0 | 30 |

### Standar Editorial Founder

**Washadi**: Reflektif, hangat, dekat dengan guru dan komunitas. Buka dengan suasana komunitas, pengalaman membaca, atau percakapan MGMP. Gaya puitis ringan. Tidak teknis atau promosi.

**Alexander Suryanta**: Pedagogis, praktis, berbasis pengalaman kelas. Buka dengan masalah nyata di kelas. Contoh aplikatif dari pengalaman mengajar. Tidak bertele-tele.

**Dominikus Wahyu**: Visioner, membumi, suara pendiri. Buka dengan problem guru modern. Fokus pada produk sebagai alat, bukan solusi ajaib. Tidak hard selling.

### Standar Anti-Pengulangan
1. Tidak ada paragraf yang sama persis dalam satu artikel
2. Tidak ada paragraf terlalu mirip antar artikel
3. Setiap artikel punya pembuka berbeda
4. Setiap artikel punya kesimpulan/CTA berbeda
5. Tidak ada frasa AI generik berulang
6. Variasi struktur artikel

### Standar Gambar dan Lisensi
1. Gambar dari Unsplash, Pexels, Pixabay, atau aset internal
2. Credit wajib disimpan di field coverImageCredit
3. Source URL wajib disimpan
4. License wajib disimpan (e.g. "Unsplash License")
5. Alt text Bahasa Indonesia wajib diisi
6. Gambar harus relevan dengan isi artikel

### Timeline
- 24 Mei – 30 Juni 2026: 30 artikel diterbitkan (10 per founder)
- 30 Juni 2026: Quality rewrite batch 2 selesai
