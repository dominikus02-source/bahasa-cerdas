-- ============================================================================
-- BahasaCerdas — Perbaikan Temuan Supabase Advisor (Juli 2026)
-- Jalankan via: Supabase Dashboard → SQL Editor → paste seluruh file → Run
--
-- Aman untuk aplikasi karena (hasil audit kode):
--   • SEMUA akses data memakai Prisma server-side (role postgres = pemilik
--     tabel → tidak terpengaruh RLS; kita tidak memakai FORCE RLS).
--   • Tidak ada satu pun akses tabel via supabase-js .from() (PostgREST) —
--     hanya auth, storage, dan satu subscription realtime "Notifikasi".
--   • Tidak ada pemakaian supabase.rpc() dari client.
-- Skrip idempoten — aman dijalankan lebih dari sekali.
-- ============================================================================

-- ─── 0. VERIFIKASI AWAL (opsional, lihat hasilnya dulu) ─────────────────────
-- Pastikan kolom tableowner = 'postgres' (pemilik = role koneksi Prisma):
select tablename, tableowner, rowsecurity
from pg_tables where schemaname = 'public'
order by rowsecurity, tablename;

-- ─── 1. AKTIFKAN RLS DI SEMUA TABEL PUBLIC YANG BELUM ──────────────────────
-- Menutup akses baca/tulis lewat REST API publik (anon key) ke seluruh tabel
-- aplikasi. Tanpa policy = deny-all untuk anon/authenticated. Prisma (owner)
-- dan service_role tetap bebas.
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    raise notice 'RLS diaktifkan: %', r.tablename;
  end loop;
end $$;

-- ─── 2. POLICY UNTUK LONCENG NOTIFIKASI (realtime) ─────────────────────────
-- Satu-satunya konsumen non-Prisma: NotificationBell subscribe postgres_changes
-- pada "Notifikasi". Helper SECURITY DEFINER memetakan auth.uid() → User.id
-- (kolom userId berisi id Prisma, bukan uuid Supabase).
create or replace function public.current_app_user_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select id from public."User" where "supabaseId" = auth.uid()::text
$$;

revoke execute on function public.current_app_user_id() from public, anon;
grant execute on function public.current_app_user_id() to authenticated;

drop policy if exists "notifikasi_select_own" on public."Notifikasi";
create policy "notifikasi_select_own"
on public."Notifikasi"
for select
to authenticated
using ("userId" = public.current_app_user_id());

-- ─── 3. PIN search_path SEMUA FUNGSI PUBLIC (non-extension) ────────────────
-- Menutup temuan "Function Search Path Mutable" (mis. handle_new_user,
-- update_updated_at_column) tanpa menyentuh fungsi milik extension.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid not in (select objid from pg_depend where deptype = 'e')
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c
        where c like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public', r.sig);
    raise notice 'search_path dipin: %', r.sig;
  end loop;
end $$;

-- ─── 4. CABUT EXECUTE FUNGSI SECURITY DEFINER DARI ROLE PUBLIK ─────────────
-- Menutup temuan "Public/Signed-in Users Can Execute SECURITY DEFINER
-- Function". Aplikasi tidak memakai supabase.rpc(), jadi aman.
-- current_app_user_id dikecualikan (dibutuhkan policy realtime, hanya
-- authenticated).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.oid not in (select objid from pg_depend where deptype = 'e')
      and p.proname <> 'current_app_user_id'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    raise notice 'execute dicabut: %', r.sig;
  end loop;
end $$;

-- ─── 5. VERIFIKASI AKHIR ────────────────────────────────────────────────────
-- (a) Tidak boleh ada lagi tabel public tanpa RLS:
select count(*) as tabel_tanpa_rls
from pg_tables where schemaname = 'public' and rowsecurity = false;

-- (b) Review manual policy longgar (temuan "RLS Policy Always True") —
--     kalau qual = 'true' pada tabel sensitif, pertimbangkan drop policy itu:
select tablename, policyname, cmd, roles::text, qual
from pg_policies
where schemaname = 'public' and (qual = 'true' or with_check = 'true')
order by tablename;

-- ============================================================================
-- CATATAN — dua temuan yang TIDAK bisa diperbaiki lewat SQL (setelan dashboard):
-- 1. "Leaked Password Protection Disabled"
--    → Dashboard → Authentication → Providers/Passwords → aktifkan
--      "Leaked password protection".
-- 2. "Public Bucket Allows Listing"
--    → Dashboard → Storage → bucket publik → nonaktifkan listing publik /
--      jadikan private + signed URL bila file tidak memang untuk umum.
-- Temuan WARN "Auth RLS Initialization Plan" (performa auth.uid() per baris)
-- hanya menyangkut policy tabel legacy snake_case (profiles, lesson_plans,
-- questions, community_posts) yang tidak dipakai aplikasi — opsional.
-- ============================================================================
