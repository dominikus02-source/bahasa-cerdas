# BahasaCerdas — Compliance Checklist (Google Play, App Store, UU PDP)

## Status
Kebijakan Privasi dan Syarat & Ketentuan sudah tersedia di website:
- Privacy: https://www.bahasacerdas.com/kebijakan-privasi
- Terms: https://www.bahasacerdas.com/syarat-ketentuan

## Yang sudah dicakup
- [x] Data yang dikumpulkan (nama, email, Google Sign-In, data sekolah)
- [x] Cara penggunaan data
- [x] Tidak menjual data
- [x] Keamanan (HTTPS)
- [x] Hak pengguna (akses, perbaiki, hapus)
- [x] Penghapusan akun (dalam 30 hari)
- [x] Usia minimal 13 tahun / izin orang tua
- [x] Link Privacy & Terms di drawer app

## Rekomendasi tambahan untuk lolos store & UU PDP
1. **Data Deletion URL** (wajib Google Play)
   - Tambahkan halaman atau form penghapusan akun yang bisa diakses tanpa login
   - Contoh: https://www.bahasacerdas.com/hapus-akun

2. **Anak di bawah 13 tahun**
   - Jika ada pengguna di bawah 13, wajib ada persetujuan orang tua (COPPA-like + UU PDP)
   - Rekomendasi: batasi registrasi minimal 13 tahun, atau wajib verifikasi orang tua

3. **Firebase / Analytics**
   - Pastikan deklarasi data collection di Google Play Console (Data Safety form)
   - Crashlytics & FCM sudah ada — deklarasikan di form

4. **App Store (iOS)**
   - Privacy Nutrition Label harus diisi sesuai data yang dikumpulkan
   - Link Privacy Policy di App Store Connect

5. **UU PDP (Indonesia)**
   - Sudah cukup untuk dasar
   - Tambahkan kontak DPO / email khusus perlindungan data jika memungkinkan

## Langkah berikutnya di app
- Pastikan drawer selalu menampilkan link Privacy & Terms (sudah ada)
- Setelah login, user bisa akses pengaturan untuk hapus akun (sudah ada di website)
- Siapkan Data Safety form di Play Console sebelum submit

**Terakhir diperbarui:** 6 November 2026
