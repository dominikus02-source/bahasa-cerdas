-- Account deletion removes the Supabase Auth user. public.contributions.reviewed_by
-- referenced auth.users(id) with NO ACTION, so deleting a user who ever reviewed a
-- contribution would fail. Keep the contribution and clear the reviewer instead.
-- Legacy table outside the Prisma schema: guarded so fresh/CI databases are no-ops.
DO $$
BEGIN
  IF to_regclass('public.contributions') IS NOT NULL
     AND to_regclass('auth.users') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'contributions' AND column_name = 'reviewed_by'
     ) THEN
    ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_reviewed_by_fkey;
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
