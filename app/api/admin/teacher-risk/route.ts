import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/teacher-risk
 * Antrean review risk (founder-only, P8C §11/§21).
 * Hanya yang diperlukan operasional — tanpa exposure finansial publik.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    const [openCases, signalsToday, restrictedCount, clearedCount, heldWithdrawals] =
      await Promise.all([
        db.teacherRiskCase.findMany({
          where: { status: { in: ["REVIEW", "RESTRICTED"] } },
          orderBy: { openedAt: "asc" },
          include: {
            teacher: { select: { id: true, fullName: true, email: true } },
            _count: { select: { signals: true, actions: true } },
          },
        }),
        db.teacherRiskSignal.count({ where: { detectedAt: { gte: today } } }),
        db.teacherRiskCase.count({ where: { status: "RESTRICTED" } }),
        db.teacherRiskCase.count({ where: { status: "CLEARED" } }),
        // Withdrawal ditahan review: PENDING tanpa payout + guru punya case aktif.
        db.teacherCommissionWithdrawal.count({
          where: {
            status: "PENDING",
            payout: null,
            teacher: {
              riskCases: { some: { status: { in: ["REVIEW", "RESTRICTED"] } } },
            },
          },
        }),
      ]);

    const severityOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

    return NextResponse.json({
      cases: openCases.map((c) => ({
        id: c.id,
        teacherId: c.teacherId,
        teacherName: c.teacher.fullName,
        teacherEmail: c.teacher.email,
        status: c.status,
        severity: c.severity,
        reason: c.reason,
        openedAt: c.openedAt,
        signalCount: c._count.signals,
        actionCount: c._count.actions,
      })),
      metrics: {
        signalsToday,
        openCases: openCases.length,
        bySeverity: {
          LOW: openCases.filter((c) => severityOrder[c.severity] === 0).length,
          MEDIUM: openCases.filter((c) => severityOrder[c.severity] === 1).length,
          HIGH: openCases.filter((c) => severityOrder[c.severity] === 2).length,
          CRITICAL: openCases.filter((c) => severityOrder[c.severity] === 3).length,
        },
        restrictedTeachers: restrictedCount,
        withdrawalsHeldForReview: heldWithdrawals,
        falsePositiveClears: clearedCount,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-risk error:", error);
    return NextResponse.json({ error: "Gagal memuat antrean risk" }, { status: 500 });
  }
}
