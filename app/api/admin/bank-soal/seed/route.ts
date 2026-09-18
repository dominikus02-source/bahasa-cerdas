import { NextResponse } from "next/server";

/**
 * POST /api/admin/bank-soal/seed — DISABLED (fail-closed).
 *
 * This endpoint previously re-imported the LEGACY bank from
 * data/question-bank/master/*.json (50 kebab-case themes, 1,500 rows,
 * kelas 7/8/9/10) as active MASTER_BANK content.
 *
 * Since the Founder replacement (PR #23), the canonical active bank is the
 * Founder library (BC-GB2-*, 45 themes, kelas "SEMUA"). Importing the legacy
 * files would resurrect retired content and create a second source of truth,
 * so the endpoint is permanently closed. Legacy rows live on only as
 * MASTER_BANK_RETIRED for audit/rollback.
 *
 * Content changes go through scripts/import-founder-bank.ts (dry-run default,
 * --execute gated) under human review.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Seeder legacy dinonaktifkan. Bank Soal aktif kini adalah pustaka Founder (BC-GB2-*) yang dikelola lewat scripts/import-founder-bank.ts — bukan dari data/question-bank/master. Baris lama tersimpan sebagai MASTER_BANK_RETIRED untuk audit.",
      code: "SEED_DISABLED",
    },
    { status: 410 }
  );
}
