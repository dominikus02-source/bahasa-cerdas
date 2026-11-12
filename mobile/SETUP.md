# BahasaCerdas Mobile — Setup Checklist

## 1. Package Name
```
com.bahasacerdas.app
```
- Android applicationId
- iOS Bundle ID
- Firebase package name

## 2. Firebase Project (pakai bahasacerdas@gmail.com)
- Project ID: `bahasa-cerdas-app`
- Project Name: `BahasaCerdas`
- Enable:
  - [x] Cloud Messaging (FCM) — gratis
  - [x] Crashlytics — gratis
  - [ ] Analytics (opsional)

## 3. File yang dibutuhkan dari Firebase
Setelah project dibuat, download:
- `google-services.json` → taruh di `mobile/android/app/`
- `GoogleService-Info.plist` → taruh di `mobile/ios/Runner/` (nanti saat ada Mac)

## 4. Perintah di PC (setelah extract)
```bash
cd mobile
flutter pub get
flutter pub run flutter_launcher_icons
flutter pub run flutter_native_splash:create
flutter run
```
