/**
 * Apply Storage RLS policies for documents bucket using Prisma.
 * Prisma connects directly to PostgreSQL (bypasses Supabase RLS).
 *
 * Usage:
 *   npx tsx scripts/apply-storage-rls.ts
 */

import { db } from "../lib/db";

async function main() {
  console.log("Applying Storage RLS policies...\n");

  const policies = [
    {
      name: "Users can upload to documents",
      sql: `CREATE POLICY "Users can upload to documents"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'documents');`,
    },
    {
      name: "Users can read documents",
      sql: `CREATE POLICY "Users can read documents"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'documents');`,
    },
    {
      name: "Users can delete own documents",
      sql: `CREATE POLICY "Users can delete own documents"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'documents'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );`,
    },
  ];

  // First ensure RLS is enabled on storage.objects
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`
    );
    console.log("  ✅ RLS enabled on storage.objects");
  } catch (e: any) {
    if (e.message?.includes("already")) {
      console.log("  ✓ RLS already enabled on storage.objects");
    } else {
      console.log("  ⚠️ Could not enable RLS:", e.message?.substring(0, 100));
    }
  }

  for (const policy of policies) {
    try {
      // Check if policy already exists
      const existing = await db.$queryRawUnsafe<
        { policyname: string }[]
      >(
        `SELECT policyname FROM pg_policies
         WHERE tablename = 'objects'
         AND schemaname = 'storage'
         AND policyname = $1`,
        policy.name
      );

      if (existing.length > 0) {
        console.log(`  ✓ Already exists: ${policy.name}`);
        continue;
      }

      await db.$executeRawUnsafe(policy.sql);
      console.log(`  ✅ ${policy.name}`);
    } catch (e: any) {
      console.error(`  ❌ ${policy.name}: ${e.message?.substring(0, 150)}`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
