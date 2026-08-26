import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/teacher-commissions
 * Ringkasan program "Guru Cerdas Sejahtera" untuk admin (founder-only).
 * Tanpa data finansial pihak ketiga — hanya agregat program sendiri.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [walletAgg, commissionAgg, withdrawalAgg, attributionAgg] = await Promise.all([
      db.teacherWallet.aggregate({
        _sum: {
          availableBalance: true,
          pendingBalance: true,
          lockedBalance: true,
          lifetimeEarned: true,
          lifetimeWithdrawn: true,
          totalReversed: true,
        },
        _count: { id: true },
      }),
      db.teacherCommission.aggregate({
        where: { entryType: "COMMISSION" },
        _count: { id: true },
        _sum: { commissionAmount: true, grossAmount: true },
      }),
      db.teacherCommissionWithdrawal.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      }),
      db.teacherAttribution.count({ where: { status: "ACTIVE" } }),
    ]);

    const withdrawalsByStatus: Record<string, { count: number; amount: number }> = {};
    for (const row of withdrawalAgg) {
      withdrawalsByStatus[row.status] = { count: row._count.id, amount: row._sum.amount ?? 0 };
    }

    return NextResponse.json({
      wallets: {
        count: walletAgg._count.id,
        available: walletAgg._sum.availableBalance ?? 0,
        pending: walletAgg._sum.pendingBalance ?? 0,
        locked: walletAgg._sum.lockedBalance ?? 0,
        lifetimeEarned: walletAgg._sum.lifetimeEarned ?? 0,
        lifetimeWithdrawn: walletAgg._sum.lifetimeWithdrawn ?? 0,
        totalReversed: walletAgg._sum.totalReversed ?? 0,
      },
      commissions: {
        count: commissionAgg._count.id,
        totalAmount: commissionAgg._sum.commissionAmount ?? 0,
        totalGross: commissionAgg._sum.grossAmount ?? 0,
      },
      withdrawals: withdrawalsByStatus,
      activeAttributions: attributionAgg,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions error:", error);
    return NextResponse.json({ error: "Gagal memuat ringkasan komisi" }, { status: 500 });
  }
}
