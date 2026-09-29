import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// ════════════════════════════════════════════════════════════════════
// PAYMENT HEALTH — Detect entitlement mismatches
//
// Catches bugs like the "Dzaky incident": user paid successfully but
// premium entitlement was never activated (webhook failed, race condition,
// etc.).
//
// Detection patterns:
//   1. SUCCESS payment but User.isPremium=false (or premiumUntil expired)
//   2. SUCCESS payment but premiumUntil < payment date (entitlement expired
//      before it should have)
//   3. Multiple SUCCESS payments with no active premium (compounding bug)
//
// Founder-only. Returns affected users with transaction details.
// ════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // ── Pattern 1: SUCCESS payment whose purchased entitlement window
    // should still be active, but the user entitlement does not cover it.
    //
    // Do NOT flag historical payments that legitimately expired. This avoids
    // false positives such as an August monthly payment being shown as a
    // September entitlement incident.
    const premiumTransactions = await db.transaksi.findMany({
      where: {
        type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
        status: "SUCCESS",
        user: { isFounder: false },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        reference: true,
        orderId: true,
        midtransId: true,
        metadata: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isPremium: true,
            premiumUntil: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const expectedEnd = (t: (typeof premiumTransactions)[number]) => {
      const meta = (t.metadata || {}) as Record<string, unknown>;
      const durationDays =
        typeof meta.durationDays === "number"
          ? meta.durationDays
          : t.reference?.includes("YEARLY")
            ? 365
            : 30;
      return new Date(t.createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    };

    const affectedTransactions = premiumTransactions.filter((t) => {
      const shouldBeActiveUntil = expectedEnd(t);
      if (shouldBeActiveUntil <= now) return false;
      if (!t.user.isPremium || !t.user.premiumUntil) return true;
      return t.user.premiumUntil < shouldBeActiveUntil;
    });

    const affectedMap = new Map<string, {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isPremium: boolean;
      premiumUntil: Date | null;
      createdAt: Date;
      transaksi: typeof affectedTransactions;
    }>();

    for (const tx of affectedTransactions) {
      const existing = affectedMap.get(tx.userId);
      if (existing) {
        existing.transaksi.push(tx);
      } else {
        affectedMap.set(tx.userId, {
          id: tx.user.id,
          fullName: tx.user.fullName,
          email: tx.user.email,
          role: tx.user.role,
          isPremium: tx.user.isPremium,
          premiumUntil: tx.user.premiumUntil,
          createdAt: tx.user.createdAt,
          transaksi: [tx],
        });
      }
    }

    const mismatchedUsers = Array.from(affectedMap.values());

    // ── Pattern 2: Active premium but premiumUntil is suspiciously short ──
    // (e.g., <7 days from now when they just paid — possible partial activation)
    const shortExpiryUsers = await db.user.findMany({
      where: {
        isFounder: false,
        isPremium: true,
        premiumUntil: { gt: now },
        transaksi: {
          some: {
            type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
            status: "SUCCESS",
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        transaksi: {
          where: {
            type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
            status: "SUCCESS",
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            amount: true,
            reference: true,
            createdAt: true,
          },
        },
      },
    });

    // Filter short expiry: premiumUntil within 7 days AND last payment was monthly/yearly
    const suspiciouslyShort = shortExpiryUsers.filter((u) => {
      if (!u.premiumUntil) return false;
      const daysUntilExpiry = Math.ceil((u.premiumUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const lastTx = u.transaksi[0];
      if (!lastTx) return false;
      const isYearly = lastTx.reference?.includes("YEARLY");
      // Monthly should expire in 28-35 days, yearly in 350-370 days
      if (isYearly && daysUntilExpiry < 30) return true;
      if (!isYearly && daysUntilExpiry < 5) return true;
      return false;
    });

    // ── Summary ──
    const totalAffected = mismatchedUsers.length;
    const totalRevenueAtRisk = mismatchedUsers.reduce(
      (sum, u) => sum + u.transaksi.reduce((s, t) => s + (t.amount || 0), 0),
      0,
    );
    const affectedByRole = {
      murid: mismatchedUsers.filter((u) => u.role === "MURID").length,
      guru: mismatchedUsers.filter((u) => u.role === "GURU").length,
    };

    return NextResponse.json({
      summary: {
        totalAffected,
        totalRevenueAtRisk,
        affectedByRole,
        suspiciouslyShortExpiry: suspiciouslyShort.length,
      },
      affectedUsers: mismatchedUsers.map((u) => ({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isPremium: u.isPremium,
        premiumUntil: u.premiumUntil?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        transactions: u.transaksi.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          reference: t.reference,
          orderId: t.orderId,
          midtransId: t.midtransId,
          createdAt: t.createdAt.toISOString(),
        })),
        totalPaid: u.transaksi.reduce((s, t) => s + (t.amount || 0), 0),
      })),
      suspiciouslyShortExpiry: suspiciouslyShort.map((u) => ({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        premiumUntil: u.premiumUntil?.toISOString() ?? null,
        lastPayment: u.transaksi[0]
          ? { reference: u.transaksi[0].reference, createdAt: u.transaksi[0].createdAt.toISOString() }
          : null,
      })),
    });
  } catch (error) {
    console.error("[Payment Health] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
