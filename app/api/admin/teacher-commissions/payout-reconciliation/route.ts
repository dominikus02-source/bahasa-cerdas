import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  detectPayoutAnomalies,
  reconcilePendingTeacherPayouts,
} from "@/lib/commission/payout/orchestrator";
import { auditCommission } from "@/lib/commission/audit";

/**
 * GET /api/admin/teacher-commissions/payout-reconciliation
 * Laporan rekonsiliasi finansial harian (spec §19) — founder-only, read-only.
 * Anomali DILAPORKAN + diaudit, tidak pernah di-repair diam-diam.
 * ?run=true → juga menjalankan rekonsiliasi payout terbuka.
 */
export async function GET(req: Request) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const run = searchParams.get("run") === "true";

    const [anomalies, reconciliation] = await Promise.all([
      detectPayoutAnomalies(),
      run ? reconcilePendingTeacherPayouts() : Promise.resolve(null),
    ]);

    if (anomalies.count > 0) {
      await auditCommission({
        actorUserId: admin.id,
        action: "PAYOUT_RECONCILIATION",
        reason: `Admin report: ${anomalies.count} anomali payout terdeteksi`,
        metadata: { anomalies: anomalies.issues.slice(0, 50) },
      });
    }

    return NextResponse.json({
      anomalies: anomalies.issues,
      anomalyCount: anomalies.count,
      reconciliation,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/payout-reconciliation error:", error);
    return NextResponse.json({ error: "Gagal menjalankan rekonsiliasi" }, { status: 500 });
  }
}
