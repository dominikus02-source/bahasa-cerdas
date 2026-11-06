# App Signing (Release)

**PENTING:** Keystore dan password adalah rahasia. Jangan pernah commit file `.jks`, `key.properties`, atau password ke Git.

## 1. Buat Keystore Produksi (sekali saja di PC Windows)

Buka PowerShell dan jalankan:

```powershell
New-Item -ItemType Directory -Force C:\keys

keytool -genkeypair -v `
  -keystore C:\keys\bahasacerdas-release.jks `
  -storetype PKCS12 `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias bahasacerdas
```

- Password akan diminta secara interaktif. Catat dengan aman.
- Simpan file `bahasacerdas-release.jks` di luar repository (contoh: `C:\keys\`).

## 2. Buat file `android/key.properties` (jangan commit)

Buat file di `mobile/android/key.properties` dengan isi:

```properties
storePassword=PASSWORD_ANDA
keyPassword=PASSWORD_ANDA
keyAlias=bahasacerdas
storeFile=C:/keys/bahasacerdas-release.jks
```

Ganti `PASSWORD_ANDA` dengan password yang kamu masukkan saat membuat keystore.

## 3. Build AAB untuk Google Play (dan APK opsional)

```powershell
cd mobile
flutter pub get
flutter build appbundle --release
flutter build apk --release   # opsional
```

Output:
- AAB: `build/app/outputs/bundle/release/app-release.aab`
- APK: `build/app/outputs/flutter-apk/app-release.apk`

## 4. Sebelum Upload ke Play Console

- [ ] Verifikasi signing AAB
- [ ] Test di perangkat Android nyata
- [ ] Data Safety form sudah diisi
- [ ] Privacy Policy: https://www.bahasacerdas.com/kebijakan-privasi
- [ ] Delete Account URL: https://www.bahasacerdas.com/hapus-akun

Lihat juga `DEPLOY_AND_COMPLIANCE.md` untuk detail Play Store.
