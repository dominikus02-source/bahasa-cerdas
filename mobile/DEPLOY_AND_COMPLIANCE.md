# BahasaCerdas — Panduan Deploy & Compliance (Lengkap)

**Terakhir diperbarui:** 6 November 2026

---

## 1. Langkah Deploy Website (Detail)

### A. Deploy via Vercel (Rekomendasi)

1. Pastikan kode terbaru sudah di GitHub (`main`)
2. Di PC, buka terminal:
   ```bash
   cd F:\bahasa-cerdas
   git pull
   ```
3. Jika belum login Vercel:
   ```bash
   npx vercel login
   ```
4. Deploy ke production:
   ```bash
   npx vercel --prod
   ```
5. Tunggu proses build selesai (biasanya 1–3 menit)
6. Buka URL production dan cek:
   - https://www.bahasacerdas.com/hapus-akun
   - https://www.bahasacerdas.com/kebijakan-privasi

### B. Deploy Manual (Server Sendiri)

1. SSH ke server
2. Masuk ke folder project:
   ```bash
   cd /path/to/bahasa-cerdas
   git pull
   ```
3. Install dependency:
   ```bash
   npm install
   ```
4. Build:
   ```bash
   npm run build
   ```
5. Restart server:
   ```bash
   pm2 restart bahasa-cerdas
   # atau
   npm start
   ```

### C. Verifikasi Setelah Deploy
- [ ] Halaman `/hapus-akun` bisa diakses tanpa login
- [ ] Halaman `/kebijakan-privasi` tampil dengan benar
- [ ] Tidak ada error 404 atau 500

---

## 2. Google Play Data Safety — Penjelasan Detail

### Apa itu Data Safety?
Form wajib di Google Play Console yang menjelaskan data apa yang dikumpulkan aplikasi, untuk apa, dan apakah dibagikan.

### Langkah Mengisi di Play Console
1. Buka Google Play Console
2. Pilih aplikasi BahasaCerdas
3. Menu kiri → **Policy** → **App content**
4. Klik **Data safety**
5. Isi sesuai tabel di bawah

### Tabel Jawaban yang Harus Diisi

| Pertanyaan | Jawaban | Keterangan |
|------------|--------|----------|
| Does your app collect or share any of the required user data types? | **Yes** | Ada data yang dikumpulkan |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Menggunakan HTTPS |
| Do you provide a way for users to request that their data is deleted? | **Yes** | Ada halaman hapus akun |
| Data deletion URL | `https://www.bahasacerdas.com/hapus-akun` | Wajib diisi |

### Jenis Data yang Dicentang

**Personal info**
- Name → Collected, Not shared, Required for app functionality
- Email address → Collected, Not shared, Required for app functionality

**App activity**
- App interactions → Collected, Not shared, Analytics

**Device or other IDs**
- Device or other IDs → Collected, Not shared (FCM token)

**Diagnostics**
- Crash logs → Collected, Not shared (Firebase Crashlytics)

### Firebase yang Harus Disebutkan
- **Firebase Cloud Messaging (FCM)**: untuk mengirim notifikasi push
- **Firebase Crashlytics**: untuk mengumpulkan laporan crash

### Privacy Policy URL
`https://www.bahasacerdas.com/kebijakan-privasi`

---

## 3. FAQ

**Q: Apakah halaman /hapus-akun wajib?**  
A: Ya. Google Play mewajibkan URL penghapusan data yang bisa diakses tanpa login.

**Q: Apakah harus menyebutkan Firebase?**  
A: Ya. FCM dan Crashlytics harus dideklarasikan di Data Safety form.

**Q: Berapa lama data dihapus setelah permintaan?**  
A: Maksimal 30 hari, sesuai yang tertulis di kebijakan privasi.

**Q: Apakah data dijual?**  
A: Tidak. Kebijakan privasi menyatakan data tidak dijual.

**Q: Bagaimana dengan pengguna di bawah 13 tahun?**  
A: Aplikasi ditujukan untuk usia 13+ atau dengan izin orang tua.

**Q: Apakah perlu Privacy Nutrition Label untuk App Store?**  
A: Ya, jika ingin rilis di iOS. Isi sesuai data yang dikumpulkan (Name, Email, Usage, Crash).

---

## 4. Checklist Sebelum Submit ke Google Play

- [ ] Halaman `/hapus-akun` sudah live
- [ ] Halaman `/kebijakan-privasi` sudah live
- [ ] Data Safety form sudah diisi
- [ ] Privacy Policy URL sudah dimasukkan
- [ ] APK/AAB sudah di-upload
- [ ] Screenshots dan deskripsi sudah siap

---

**Dokumen ini dibuat untuk membantu proses rilis BahasaCerdas ke Google Play dan App Store.**
