# BahasaCerdas

Platform edukasi Bahasa Indonesia berbasis AI untuk guru dan murid: latihan menulis harian, portofolio karya, kelas digital, gamifikasi, arena kuis realtime, serta modul UKBI/TKA sebagai fitur pendukung.

Produksi: <a href="https://www.bahasacerdas.com" target="_blank" rel="noopener noreferrer">www.bahasacerdas.com</a> · Health check: <a href="https://www.bahasacerdas.com/api/health" target="_blank" rel="noopener noreferrer">/api/health</a>

## Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Web | Next.js 16.2.6 (App Router), React 18.3.1, TypeScript 5.6 (strict), Tailwind CSS 3.4 |
| Data | PostgreSQL (Supabase) via Prisma 5.22 — skema di `prisma/schema.prisma` (154 model) |
| Auth & Storage | Supabase Auth + Supabase Storage (`@supabase/ssr`) |
| Cache & Rate limit | Upstash Redis (`@upstash/redis`); opsional, tanpa Redis rate limit dimatikan |
| Pembayaran | Midtrans (`midtrans-client`); payout guru via Xendit (opsional, di balik gate) |
| AI | Gateway multi-provider di `lib/ai-gateway` (Groq, DeepSeek, Gemini) |
| Realtime | Socket.IO game server di `game-server/` (Kuis Tempur) |
| Runtime | Node.js 22 pada image produksi, Node.js 20 pada CI; npm + `package-lock.json` |

Skala kode saat ini: 374 route handler API, 159 halaman di `app/(dashboard)`, 669 file di `scripts/` (649 di antaranya TypeScript), 324 dokumen di `docs/`, dan 154 model di `prisma/schema.prisma`.

## Struktur Repositori

| Path | Isi |
|------|-----|
| `app/` | App Router: halaman publik, `app/(auth)`, `app/(dashboard)` (admin/guru/murid), dan `app/api` (route handler) |
| `components/` | Komponen React per domain (ui, guru, murid, admin, arena, gamification, dll.) |
| `lib/` | Logika bisnis dan akses data: `auth`, `db`, `redis`, `rate-limit`, `ai-gateway`, `payments`, `question-bank`, `assessment`, `learning-loop`, `commission`, dll. |
| `src/` | Modul AI (`src/ai`), RPG (`src/game/rpg`), Main Bersama, dan worker agent (`src/agent/worker`) |
| `game-server/` | Server Socket.IO terpisah untuk arena realtime; punya `package.json`, Dockerfile, dan `fly.toml` sendiri |
| `prisma/` | Skema, migrasi, dan seed data |
| `scripts/` | Script operasional dan test berbasis `tsx` (seed, audit, validasi, regresi) |
| `tests/load/` | Skenario load test k6 |
| `ops/vps/` | Deployment VPS: `docker-compose.yml`, Caddyfile, `deploy.sh`, `prepare-runtime-envs.sh`, cron |
| `twa/` | Konfigurasi Android TWA untuk APK Arena |
| `docs/` | Dokumen arsitektur, audit, dan status pekerjaan |
| `middleware.ts` | CSP dengan nonce per-request, rate limit `/api/ai/*`, sesi Supabase |

## Peran dan Hak Akses (RBAC)

Otorisasi berlapis: Supabase membuktikan **siapa** yang memanggil, dan baris `User` di database menentukan **boleh apa**. Peran tidak pernah diambil dari body request, query string, atau cookie buatan klien.

### Peran dan flag

`enum Role` di `prisma/schema.prisma` hanya punya tiga nilai. `User.role` default `MURID`, dan `User.isFounder` adalah flag terpisah dengan default `false`.

| Peran / flag | Dasbor utama | Cakupan |
|--------------|--------------|---------|
| `MURID` | `/murid/*` | Latihan, portofolio, kelas, arena, gamifikasi |
| `GURU` | `/guru/*` | Kelas, materi, penilaian, komisi guru, dan boleh membuka shell murid sebagai pratinjau |
| `ADMIN` | `/admin/*` | Panel admin operasional (pengguna, AI quota, materi, storage) |
| `isFounder = true` | `/guru/beranda` (default) | Lintas peran: dianggap admin di semua gerbang, tapi tetap punya identitas guru |

**Founder adalah flag, bukan peran.** Migrasi `prisma/migrations/manual/2026-09-01_founder_role_separation.sql` memindahkan tiga akun founder dari `ADMIN` ke `GURU` dengan `isFounder = true` dipertahankan; `ADMIN` yang tersisa adalah admin operasional. Konsekuensi yang mudah menjebak: **cek `role === "ADMIN"` saja akan menolak founder**. Gerbang yang benar adalah `user.isFounder || user.role === "ADMIN"`.

