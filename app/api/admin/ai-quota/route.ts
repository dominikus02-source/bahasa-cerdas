/**
 * GET /api/admin/ai-quota — List all users with AI quota/trial info.
 *
 * Query params:
 *   page    (default 1)
 *   limit   (default 50, max 100)
 *   search  (optional, filters by fullName or email, case-insensitive)
 *   role    (optional: GURU | MURID | ADMIN, defaults to all)
 *   plan    (optional: trial | premium | free, filters by AI plan status)
 *   sortBy  (optional: name | email | role | creditsUsed | creditsRemaining | trialEndsAt, default name)
 *   sortDir (optional: asc | desc, default asc)
 *
 * Auth: Founder only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";

function getPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    const planFilter = searchParams.get("plan") || "";
    const sortBy = searchParams.get("sortBy") || "fullName";
    const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

    const where: any = {};
    if (roleFilter && ["GURU", "MURID", "ADMIN"].includes(roleFilter)) {
      where.role = roleFilter;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({ where });
    const dbSortOrder: any = {};
    const sortFieldMap: Record<string, string> = {
      name: "fullName",
      email: "email",
      role: "role",
    };
    const dbSortField = sortFieldMap[sortBy] || "fullName";
    dbSortOrder[dbSortField] = sortDir;

    const users = await prisma.user.findMany({
      where,
      orderBy: dbSortOrder,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isFounder: true,
        isPremium: true,
        premiumUntil: true,
        premiumPlan: true,
        trialStartedAt: true,
        trialEndsAt: true,
        trialPlan: true,
        trialCreditsTotal: true,
        coins: true,
        createdAt: true,
        lastActiveAt: true,
        aiCreditLedger: {
          where: { period: getPeriod() },
          select: { creditsUsed: true, creditsTotal: true, period: true, plan: true },
        },
      },
    });

    const result = users.map((u) => {
      const planInfo = resolveUserAiPlan(u);
      const ledger = u.aiCreditLedger[0];
      const creditsUsed = ledger?.creditsUsed ?? 0;
      const creditsTotal = planInfo.unlimited ? 999999 : ledger?.creditsTotal ?? planInfo.creditsTotal;
      const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isFounder: u.isFounder,
        plan: planInfo.plan,
        isTrial: planInfo.isTrial,
        isPremium: u.isPremium,
        premiumUntil: u.premiumUntil?.toISOString() ?? null,
        trialStartedAt: u.trialStartedAt?.toISOString() ?? null,
        trialEndsAt: u.trialEndsAt?.toISOString() ?? null,
        trialPlan: u.trialPlan,
        trialCreditsTotal: u.trialCreditsTotal,
        creditsUsed,
        creditsTotal,
        remainingCredits: creditsRemaining,
        period: ledger?.period ?? getPeriod(),
        coins: u.coins,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
      };
    });

    // Apply plan filter in-memory (since plan is derived)
    let filtered = result;
    if (planFilter === "trial") {
      filtered = result.filter((u) => u.trialEndsAt && new Date(u.trialEndsAt) > new Date());
    } else if (planFilter === "premium") {
      filtered = result.filter((u) => u.isPremium && !u.isFounder && u.premiumUntil && new Date(u.premiumUntil) > new Date());
    } else if (planFilter === "free") {
      filtered = result.filter((u) => !u.isPremium && !u.isFounder && (!u.trialEndsAt || new Date(u.trialEndsAt) <= new Date()) && u.role === "GURU");
    } else if (planFilter === "exhausted") {
      filtered = result.filter((u) => u.remainingCredits <= 0 && !(u.role === "MURID" || u.role === "ADMIN" || u.isFounder));
    }

    // In-memory sort for derived fields
    if (sortBy === "creditsUsed" || sortBy === "creditsRemaining" || sortBy === "trialEndsAt") {
      filtered.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "creditsUsed") cmp = a.creditsUsed - b.creditsUsed;
        else if (sortBy === "creditsRemaining") cmp = a.remainingCredits - b.remainingCredits;
        else if (sortBy === "trialEndsAt") {
          const aDate = a.trialEndsAt ? new Date(a.trialEndsAt).getTime() : 0;
          const bDate = b.trialEndsAt ? new Date(b.trialEndsAt).getTime() : 0;
          cmp = aDate - bDate;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        users: filtered,
        pagination: {
          page,
          limit,
          total,
          totalFiltered: filtered.length,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error("[Admin AI Quota] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal error" }, { status: 500 });
  }
}
