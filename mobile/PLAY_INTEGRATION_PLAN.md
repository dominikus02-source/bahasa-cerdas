# BahasaCerdas Android — integrasi aman dan checklist Play Console

Diperiksa 7 November 2026. **Jangan merge, rebase/force-push PR #245, atau deploy tanpa E2E perangkat nyata PASS.** PR #245 masih berbasis `feat/mobile-flutter-shell-20261106`.

## Rencana integrasi pasca-E2E
1. Backup worktree saat ini. Jangan ubah checkout `F:\\bahasa-cerdas` yang berisi pekerjaan lain. Simpan keystore hanya di `C:\\keys`, di luar Git.
2. Setelah testing fisik PASS, buat **worktree integrasi baru** dari remote `main`:
```powershell
cd F:\\bahasa-cerdas-android-build
git fetch origin
git worktree add -b integration/android-play-from-main-20261107 F:\\bahasa-cerdas-android-integration origin/main
```
3. Audit delta dengan `git diff --name-status origin/main...origin/chore/android-play-preflight-20261107 -- mobile`, `git log --left-right --cherry-pick --oneline origin/main...origin/chore/android-play-preflight-20261107`.
4. Pilih mekanisme integrasi yang mempertahankan commit fitur tanpa memindahkan branch PR utama: `git merge --no-ff origin/chore/android-play-preflight-20261107` pada **branch integrasi saja**, lalu review setiap konflik dengan konteks. Bila lebih aman, port perubahan terpilih ke branch integrasi dengan cherry-pick terkontrol; **jangan** menjalankan rebase atau force-push PR #245 sekarang.
5. **Perbedaan utama:** `main` memakai `mobile/android/app/build.gradle` (Groovy) sedangkan branch Flutter feature memakai `mobile/android/app/build.gradle.kts` (Kotlin DSL). Putuskan **satu** sumber konfigurasi Gradle; jangan pertahankan kedua file app build bersamaan. Cocokkan plugin Google Services/Crashlytics, Firebase, applicationId, min/target/compile SDK, versionCode/versionName, release signing guard, buildTypes, proguard, permissions dan `settings.gradle(.kts)`.
6. Jalankan `flutter pub get`, `flutter analyze`, `flutter test`, dan `flutter build appbundle --release` dalam **worktree terisolasi** dengan signing lokal baru yang sengaja disediakan tanpa commit; jalankan Android security/navigation tests. Jangan memakai shared production VPS.
7. Lakukan PR khusus dari branch integrasi ke `main` hanya setelah semua CI+QA PASS; review manusia sebelum merge dan buat rollback plan. PR #245 tetap draft sampai dependensi resolved.

**Hasil audit awal:** `main` SHA `a3e731f7`, feature PR saat audit `174afb59`. Divergensi awal 13 commit unik di `main`, 45 di branch PR. Konfirmasi ulang SHA sebelum integrasi.

## Checklist Play Console (belum membuat akun)
- [ ] **Target API:** APK release terkini `com.bahasacerdas.app`, `versionCode=1`, `versionName=1.0.0`, `minSdk=24`, `targetSdk=36`; target API 36 sesuai persyaratan aplikasi baru Google Play mulai 31 Agustus 2026 (Google Play Help).
- [ ] **Privacy Policy:** URL `https://www.bahasacerdas.com/kebijakan-privasi` terjangkau publik dan menyebut Android, FCM, Crashlytics, informasi akun, pihak ketiga, serta retensi. Audit kesesuaian praktik kode dan kebijakan sebelum menandai final.
- [x] **Delete Account (kode):** URL `https://www.bahasacerdas.com/hapus-akun` sekarang di-whitelist sebagai public path + halaman informasi publik dibuat (commit f71f33a / 83adbf0). **Belum di-deploy.** Verifikasi setelah deploy: harus HTTP 200 tanpa redirect ke login. Tindakan penghapusan aktual tetap memerlukan login + verifikasi.
- [ ] **Data Safety:** inventaris data yang benar-benar dikumpulkan/dibagikan untuk login, RBAC, FCM device token, Crashlytics device/crash diagnostics, sekolah, upload, analytics, WebView, Google Sign-In dan penyedia hosting; verifikasi encryption in transit, deletion, optional/required, dan third-party sharing berdasarkan implementasi aktual.
- [ ] **Content rating:** jawab kuesioner IARC/Play Console berdasarkan konten dan interaksi nyata (konten pengguna, komunikasi, akses murid, konten pembelajaran); jangan tebak rating.
- [ ] **Target audience / Families:** definisikan rentang usia dan peran murid; tinjau kebijakan anak jika menyasar di bawah 13 tahun, jangan hanya menggunakan klaim Privacy Policy tanpa memeriksa perilaku aplikasi.
- [ ] **App access:** siapkan akun penguji nonproduksi untuk setiap alur yang login/RBAC; jangan sertakan password asli dalam GitHub. Isi kredensial uji melalui formulir aman Play Console.
- [ ] **Store listing:** nama, deskripsi singkat & lengkap Bahasa Indonesia, app icon, feature graphic, screenshot ponsel/tablet sesuai ketentuan, kategori Education, email dukungan, website dan URL kebijakan privasi.
- [ ] **App signing:** simpan backup offline terenkripsi `C:\\keys\\bahasacerdas-release-clean.jks` dan password secara terpisah; fingerprint SHA-256 sertifikat `1AA9F86EB9B284C625ABC48D3293E28C02AC471172BF8CA2D87D7C5036B4C263`. Tentukan strategi Play App Signing/upload key saat membuka Play Console. Jangan pernah commit file signing.
- [ ] **Testing track:** akun pribadi baru yang dibuat setelah 13 November 2023 memerlukan minimal 12 penguji ikut serta terus-menerus selama 14 hari pada closed testing sebelum mengajukan akses produksi; berlaku jika memakai akun pribadi yang memenuhi kondisi tersebut.
- [ ] **Monetisasi/deklarasi:** tentukan ads, paid content, in-app purchases, permissions dan deklarasi terkait hanya berdasarkan fitur aktual.

Referensi Google:
- https://developer.android.com/tools/adb
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/14151465
