# BahasaCerdas Mobile — Release Checklist

**Status saat ini (7 Nov 2026):**
- Firebase project `bahasacerdas-e18d6` + package `com.bahasacerdas.app` : OK
- `google-services.json` lokal : OK (jangan commit)
- Flutter analyze + test : PASS
- Keystore produksi : BELUM (HOLD AAB)

## Langkah yang harus dilakukan di PC lokal

1. **Buat keystore** (lihat `SIGNING.md`)
   - Lokasi rekomendasi: `C:\keys\bahasacerdas-release.jks`
   - Alias: `bahasacerdas`

2. **Buat `android/key.properties`** (jangan commit)
   ```properties
   storePassword=PASSWORD_ANDA
   keyPassword=PASSWORD_ANDA
   keyAlias=bahasacerdas
   storeFile=C:/keys/bahasacerdas-release.jks
   ```

3. **Build release**
   ```powershell
   cd mobile
   flutter pub get
   flutter build appbundle --release
   ```

4. **Verifikasi & testing**
   - Cek signature AAB
   - Install & test di perangkat Android nyata
   - Pastikan WebView, login, FCM, Crashlytics berjalan

5. **Play Console**
   - Upload `app-release.aab`
   - Isi Data Safety (lihat `DEPLOY_AND_COMPLIANCE.md`)
   - Privacy Policy URL: https://www.bahasacerdas.com/kebijakan-privasi
   - Delete Account URL: https://www.bahasacerdas.com/hapus-akun

## File yang TIDAK BOLEH di-commit
- `google-services.json`
- `key.properties`
- `*.jks` / `*.keystore`
- File password atau secret apapun

## Prompt untuk ChatGPT (copy-paste)

Setelah dokumen ini di-pull, kirim prompt berikut ke ChatGPT:

```
Saya sedang menyiapkan rilis produksi Android BahasaCerdas (Flutter WebView shell).

Repo: https://github.com/dominikus02-source/bahasa-cerdas
Folder: mobile/

Baca file berikut di repo:
- mobile/SIGNING.md
- mobile/RELEASE_CHECKLIST.md
- mobile/DEPLOY_AND_COMPLIANCE.md

Tugas:
1. Pastikan saya sudah punya keystore di C:\keys\bahasacerdas-release.jks dan file mobile/android/key.properties.
2. Jika belum, berikan perintah PowerShell exact untuk membuatnya (interaktif, jangan hardcode password).
3. Setelah siap, berikan perintah build:
   cd mobile
   flutter pub get
   flutter build appbundle --release
4. Beritahu lokasi output AAB dan cara verifikasi signing sederhana.
5. Ingatkan checklist sebelum upload ke Play Console.

Jangan pernah sarankan commit secret. Semua signing harus di mesin lokal.
```
