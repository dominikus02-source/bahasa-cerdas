# BahasaCerdas Android — Play Preflight Status

**Tanggal:** 7 November 2026  
**Branch:** `chore/android-play-preflight-20261107`  
**PR:** #245 (draft)  
**Base:** `feat/mobile-flutter-shell-20261106`

## Hasil Pemeriksaan

| Pemeriksaan | Status | Catatan |
|-------------|--------|---------|
| Firebase Core + Messaging + Crashlytics di `main.dart` | PASS | Optional init, tidak block startup |
| Google Services + Crashlytics Gradle plugins | PASS | Ditambahkan di PR #245 |
| `google-services.json` di-commit? | PASS (tidak ada) | Sekarang di-ignore di `.gitignore` |
| Keystore / `key.properties` di-commit? | PASS (tidak ada) | Sudah di-ignore |
| Release signing pakai keystore produksi | PASS (kode) | Build release akan FAIL jika `key.properties` tidak ada |
| WebView navigation policy | PASS | Hanya HTTPS `*.bahasacerdas.com`, test keamanan ada |
| Flutter analyze + test (laporan lokal) | PASS | 10/10 |
| Build APK debug | PASS (laporan) | |
| Build AAB release | PASS (lokal, 7 Nov 2026) | 42,608,996 byte, keystore produksi lokal; belum diunggah ke Play Console |
| Build APK release | PASS (lokal, 7 Nov 2026) | 47,556,414 byte; signature v2 diverifikasi |
| Signing AAB/APK | PASS (lokal) | Fingerprint sertifikat SHA-256 sama pada AAB dan APK; jangan commit key/material signing |
| Testing perangkat nyata | HOLD | Belum |
| Sinkron dengan `main` | REVIEW | PR base masih feature branch |

## Blocker Tersisa

1. **Keystore dan `key.properties` sudah tersedia secara lokal** dan berhasil digunakan untuk build AAB/APK release. Jangan pernah mengunggahnya ke GitHub. Cadangkan keystore dan password secara aman di luar repository.
2. Testing di perangkat Android nyata belum dilakukan, termasuk login/RBAC, navigasi WebView, upload/download, push FCM, dan Crashlytics.
3. Identitas DN sertifikat menunjukkan karakter backspace hasil input terminal; tinjau identitas dan kebijakan sertifikat **sebelum** keystore pertama kali didaftarkan ke Google Play. Jangan mengganti signing key tanpa prosedur yang aman.
4. PR #245 masih draft dan base-nya `feat/mobile-flutter-shell-20261106` (bukan `main`). Perlu review sinkronisasi.
5. Akun Google Play Developer belum tersedia (di luar scope kode).
6. `kotlin.incremental=false` dipakai sebagai workaround build **lokal**, belum masuk commit; evaluasi penyebab cache lintas drive C:/F: sebelum mengubah konfigurasi bersama.

## Langkah Berikutnya (lokal)

Lihat `SIGNING.md` dan `RELEASE_CHECKLIST.md` (sudah di main).

**Jangan merge ke main sebelum:**
- Keystore siap dan release build berhasil diuji.
- PR di-rebase/sinkron dengan main jika perlu.
- Semua checklist Play Store (Data Safety, Privacy Policy, Delete Account) siap.

Tidak ada secret yang di-commit pada pemeriksaan ini.


## Audit lanjutan 7 November 2026 — signing, perangkat, dan integrasi

- **Sertifikat release AAB lama — HOLD untuk upload pertama:** hasil `keytool -printcert -jarfile` menunjukkan karakter literal backspace `\\b` pada field CN/OU/O/ST. Walaupun signature AAB/APK berhasil diverifikasi, gunakan kandidat keystore dengan DN bersih **sebelum** pendaftaran pertama di Play Console. Jangan mengganti keystore yang sudah didaftarkan tanpa prosedur resmi.
- **Kandidat keystore pengganti:** skrip lokal interaktif `C:\keys\create-clean-bahasacerdas-keystore.ps1` sudah disiapkan dan jendela PowerShell sudah diminta untuk dibuka. Output kandidat `C:\keys\bahasacerdas-release-clean.jks`. Password dimasukkan langsung oleh pengelola dan tidak masuk Git. **Pada pemeriksaan terakhir kandidat belum tersedia**, sehingga APK/AAB saat ini masih memakai keystore lama. Jangan mengganti `key.properties` sampai kandidat dibuat dan diverifikasi.
- **Testing perangkat nyata — HOLD:** `adb devices -l` hanya menampilkan header, tanpa serial perangkat. Sambungkan ponsel Android melalui USB, aktifkan Developer Options / USB debugging, terima RSA debugging prompt, lalu ulangi `adb devices -l`. Pasang APK release hanya setelah signing final.
- **Checklist uji nyata:** login/logout dan semua RBAC; WebView HTTPS domain `*.bahasacerdas.com`, blokir URL tidak tepercaya; halaman utama serta Jumpa kamera/mikrofon dengan consent; pilih/upload file dan download; izin notifikasi Android 13+; kirim pesan FCM dari Firebase Console pada perangkat uji; verifikasi laporan Crashlytics secara terkendali pada build nonpublik; rotasi layar dan background/foreground; navigasi kembali tidak otomatis logout.
- **Integrasi branch — REVIEW, belum rebase:** `origin/main` SHA `a3e731f7`, branch base PR `origin/feat/mobile-flutter-shell-20261106` SHA `71505853`, branch PR SHA `204302e8`. Dibanding `main`, branch PR memiliki 43 commit unik dan `main` 13 commit unik. Versi Android Gradle berbeda (Groovy di main, Kotlin DSL di feature). Jangan rebase/force-push PR secara membabi buta; gunakan branch integrasi terpisah, review migrasi Gradle, kemudian lint/test/build sebelum mengubah target PR.
- **Workaround Kotlin di PC saja:** `mobile/android/gradle.properties` memiliki perubahan lokal `kotlin.incremental=false` untuk mengatasi error cache cross-drive. Belum dipush agar konfigurasi CI tim tidak berubah tanpa review.
- **Kebijakan tetap:** `key.properties`, `*.jks`, `*.keystore`, `google-services.json`, AAB, APK, dan password hanya lokal. Tidak merge ke main, tidak deploy produksi, tidak publish Play Store.


