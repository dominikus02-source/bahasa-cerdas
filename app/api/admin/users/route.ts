import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  resolvePlanForUser,
  getEntitlement,
  getPeriodKey,
  entitlementValueToLimit,
} from "@/lib/premium-economy";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role && ["MURID", "GURU"].includes(role)) where.role = role;
    if (status === "premium") { where.role = "GURU"; where.isPremium = true; where.isFounder = false; where.premiumUntil = { gt: new Date() }; }
    if (status === "founder") where.isFounder = true;
    if (status === "trial") { where.role = "GURU"; where.trialEndsAt = { gt: new Date() }; }
    if (status === "free") {
      where.isPremium = false; where.isFounder = false;
      where.trialEndsAt = { not: { gt: new Date() } };
    }

    const [usersRaw, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true, fullName: true, email: true, role: true, isPremium: true,
          isFounder: true, premiumUntil: true, trialEndsAt: true,
          xp: true, level: true, createdAt: true, lastActiveAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    // BC Premium Economy: plan per user (pure — dari flag) + kuota simulasi
    // bulan ini. Gagal diam-diam bila tabel premium belum di-migrate.
    const users = usersRaw.map((u) => ({
      ...u,
      plan: resolvePlanForUser(u).plan,
      subscriptionStatus: resolvePlanForUser(u).subscriptionStatus,
    }));
    let simUsage: Record<string, number> = {};
    try {
      const rows = await db.premiumUsage.groupBy({
        by: ["userId"],
        where: {
          userId: { in: usersRaw.map((u) => u.id) },
          featureCode: "SIMULATION",
          periodKey: getPeriodKey("MONTH"),
        },
        _sum: { used: true },
      });
      simUsage = Object.fromEntries(rows.map((r) => [r.userId, r._sum.used ?? 0]));
    } catch {
      simUsage = {};
    }
    const planCodes = [...new Set(users.map((u) => u.plan))];
    const simLimits: Record<string, number> = {};
    await Promise.all(
      planCodes.map(async (code) => {
        simLimits[code] = entitlementValueToLimit(
          await getEntitlement(code, "SIMULATION_MONTHLY_LIMIT")
        );
      })
    );
    const usersWithPremium = users.map((u) => ({
      ...u,
      simUsage: simUsage[u.id] ?? 0,
      simLimit: simLimits[u.plan] ?? 0,
    }));

    return NextResponse.json({ users: usersWithPremium, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userIds, action } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 });
    }

    if (action === "togglePremium") {
      const targets = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, isPremium: true } });
      for (const t of targets) {
        await db.user.update({ where: { id: t.id }, data: { isPremium: !t.isPremium } });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "deactivate") {
      await db.user.updateMany({ where: { id: { in: userIds } }, data: { isPremium: false } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
