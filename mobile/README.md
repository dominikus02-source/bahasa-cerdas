# BahasaCerdas Mobile

Flutter WebView shell untuk BahasaCerdas.  
Semua **functionality, CRUD, database, dan RBAC** dihandle oleh website + backend yang sudah ada.

## Prinsip Arsitektur

| Lapisan | Penanggung Jawab | Keterangan |
|---------|------------------|------------|
| **UI & Logic** | Website (Next.js) | Semua halaman, form, CRUD |
| **Database** | Prisma + PostgreSQL | Source of truth |
| **RBAC** | `lib/auth/roles.ts` | Role: MURID, GURU, ADMIN, UMUM |
| **App Mobile** | Flutter WebView | Shell native + offline handling + splash |

## Role → Dashboard (sinkron dengan web)

- `MURID` → `/murid/beranda`
- `GURU` → `/guru/beranda`
- `ADMIN` → `/admin`
- `UMUM` → `/umum`
- Tidak dikenal → `/auth/akses-ditolak`

## Setup (Windows + Android Studio)

```bash
cd mobile
flutter pub get
flutter run
```
