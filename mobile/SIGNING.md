# App Signing (Release)

## Buat Keystore (jalankan sekali di PC)
```bash
keytool -genkey -v -keystore bahasacerdas-release.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 -alias bahasacerdas
```

Simpan file `.jks` di luar repository (jangan commit).

## Buat file `android/key.properties` (jangan commit)
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=bahasacerdas
storeFile=../bahasacerdas-release.jks
```

## Build AAB untuk Play Store
```bash
flutter build appbundle --release
```
