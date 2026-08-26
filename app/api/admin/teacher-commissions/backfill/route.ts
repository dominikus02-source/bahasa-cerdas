import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { backfillTeacherCommissions } from "@/lib/commission/backfill";
import { auditCommission } from "@/lib/commission/audit";

/**
 * POST /api/admin/teacher-commissions/backfill
 * Backfill komisi dari transaksi settled (founder-only).
 *
 * body: { execute: false }  — default DRY RUN (laporan tanpa tulis apa pun)
 * body: { execute: true }   — eksekusi idempotent (aman diulang)
 *
 * §19: report eligible / skipped / alreadyExists / invalidAttribution /
 *      preLaunch / excludedTeacher / invalidPayment. TIDAK pernah insert
 *      membabi buta — respect launch date, eligibleFrom, attribution,
 *      status SUCCESS, ADMIN exclusion, first-valid-wins.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const execute = body.execute === true;

    const report = await backfillTeacherCommissions({ dryRun: !execute });

    await auditCommission({
      actorUserId: admin.id,
      action: execute ? "COMMISSION_BACKFILL_EXECUTE" : "COMMISSION_BACKFILL_DRYRUN",
      reason: execute
        ? `Backfill: ${report.eligible} komisi dibuat (${report.alreadyExists} sudah ada)`
        : `Dry-run: ${report.eligible} eligible dari ${report.totalScanned} kandidat`,
      metadata: {
        dryRun: report.dryRun,
        totalScanned: report.totalScanned,
        eligible: report.eligible,
        alreadyExists: report.alreadyExists,
        preLaunch: report.preLaunch,
        excludedTeacher: report.excludedTeacher,
        invalidPayment: report.invalidPayment,
        invalidAttribution: report.invalidAttribution,
        skipped: report.skipped,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/backfill error:", error);
    return NextResponse.json({ error: "Gagal menjalankan backfill" }, { status: 500 });
  }
}