## FINAL Signing Bersih — hasil lokal 7 November 2026 (menggantikan audit DN sebelumnya)

- **Keystore baru valid (PASS):** kandidat `C:\keys\bahasacerdas-release-clean.jks` telah dibuat dan diverifikasi menggunakan password yang dimasukkan langsung di PC. `key.properties` lokal sudah mengarah ke kandidat bersih. Keystore lama tetap disimpan dan **tidak boleh digunakan** untuk rilis pertama.
- **DN sertifikat baru (PASS):** `CN=Bahasa Cerdas, OU=IT, O=Bahasa Cerdas, L=Tangerang Selatan, ST=Banten, C=ID` (tanpa karakter backspace). Owner dan Issuer cocok.
- **Fingerprint SHA-256 sertifikat baru (PUBLIK):** `1AA9F86EB9B284C625ABC48D3293E28C02AC471172BF8CA2D87D7C5036B4C263`; fingerprint AAB dan APK **identik**.
- **AAB release terbaru PASS:** `mobile/build/app/outputs/bundle/release/app-release.aab` ukuran tepat **42,608,969 byte**, SHA-256 artefak `8A9C4ED6EFEB4DED2CB416A91E10A6515F34D8C449D2AEDE8EF30BB228B7C1C4`.
- **APK release terbaru PASS:** `mobile/build/app/outputs/flutter-apk/app-release.apk` ukuran tepat **47,556,414 byte**, SHA-256 artefak `640707C4EF98ECCC3AA18077C0798328AB00E3FAB8F13F7570A2A95106B9B779`; verifikasi Android APK Signature Scheme v2 PASS.
- **Jangan unggah file dari build lama:** AAB/APK sebelumnya memakai fingerprint sertifikat `CE5CA2...` yang DN-nya salah. Keystore final yang akan dipakai untuk rilis pertama adalah **clean** dengan fingerprint `1AA9F86...`. Catat dan backup keystore/password ini dengan aman; jangan dipush ke GitHub.
- **Masih HOLD publikasi:** perangkat ADB belum terdeteksi sehingga E2E nyata belum dilakukan; integrasi ke `main` belum di-review/merge; akun Play Console dan pemeriksaan Data Safety/Privacy Policy/Delete Account masih perlu dituntaskan. AAB/APK saat ini siap untuk verifikasi internal, **belum** untuk publikasi publik.


## Update 7 November 2026 — ADB, Play Console, dan integrasi (PR #245)

- **Perangkat fisik masih HOLD:** `adb` versi 37.0.0 merespons, restart daemon berhasil, tetapi `adb devices -l` tidak menunjukkan serial; `flutter devices` hanya menemukan Windows dan Chrome. Belum ada install ataupun E2E Android fisik. Petunjuk koneksi USB dan matriks uji lengkap tersedia di `mobile/DEVICE_E2E_CHECKLIST.md`.
- **Integrasi ke main belum dimulai (sesuai prioritas):** dibanding `main`, branch PR memiliki 45 commit unik dan `main` 13 commit unik pada audit ini. `main` memakai Gradle Groovy, branch PR memakai Kotlin DSL. Rencana worktree/branch integrasi terpisah, review perbedaan Gradle dan CI terdapat di `mobile/PLAY_INTEGRATION_PLAN.md`; **jangan rebase/force-push PR #245** sampai E2E fisik PASS.
- **Target SDK APK sudah PASS kebijakan:** `aapt dump badging` menunjukkan `package=com.bahasacerdas.app`, `versionCode=1`, `versionName=1.0.0`, `minSdk=24`, **`targetSdk=36`**.
- **Privacy Policy publik PASS keterjangkauan:** `https://www.bahasacerdas.com/kebijakan-privasi` memberi HTTP 200 dan memuat kebijakan Android, Firebase, retensi dan deletion. Keakuratan Data Safety masih perlu review terhadap perilaku aplikasi.
- **Delete Account URL — FAIL/HOLD:** `https://www.bahasacerdas.com/hapus-akun` dari PC mengarah (redirect) ke `https://www.bahasacerdas.com/login` dan berakhir HTTP 200 **di halaman login**, bukan pada halaman permintaan penghapusan publik. Perbaiki middleware/route agar endpoint publik dan alur verifikasi aman sesuai kebijakan Google Play. Jangan tandai siap sebelum dites.
- **Play Console masih HOLD:** formulir Data Safety, account deletion, content rating, target audience, App access/test credentials, listing assets, dan konfigurasi Play App Signing belum dilakukan. Akun developer belum tersedia. Untuk akun pribadi baru pasca 13 Nov 2023, wajib pertimbangkan closed testing 12 tester/14 hari.
- **Keamanan tetap PASS:** keystore bersih, `key.properties`, `google-services.json`, APK/AAB, dan password tidak masuk Git; backup terenkripsi keystore bersih perlu dibuat terpisah.
