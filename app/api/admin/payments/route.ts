import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const planId = searchParams.get("planId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = (searchParams.get("sortDir") || "desc") === "asc" ? "asc" : "desc";

    const where: any = { type: "PREMIUM_UPGRADE" };
    if (status) where.status = status;
    if (planId) where.reference = planId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
    }
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === "amount") orderBy.amount = sortDir;
    else if (sortBy === "status") orderBy.status = sortDir;
    else orderBy.createdAt = sortDir;

    const [transactions, total, statsRow] = await Promise.all([
      db.transaksi.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderId: true,
          amount: true,
          status: true,
          reference: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          midtransId: true,
          user: {
            select: { id: true, fullName: true, email: true, isPremium: true, premiumPlan: true, premiumUntil: true, trialEndsAt: true, isFounder: true },
          },
        },
      }),
      db.transaksi.count({ where }),
      db.transaksi.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: { type: "PREMIUM_UPGRADE" },
      }),
    ]);

    const statWhere = (s: string) => ({ type: "PREMIUM_UPGRADE", status: s });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSuccess, totalPending, totalFailed, revenueMonth, revenueAllTime] = await Promise.all([
      db.transaksi.count({ where: statWhere("SUCCESS") }),
      db.transaksi.count({ where: statWhere("PENDING") }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: { in: ["FAILED", "CANCELLED", "EXPIRED"] } } }),
      db.transaksi.aggregate({ _sum: { amount: true }, where: { ...statWhere("SUCCESS"), createdAt: { gte: monthStart } } }),
      db.transaksi.aggregate({ _sum: { amount: true }, where: statWhere("SUCCESS") }),
    ]);

    const data = transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      amount: t.amount,
      status: t.status,
      planId: t.reference || (t.metadata as any)?.planId || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      midtransId: t.midtransId,
      user: {
        id: t.user.id,
        fullName: t.user.fullName,
        email: t.user.email,
        isPremium: t.user.isPremium,
        premiumPlan: t.user.premiumPlan,
        premiumUntil: t.user.premiumUntil,
        trialEndsAt: t.user.trialEndsAt,
        isFounder: t.user.isFounder,
      },
      premiumActivated: t.status === "SUCCESS" && !!t.user.premiumUntil && t.user.premiumUntil > new Date(),
    }));

    return NextResponse.json({
      stats: {
        total: (statsRow as any)._count.id,
        allTimeRevenue: (statsRow as any)._sum.amount || 0,
        success: totalSuccess,
        pending: totalPending,
        failed: totalFailed,
        revenueThisMonth: revenueMonth._sum.amount || 0,
        revenueAllTime: revenueAllTime._sum.amount || 0,
      },
      transactions: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[Admin Payments] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
