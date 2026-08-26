import { NextRequest, NextResponse } from "next/server";
import { bulkReconcile } from "@/lib/commission/wallet";
import { auditCommission } from "@/lib/commission/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/teacher-commissions-reconcile
 * Rekonsiliasi harian SEMUA dompet guru (§11).
 * Read-only: mismatch dilaporkan + diaudit ke AdminPaymentAuditLog —
 * TIDAK pernah diperbaiki diam-diam. Dijadwalkan via vercel.json (harian 07:00 WIB).
 */
export async function GET(req: NextRequest) {
  const rahasia = process.env.CRON_SECRET;
  if (rahasia) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${rahasia}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await bulkReconcile();

    if (report.mismatched > 0) {
      await auditCommission({
        actorUserId: null,
        action: "COMMISSION_RECONCILIATION",
        reason: `Cron: ${report.mismatched} wallet mismatch (invariant: ${report.invariantViolations})`,
        metadata: { total: report.total, matched: report.matched },
      });
    }

    return NextResponse.json({
      ok: true,
      total: report.total,
      matched: report.matched,
      mismatched: report.mismatched,
      invariantViolations: report.invariantViolations,
    });
  } catch (err) {
    console.error("[cron] teacher-commissions-reconcile gagal:", err);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
