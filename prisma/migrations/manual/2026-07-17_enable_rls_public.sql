-- Enable Row Level Security (RLS) on ALL tables in schema `public`.
--
-- Kenapa: Prisma membuat tabel di `public` tanpa RLS. Supabase mengekspos
-- schema `public` lewat PostgREST (anon key publik), jadi tanpa RLS tabel bisa
-- diakses siapa pun via /rest/v1/<Tabel> — bypass aplikasi. Security Advisor
-- Supabase menandai ini CRITICAL ("RLS Disabled in Public").
--
-- Aman untuk BahasaCerdas: aplikasi HANYA memakai Supabase untuk auth & storage
-- (0 pemakaian data API `supabase.from(...)`). Semua data lewat Prisma dengan
-- role `postgres` yang BYPASSRLS, jadi mengaktifkan RLS (tanpa policy = deny-all
-- untuk anon/authenticated) TIDAK memecahkan aplikasi — hanya menutup pintu
-- PostgREST yang tidak dipakai.
--
-- Idempotent: ENABLE RLS pada tabel yang sudah RLS = no-op. Aman dijalankan ulang.
-- Jalankan di: Supabase SQL Editor (PRODUCTION dulu, lalu STAGING).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- Verifikasi (opsional): tabel public yang MASIH tanpa RLS harus 0 baris.
--   SELECT tablename FROM pg_tables t
--   JOIN pg_class c ON c.relname = t.tablename
--   WHERE t.schemaname = 'public' AND c.relrowsecurity = false;
