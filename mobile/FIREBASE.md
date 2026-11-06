# Firebase Setup — BahasaCerdas Mobile

## Prinsip Arsitektur

| Komponen | Dipakai untuk | Keterangan |
|----------|---------------|----------|
| **PostgreSQL + Prisma** | Source of truth (user, role, data) | Tetap utama |
| **RBAC** | `lib/auth/roles.ts` | Tetap di backend web |
| **Firebase Auth** | ❌ Tidak dipakai | Hindari duplikasi login |
| **Firebase FCM** | Push notification | Gratis, aman |
| **Crashlytics** | Error reporting | Gratis |
| **Firestore / Realtime DB** | ❌ Tidak dipakai | Data tetap di PostgreSQL |

## Langkah Setup (pakai bahasacerdas@gmail.com)

1. Buka https://console.firebase.google.com
2. Buat project baru:
   - Project name: `BahasaCerdas`
   - Project ID: `bahasa-cerdas-app`
3. Tambah app Android:
   - Package name: `com.bahasacerdas.app`
   - App nickname: `BahasaCerdas Android`
4. Download `google-services.json`
5. Taruh file tersebut di:
   ```
   mobile/android/app/google-services.json
   ```
6. Aktifkan:
   - Cloud Messaging
   - Crashlytics

## Keamanan

- Jangan aktifkan Firebase Auth (login tetap lewat website + session)
- Token FCM hanya untuk notifikasi
- Role tetap divalidasi di backend (PostgreSQL)
- Notifikasi dikirim dari backend (bukan dari client)