Dua efek samping yang perlu diketahui: founder dikecualikan dari komisi guru (`lib/commission/config.ts`), dan `dashboardForUser()` di `lib/auth/redirect.ts` mengarahkan founder ke `/guru/beranda`, bukan `/admin`.

### Helper otorisasi — `lib/supabase/server.ts`

| Fungsi | Perilaku |
|--------|----------|
| `getUser()` | Mengembalikan identitas + baris `User` (role, isFounder, onboarded, premium), atau `null`. Dibungkus `cache()` agar satu request hanya sekali menyentuh auth dan database |
| `requireAuth()` | Melempar `Unauthorized` bila belum login |
| `requireRole(...roles)` | Melempar `Forbidden` bila `user.role` tidak ada di daftar |
| `requireFounder()` | Lolos bila `isFounder` atau `role === "ADMIN"` |
| `unauthorizedResponse()` / `forbiddenResponse()` | Helper respons JSON untuk status 401 dan 403 |

`getUser()` memakai `supabase.auth.getClaims()` — verifikasi JWT secara lokal lewat JWKS, bukan panggilan jaringan ke Supabase Auth — lalu membaca ulang baris `User` dari database. Karena wewenang selalu dibaca segar, perubahan peran berlaku pada request berikutnya tanpa menunggu token kedaluwarsa. Fungsi ini **bukan** `getUser()` milik Supabase; jangan tertukar.

### Penjaga per segmen halaman

| Segmen | Aturan di layout | Bila gagal |
|--------|------------------|------------|
| `app/(dashboard)/admin` | `role === "ADMIN" \|\| isFounder` | `redirect("/login")` |
| `app/(dashboard)/guru` | `role === "GURU" \|\| isFounder`, lalu wajib `onboarded` | `/murid/beranda`, atau `/guru/onboarding` |
| `app/(dashboard)/murid` | `MURID`, `GURU`, atau founder | `/guru/beranda` |

`/guru/onboarding` sengaja melewati guard layout karena mengurus bootstrap auth-nya sendiri (alasannya ada sebagai komentar di `app/(dashboard)/guru/layout.tsx`).

**`middleware.ts` tidak memeriksa peran.** Isinya hanya refresh sesi Supabase, CSP nonce per-request, dan rate limit `/api/ai/*`. Jadi otorisasi harus ada di layout, route handler, atau server action — jangan pernah mengandalkan middleware sebagai satu-satunya gerbang.

### Penjaga route API

Dari 374 route handler di `app/api`, 117 menyebut `isFounder`. `app/api/admin` berisi 61 route; 59 di antaranya memakai `getUser()` + `isFounder` sebagai gerbang, dan 7 juga menerima `role === "ADMIN"`. Pola yang dominan:

```ts
const user = await getUser();
if (!user || !user.isFounder) {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}
```

Baru 3 route memakai helper `requireFounder()` (`app/api/admin/configure-storage`, `app/api/debug`, `app/api/debug/midtrans`). Untuk kode baru, pakai helper-nya: ia memetakan penolakan ke `unauthorizedResponse()`/`forbiddenResponse()` sehingga 401 dan 403 konsisten.

### Gerbang lain

- **Endpoint cron** (`app/api/cron/*`) memakai header `Authorization: Bearer $CRON_SECRET`. Kalau `CRON_SECRET` kosong, pemeriksaan itu dilewati dan endpoint menjadi terbuka — di produksi variabel ini wajib diisi.
- **Agent control** (`src/agent/control/auth.ts`): `authorizeFounder()` mengembalikan `{ ok: false, reason: "UNAUTHENTICATED" | "NOT_FOUNDER" }`; identitas selalu dari sesi, tidak pernah dari body request.
- **Halaman/API guru**: `isTeacherOrStudent()` di `lib/teacher/students.ts` menerima `GURU`, `ADMIN`, dan founder.
- **Storage**: kebijakan RLS bucket diterapkan manual lewat `scripts/apply-storage-rls.ts` dan `scripts/fix-storage-rls.sql`. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di server, tidak pernah di komponen klien.
- **Game server**: memakai `KUIS_TEMPUR_SERVER_SECRET` dan signing key, terpisah dari sesi web (lihat `game-server/.env.example`).

### Aturan saat menambah fitur

