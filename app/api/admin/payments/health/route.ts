import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const [
      pendingCount,
      successToday,
      failedToday,
      expiredToday,
      pendingOlder30Min,
      recentFailures,
    ] = await Promise.all([
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: "PENDING" } }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: "SUCCESS", createdAt: { gte: todayStart } } }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: { in: ["FAILED"] }, createdAt: { gte: todayStart } } }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: { in: ["CANCELLED", "EXPIRED"] }, createdAt: { gte: todayStart } } }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: "PENDING", createdAt: { lt: thirtyMinAgo } } }),
      db.transaksi.findMany({
        where: { type: "PREMIUM_UPGRADE", status: { in: ["FAILED", "CANCELLED", "EXPIRED"] }, createdAt: { gte: todayStart } },
        select: { id: true, orderId: true, amount: true, status: true, createdAt: true, user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Payment-success without premium
    const premiumMismatch = await db.transaksi.count({
      where: {
        type: "PREMIUM_UPGRADE",
        status: "SUCCESS",
        user: {
          OR: [
            { isPremium: false },
            { premiumUntil: null },
            { premiumUntil: { lt: now } },
          ],
        },
      },
    });

    // Premium without proper ledger
    const proUsers = await db.user.findMany({
      where: { isPremium: true, premiumUntil: { gt: now } },
      select: { id: true },
      take: 50,
    });

    const period = now.toISOString().slice(0, 7);
    let ledgerMismatch = 0;

    if (proUsers.length > 0) {
      const ledgers = await db.aiCreditLedger.findMany({
        where: {
          userId: { in: proUsers.map((u) => u.id) },
          period,
          plan: "GURU_PRO",
        },
        select: { userId: true, creditsTotal: true },
      });

      const ledgerMap = new Map(ledgers.map((l) => [l.userId, l.creditsTotal]));
      for (const u of proUsers) {
        const total = ledgerMap.get(u.id);
        if (!total || total < 500) ledgerMismatch++;
      }
    }

    return NextResponse.json({
      pendingCount,
      pendingOlder30Min,
      successToday,
      failedToday,
      expiredToday,
      paymentWithoutPremium: premiumMismatch,
      premiumWithoutLedger: ledgerMismatch,
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        orderId: f.orderId,
        amount: f.amount,
        status: f.status,
        createdAt: f.createdAt,
        userName: f.user?.fullName,
        userEmail: f.user?.email,
      })),
    });
  } catch (error) {
    console.error("[Payment Health] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
