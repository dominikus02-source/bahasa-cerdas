# Scalability & Load Runbook — BahasaCerdas

Konsolidasi hasil audit beban (Juli 2026) + langkah eksekusi. Semua perubahan
**kode** sudah masuk & lolos `npm run build`. Yang tersisa di dokumen ini adalah
langkah yang butuh kredensial (Supabase / Vercel / Fly) — jalankan sesuai urutan.

## Ringkasan perubahan kode (sudah masuk)

| Area | File | Efek |
|------|------|------|
| Pool DB | `lib/db.ts` | Auto-deteksi pooler → `pgbouncer=true`, `connection_limit=5` (env `DB_CONNECTION_LIMIT`), buang `statement_cache_size` |
| Cache pool soal | `app/api/kompetensi/[paketId]/route.ts` + `lib/redis.ts` | Cache TTL paket + pool soal per (paket, seksi) via Upstash → potong ~N+1 query baca DB tiap start simulasi. Pengacakan tetap per-sesi (di memori). **Butuh env Upstash aktif** (di bawah) untuk benar-benar hemat DB |
| Index | `prisma/schema.prisma` | +4 `@@index` (leaderboard, monitoring) |
| Queue AI | `lib/ai-concurrency.ts` + `app/api/ai/agents/run/route.ts` | Cap concurrency global fail-open, `503 AI_BUSY` saat jenuh |
| Load test | `loadtest/*.js` | k6: login, generate RPP, submit simulasi |
| Monitoring | `app/api/admin/monitoring/live/route.ts`, `app/(dashboard)/admin/monitoring/page.tsx` | Dashboard beban real-time (Founder) |
| Game server | `game-server/Dockerfile` | Perbaiki build (prisma generate + devDeps) |

## 1. Index database (staging → prod)

File: `prisma/migrations/manual/2026-07-10_perf_indexes.sql`

1. Buka **Supabase SQL Editor (project STAGING)**.
2. Jalankan tiap statement `CREATE INDEX CONCURRENTLY ...` **satu per satu**
   (CONCURRENTLY tidak boleh dalam transaksi; jangan pakai `prisma migrate`).
3. Verifikasi:
   ```sql
   SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%';
   ```
4. Uji beban (bagian 4) + pantau `/admin/monitoring`. Jika sehat, ulangi di prod.

Rollback (kalau perlu): `DROP INDEX CONCURRENTLY idx_user_role_xp;` dst. Aman —
index add-only, tidak mengubah data.

## 2. Env pooler (Vercel)

Pastikan di Vercel (Production + Preview):
- `DATABASE_URL` → `...pooler.supabase.com:6543/...` (transaction pooler). `lib/db.ts`
  akan otomatis menambah `pgbouncer=true`.
- `DIRECT_URL` → `...:5432/...` (untuk migrasi Prisma saja).
- Opsional: `DB_CONNECTION_LIMIT` (default 5), `AI_MAX_CONCURRENCY` (default 12).

Cek cepat: setelah deploy, di Supabase → Database → Roles/Connections, jumlah
koneksi harus stabil (tidak meledak) saat traffic naik.

## 3. Revive game server (Fly.io — single instance)

```bash
cd apps/web/game-server
fly auth login
fly secrets set DATABASE_URL="postgresql://...:5432/postgres"   # session pooler / direct, BUKAN 6543
fly deploy
```
Lalu set `NEXT_PUBLIC_GAME_SERVER_URL` di Vercel ke domain Fly (mis.
`https://bahasacerdas-game.fly.dev`) dan redeploy web.

> Catatan: server Socket.IO persisten memegang koneksi lama → gunakan **session
> pooler (5432)** atau direct, JANGAN transaction pooler (6543). State room masih
> in-memory → tetap **1 instance** (`min_machines_running=1`) sampai Redis TCP siap.

## 4. Load testing

Lihat `loadtest/README.md`. Ringkas:
```bash
export BASE_URL=https://staging.bahasacerdas.site
export USERS='[{"email":"lt1@bc.test","password":"..."}]'
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" loadtest/01-login.js
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" loadtest/02-generate-rpp.js
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" -e PAKET_ID=... -e ANSWERS='{}' loadtest/03-submit-simulasi.js
```
**Hanya staging.** Script RPP membakar kredit AI; script simulasi menulis data.

Sinyal batas: p95 latency melonjak, error 5xx naik, atau error `P2024`
(connection pool habis) muncul → itu plafon saat ini.

## 4b. Cache pool soal simulasi (Upstash) — WAJIB agar hemat DB

Rute start simulasi (`GET /api/kompetensi/[paketId]`) kini membungkus lookup
paket + pool soal per seksi dengan `cache.getOrSet` (server-side). Efeknya:
1000 user yang start bareng **tidak** lagi masing-masing menembak N query
`findMany` soal — cukup 1 kali per paket per TTL, sisanya dari cache.

**Syarat aktif:** env Upstash harus ada di Vercel (Production + Preview):

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Tanpa env ini, `lib/redis.ts` **tidak error** — `getOrSet` cuma jatuh ke query
DB seperti sebelumnya (tidak ada regresi, tapi juga tidak ada penghematan).

**Tuning (opsional):** `SIM_POOL_TTL` (detik, default `300`). Naikkan (mis. 600)
saat ujian serentak agar cache lebih dingin/hemat; turunkan bila bank soal sering
diedit dan perubahan harus cepat tampil. Kunci cache: `komp:paket:v1:*`,
`komp:pool:v1:*` — hapus manual di Upstash bila perlu invalidasi cepat.

**Keamanan:** yang di-cache **bebas kunci jawaban** (select `UKBI_SELECT`/
`TKA_SELECT` tanpa `correctAnswer`). Snapshot jawaban tetap diambil langsung dari
DB per sesi. Jadi tidak ada answer key yang mendarat di cache eksternal.

**Verifikasi:** setelah env di-set + redeploy, buka satu simulasi 2×; start kedua
harus lebih cepat & (di Supabase → Database) tak menambah query pool soal. Load
test `loadtest/03-submit-simulasi.js` + start berulang → p95 lebih stabil.

## 5. Monitoring

`/admin/monitoring` (Founder). Auto-refresh 8s. Yang dipantau: pengguna aktif
(5/15/60 mnt), request AI/menit, latency rata-rata, error rate, kedalaman antrean
`AIJob`, throughput/menit. Semua read-only dari tabel existing.

## Backlog (butuh Redis TCP — belum diputuskan)

- **BullMQ** worker durable untuk generate AI (retry, survive restart).
- **Socket.IO horizontal**: `@socket.io/redis-adapter` + `ioredis` + pindahkan
  `rooms`/`players` dari memori ke Redis → baru bisa `min_machines_running > 1`.

Keduanya wajib Redis protokol TCP (`rediss://`). `@upstash/redis` (REST) yang
dipakai sekarang tidak bisa untuk ini. Sampai itu ada, concurrency guard fail-open
(bagian queue AI) sudah menahan burst ke provider.
