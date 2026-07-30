-- Arena Junior — akun murid TK–SD (pendaftaran oleh guru, masuk dengan PIN).
--
-- Jalankan di: Supabase SQL Editor (PRODUCTION dulu, lalu STAGING).
-- Idempoten: aman dijalankan ulang.
--
-- Kenapa tabel terpisah, bukan kolom di User:
-- Yang disimpan di sini khusus alur masuk anak — email sintetis untuk Supabase
-- Auth (anak tidak pernah melihatnya) dan penghitung PIN salah. Penghitung itu
-- WAJIB ada di database, bukan Redis: limiter berbasis Redis di repo ini mati
-- kalau env UPSTASH_*/KV_* tidak diset, dan kalau itu terjadi PIN 4 angka
-- (10.000 kemungkinan) jadi tanpa pengaman sama sekali.

CREATE TABLE IF NOT EXISTS "ArenaJuniorAkun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailSintetis" TEXT NOT NULL,
    "gagalPin" INTEGER NOT NULL DEFAULT 0,
    "terkunciSampai" TIMESTAMP(3),
    "terakhirMasuk" TIMESTAMP(3),
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaJuniorAkun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArenaJuniorAkun_userId_key" ON "ArenaJuniorAkun"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaJuniorAkun_emailSintetis_key" ON "ArenaJuniorAkun"("emailSintetis");
CREATE INDEX IF NOT EXISTS "ArenaJuniorAkun_dibuatOlehId_idx" ON "ArenaJuniorAkun"("dibuatOlehId");

DO $$ BEGIN
  ALTER TABLE "ArenaJuniorAkun"
    ADD CONSTRAINT "ArenaJuniorAkun_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArenaJuniorAkun"
    ADD CONSTRAINT "ArenaJuniorAkun_dibuatOlehId_fkey"
    FOREIGN KEY ("dibuatOlehId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS: schema `public` diekspos PostgREST lewat anon key, jadi tabel baru wajib
-- diaktifkan RLS-nya (tanpa policy = deny-all untuk anon/authenticated).
-- Aplikasi memakai Prisma dengan role `postgres` (BYPASSRLS), jadi tidak terpengaruh.
-- Lihat 2026-07-17_enable_rls_public.sql.
ALTER TABLE "ArenaJuniorAkun" ENABLE ROW LEVEL SECURITY;

-- Verifikasi (opsional): harus 1 baris, rowsecurity = true.
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'ArenaJuniorAkun';
