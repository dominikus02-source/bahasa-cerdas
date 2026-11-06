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
| Build AAB release | HOLD | Butuh keystore lokal + `key.properties` |
| Testing perangkat nyata | HOLD | Belum |
| Sinkron dengan `main` | REVIEW | PR base masih feature branch |

## Blocker Tersisa

1. **Keystore produksi** belum dibuat di mesin lokal (`C:\keys\bahasacerdas-release.jks`).
2. File `mobile/android/key.properties` belum ada (lokal only).
3. Testing di perangkat Android nyata belum dilakukan.
4. PR #245 masih draft dan base-nya `feat/mobile-flutter-shell-20261106` (bukan `main`). Perlu review sinkronisasi.
5. Akun Google Play Developer belum tersedia (di luar scope kode).

## Langkah Berikutnya (lokal)

Lihat `SIGNING.md` dan `RELEASE_CHECKLIST.md` (sudah di main).

**Jangan merge ke main sebelum:**
- Keystore siap dan release build berhasil diuji.
- PR di-rebase/sinkron dengan main jika perlu.
- Semua checklist Play Store (Data Safety, Privacy Policy, Delete Account) siap.

Tidak ada secret yang di-commit pada pemeriksaan ini.
