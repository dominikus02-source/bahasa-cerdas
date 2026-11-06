# BahasaCerdas — Store Compliance Guide (Professional)

## 1. Google Play — Data Safety Form

### Data yang dikumpulkan
| Jenis Data | Dikumpulkan | Dibagikan | Wajib | Tujuan |
|------------|-------------|-----------|-------|--------|
| Nama | Ya | Tidak | Ya | Akun & personalisasi |
| Email | Ya | Tidak | Ya | Akun, login, komunikasi |
| Foto profil (Google) | Ya | Tidak | Tidak | Profil |
| Nama sekolah | Ya | Tidak | Tidak | Konteks pendidikan |
| Data penggunaan (analytics) | Ya | Tidak | Tidak | Perbaikan produk |
| Crash logs (Crashlytics) | Ya | Tidak | Tidak | Stabilitas aplikasi |
| Device info | Ya | Tidak | Tidak | Kompatibilitas |
| FCM Token | Ya | Tidak | Tidak | Push notification |

### Deklarasi yang harus diisi
- **Data collected**: Personal info (Name, Email), App activity, Device or other IDs
- **Data shared**: None
- **Security practices**: Data is encrypted in transit
- **Data deletion**: Users can request deletion (link: https://www.bahasacerdas.com/hapus-akun)
- **Firebase services used**:
  - Firebase Cloud Messaging (FCM) → push notifications
  - Firebase Crashlytics → crash reporting

### Privacy Policy URL
`https://www.bahasacerdas.com/kebijakan-privasi`

---

## 2. App Store — Privacy Nutrition Label

### Data Linked to You
- Contact Info (Name, Email)
- Identifiers (User ID)
- Usage Data
- Diagnostics (Crash Data)

### Data Not Linked to You
- Tidak ada (semua data terhubung ke akun)

### Tracking
- No tracking (tidak ada IDFA / cross-app tracking)

### Privacy Policy URL
`https://www.bahasacerdas.com/kebijakan-privasi`

---

## 3. UU PDP (Indonesia) — Komdigi
- Dasar hukum: UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi
- Hak subjek data sudah dicakup (akses, perbaiki, hapus, tarik persetujuan)
- Kontak privasi: privasi@bahasacerdas.com (disarankan)
- Retensi data: selama akun aktif + 30 hari setelah permintaan hapus

---

## 4. Halaman Hapus Akun
Jika belum ada, buat halaman sederhana di website:
- URL: `/hapus-akun`
- Isi: form email + alasan, atau instruksi "masuk ke pengaturan akun → hapus akun"
- Pastikan bisa diakses tanpa login (syarat Google Play)

---

**Terakhir diperbarui:** 6 November 2026  
**Status:** Siap digunakan untuk mengisi Play Console & App Store Connect
