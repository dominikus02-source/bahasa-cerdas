# BahasaCerdas — Deploy & Compliance Guide

## 1. Langkah Deploy Website (halaman /hapus-akun)

### Jika menggunakan Vercel (rekomendasi):
```bash
# Di PC, dari folder root repo
cd F:\bahasa-cerdas
git pull
# Push sudah dilakukan, Vercel biasanya auto-deploy dari main
# Atau manual:
npx vercel --prod
```

### Cek hasil:
- Buka: https://www.bahasacerdas.com/hapus-akun
- Pastikan halaman tampil tanpa login

### Jika pakai server sendiri:
```bash
git pull
npm install
npm run build
npm start
```

---

## 2. Google Play Data Safety — Penjelasan Lengkap

### Apa yang harus diisi di Play Console

| Pertanyaan | Jawaban |
|------------|---------|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Data deletion URL | `https://www.bahasacerdas.com/hapus-akun` |

### Data yang dikumpulkan (centang yang sesuai)

**Personal info**
- Name → Collected, Not shared, Required
- Email address → Collected, Not shared, Required

**App activity**
- App interactions → Collected, Not shared

**Device or other IDs**
- Device or other IDs → Collected, Not shared (FCM token)

**Diagnostics**
- Crash logs → Collected, Not shared (Crashlytics)

### Firebase yang harus disebutkan
- **Firebase Cloud Messaging (FCM)** → untuk push notification
- **Firebase Crashlytics** → untuk laporan crash

### Privacy Policy URL
`https://www.bahasacerdas.com/kebijakan-privasi`

---

## 3. Kebijakan Privasi — Cakupan Android + Web

Halaman sudah ada di: https://www.bahasacerdas.com/kebijakan-privasi

**Yang sudah dicakup:**
- Data akun (nama, email, Google Sign-In)
- Data sekolah
- Analytics & crash logs
- Tidak menjual data
- Hak pengguna (akses, perbaiki, hapus)
- Penghapusan dalam 30 hari
- Usia 13+

**Yang relevan untuk Android:**
- FCM token (notifikasi)
- Crashlytics (diagnostik)
- Data perangkat

**Yang relevan untuk Web:**
- Cookie & session
- Google Sign-In
- Data penggunaan halaman

---

## 4. Checklist Sebelum Submit

- [ ] Halaman `/hapus-akun` sudah live
- [ ] Privacy Policy URL bisa diakses
- [ ] Data Safety form diisi sesuai tabel di atas
- [ ] APK/AAB di-upload
- [ ] Screenshots & deskripsi siap

---

**Terakhir diperbarui:** 6 November 2026
