# BahasaCerdas

Platform edukasi Bahasa Indonesia AI-powered untuk guru dan murid.

## Setup

```bash
cd bahasa-cerdas
pnpm install
npx prisma generate
npx prisma db push
pnpm dev
```

## Struktur

- `app/` — Next.js App Router pages & API routes
- `components/` — React components (UI, shared, role-specific)
- `lib/` — Utilities (db, supabase, premium, midtrans)
- `store/` — Zustand state management
- `hooks/` — Custom React hooks
- `apps/api/` — Socket.IO game server

## Environment Variables

Lihat `.env.example` untuk semua variabel yang dibutuhkan.