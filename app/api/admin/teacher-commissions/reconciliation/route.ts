import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { bulkReconcile } from "@/lib/commission/wallet";
import { auditCommission } from "@/lib/commission/audit";

/**
 * GET /api/admin/teacher-commissions/reconciliation
 * Laporan rekonsiliasi SEMUA dompet guru (founder-only, read-only).
 *
 * §11: expected dihitung dari financial records (ledger + withdrawal),
 * dibandingkan dengan state tersimpan. Mismatch DILAPORKAN + diaudit —
 * TIDAK pernah diperbaiki diam-diam.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await bulkReconcile();

    if (report.mismatched > 0) {
      await auditCommission({
        actorUserId: admin.id,
        action: "COMMISSION_RECONCILIATION",
        reason: `Mismatch terdeteksi pada ${report.mismatched} wallet (invariant violations: ${report.invariantViolations})`,
        metadata: {
          total: report.total,
          matched: report.matched,
          mismatched: report.mismatched,
          invariantViolations: report.invariantViolations,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/reconciliation error:", error);
    return NextResponse.json({ error: "Gagal menjalankan rekonsiliasi" }, { status: 500 });
  }
}
