-- Harden helper functions used by compliance evidence and notification RLS.
-- Keep SECURITY DEFINER helpers outside exposed schemas while preserving owner-only realtime reads.
-- Supabase-specific auth helpers are guarded so plain PostgreSQL CI can still apply this migration.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON SCHEMA private FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    GRANT USAGE ON SCHEMA private TO authenticated;
  END IF;
END $$;

DO $outer$ BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION private.current_app_user_id()
      RETURNS text
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = pg_catalog, public, auth
      AS $body$
        SELECT u.id
        FROM public."User" u
        WHERE u."supabaseId" = auth.uid()::text
        LIMIT 1
      $body$
    $fn$;

    REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
      REVOKE ALL ON FUNCTION private.current_app_user_id() FROM anon;
    END IF;
    GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated;

    IF to_regclass('public."Notifikasi"') IS NOT NULL THEN
      DROP POLICY IF EXISTS notification_owner_select ON public."Notifikasi";
      CREATE POLICY notification_owner_select
        ON public."Notifikasi"
        FOR SELECT
        TO authenticated
        USING ("userId" = (SELECT private.current_app_user_id()));
    END IF;

    DROP FUNCTION IF EXISTS public.current_app_user_id();
  END IF;
END $outer$;

CREATE OR REPLACE FUNCTION public.compliance_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $body$
BEGIN
  RAISE EXCEPTION 'Compliance evidence is append-only';
END
$body$;

REVOKE ALL ON FUNCTION public.compliance_append_only() FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON FUNCTION public.compliance_append_only() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON FUNCTION public.compliance_append_only() FROM authenticated;
  END IF;
END $$;
