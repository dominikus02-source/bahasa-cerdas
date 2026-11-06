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