1. Ambil identitas hanya lewat `getUser()` dari `lib/supabase/server.ts`; jangan `decode` JWT sendiri dan jangan menerima `userId`/`role` dari klien.
2. Gerbang admin: `user.isFounder || user.role === "ADMIN"`. Gerbang guru: `requireRole("GURU")` atau `isTeacherOrStudent()`.
3. Batasi query per pemilik (`where: { userId: user.id }`), bukan berdasarkan id yang dikirim klien.
4. Bedakan 401 (belum login) dan 403 (login tapi tidak berhak) — jangan mengembalikan 200 dengan data kosong.

## Prasyarat

- Node.js 20 atau 22 dan npm (repo memakai `package-lock.json`; tidak ada lockfile pnpm/yarn)
- Database PostgreSQL (Supabase) yang bisa diakses dari mesin lokal
- Docker (opsional, hanya untuk build image produksi)
- k6 (opsional, hanya untuk load test)

## Setup Lokal

```bash
npm ci
npx prisma generate
npx prisma migrate deploy   # atau: npx prisma db push (lingkungan dev)
npm run dev                 # http://localhost:3000
```

Build produksi:

```bash
npm run build
npm start
```

`npm run build` menjalankan `prisma generate` lalu `next build`, dengan output `standalone` (dipakai image Docker). Beberapa halaman membaca environment saat build, jadi isi `.env.local` lebih dulu.

## Environment Variables

`.gitignore` mengabaikan seluruh pola `.env*` (termasuk `.env.example`), dan saat ini **belum ada template env di root**. Variabel berikut diambil dari pemakaian aktual di `app/`, `lib/`, `src/`, serta `ops/vps/prepare-runtime-envs.sh`.

Wajib:

| Variabel | Keterangan |
|----------|------------|
| `DATABASE_URL` | Koneksi PostgreSQL. Untuk Supabase cloud gunakan pooler port 6543 |
| `DIRECT_URL` | Koneksi langsung port 5432, dipakai Prisma untuk migrasi |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` juga diterima) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, hanya untuk server |
| `NEXT_PUBLIC_SITE_URL` | Origin publik, misal `https://www.bahasacerdas.com` |

Fitur opsional (fitur terkait nonaktif atau mengembalikan error bila nilainya kosong):

| Variabel | Keterangan |
|----------|------------|
| `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | Pembayaran premium |
| `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` | Provider AI di `lib/ai-gateway` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Cache dan rate limit (`KV_REST_API_URL`/`KV_REST_API_TOKEN` juga diterima) |
| `CRON_SECRET` | Autentikasi endpoint `app/api/cron/*` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push notification |
| `RESEND_API_KEY` | Email transaksional |
| `XENDIT_API_KEY`, `XENDIT_WEBHOOK_TOKEN`, `PAYOUT_*` | Payout komisi guru (di balik gate pilot) |

Game server memakai variabel sendiri — lihat `game-server/.env.example` (`GAME_PORT`, `GAME_ALLOWED_ORIGINS`, `BAHASACERDAS_WEB_URL`, `KUIS_TEMPUR_SERVER_SECRET`, `GAME_SERVER_SIGNING_PUBLIC_KEY_B64`, `DATABASE_URL`, `GAME_DB_REQUIRED`).

Jangan pernah commit nilai secret. Di VPS, konfigurasi runtime disimpan di `/opt/bahasacerdas/config/` (`stack.env`, `web.env`, dengan `chmod 600`) dan diturunkan menjadi `game.env`, `worker.env`, `cron.env` oleh `ops/vps/prepare-runtime-envs.sh`.

## Perintah yang Sering Dipakai

```bash
npm run dev            # next dev
npm run build          # prisma generate + next build
npm start              # next start
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run typecheck:scripts

npm run db:generate    # prisma generate
npm run db:push        # prisma db push (dev)
npm run db:migrate     # prisma migrate deploy
npm run db:studio      # prisma studio
```

Seed data memakai script terpisah, misalnya:

```bash
npm run db:seed-kompetensi
npm run db:seed-game
npm run db:seed-mgmp
npm run seed:homepage:dry-run     # tambahkan tanpa ":dry-run" untuk eksekusi
npm run seed:premium-plans:dry-run
```

Script yang mengubah data produksi umumnya punya pasangan `:dry-run` dan `--execute`. Jalankan versi dry-run lebih dulu.

## Testing

Repo ini tidak memakai Jest/Vitest. Test adalah script `tsx` di `scripts/` yang dijalankan lewat npm script, contoh:

```bash
npm run test:login-ux
npm run test:login-unified
npm run test:bank-soal-leakage
npm run test:ukbi-tka-runtime
npm run test:bc-classroom-e2e-integrity
```

Daftar lengkap: `npm run` lalu cari prefix `test:`, `audit:`, dan `validate:`. Sebagian script butuh `DATABASE_URL` aktif karena melakukan verifikasi terhadap database.

Load test memerlukan k6:

```bash
npm run load:public-browsing
npm run test:load:ukbi-100
```

## CI dan Deployment

- `.github/workflows/ci.yml` berjalan pada setiap push dan pull request: `npm ci`, `prisma generate`, `typecheck`, beberapa regression gate (login UX/routing, diagnostic baseline V2, TTS eligibility), `lint`, `build`, build `game-server`, lalu build image `Dockerfile.web` + `Dockerfile.cron` dan validasi `ops/vps/docker-compose.yml`.
- `.github/workflows/deploy-production.yml` berjalan setelah CI sukses di branch `main` (atau manual `workflow_dispatch`): SSH ke VPS, `git pull --ff-only`, lalu `ops/vps/deploy.sh` yang mem-build image web, menyalakan Redis + web, dan menunggu `/api/health` melaporkan `status=ok` dan `db=up`.
- Stack VPS (`ops/vps/docker-compose.yml`) terdiri dari service `redis`, `web`, `game`, `agent`, `cron` (profil `scheduler`, diaktifkan dengan `ENABLE_CRON=1`), dan `caddy` sebagai reverse proxy/TLS.
- `Dockerfile.worker` membangun image worker agent (`src/agent/worker/run.ts`); `Dockerfile.cron` hanya berisi `crond` + `curl` dengan zona waktu `Asia/Jakarta`.
- `vercel.json` masih dipertahankan untuk redirect (`bahasacerdas.com` → `www`, `/arena-junior` → `/junior`). Catatan: `redirects`/`headers` di `vercel.json` menimpa konfigurasi setara di `next.config.ts`.

## Konvensi Kontribusi

Aturan kerja agen dan konvensi kode ada di [`AGENTS.md`](AGENTS.md) (`CLAUDE.md` hanya me-refer ke file itu). Ringkasnya:

- TypeScript strict, hindari `any`; komponen fungsional dan Server Components bila memungkinkan
- Logika bisnis di `lib/`, route handler di `app/api`, mutasi lewat Server Actions bila cocok
- Setiap halaman besar punya loading state dan error boundary
- Mobile-first dan konsisten dengan tema per peran (guru emerald, murid violet)
- Format commit: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- Sebelum push: `npm run typecheck` dan `npm run lint` harus bersih
- Setiap route/halaman baru wajib punya gerbang otorisasi eksplisit (lihat [Peran dan Hak Akses](#peran-dan-hak-akses-rbac)); jangan mengandalkan `middleware.ts`

## Dokumentasi

- [`docs/BAHASACERDAS_WORK_STATUS.md`](docs/BAHASACERDAS_WORK_STATUS.md) — ledger status pekerjaan
- [`docs/BAHASACERDAS_EXAM_ENGINE_ARCHITECTURE.md`](docs/BAHASACERDAS_EXAM_ENGINE_ARCHITECTURE.md) — arsitektur mesin ujian UKBI/TKA
- [`docs/BAHASACERDAS_RANDOMIZED_EXAM_ENGINE.md`](docs/BAHASACERDAS_RANDOMIZED_EXAM_ENGINE.md) — randomisasi & snapshot ujian
- [`docs/BAHASACERDAS_SEED_DATA_POLICY.md`](docs/BAHASACERDAS_SEED_DATA_POLICY.md) — kebijakan seed data
- [`docs/BAHASACERDAS_BACKUP_AND_RESTORE_POLICY.md`](docs/BAHASACERDAS_BACKUP_AND_RESTORE_POLICY.md) — backup & restore
- [`docs/FOUNDER_IDENTITY_ROLE_AUDIT_SEPTEMBER_2026.md`](docs/FOUNDER_IDENTITY_ROLE_AUDIT_SEPTEMBER_2026.md) — audit identitas & peran founder
- [`docs/FOUNDER_ROLE_MIGRATION_FINAL_REPORT_SEPTEMBER_2026.md`](docs/FOUNDER_ROLE_MIGRATION_FINAL_REPORT_SEPTEMBER_2026.md) — laporan pemisahan peran founder
- [`ops/supabase-selfhost/README.md`](ops/supabase-selfhost/README.md) — prosedur shadow database
- [`tests/load/README.md`](tests/load/README.md) — load test k6

Direktori `docs/` berisi 324 dokumen audit dan arsitektur; mulai dari `BAHASACERDAS_WORK_STATUS.md` untuk gambaran terkini.
