import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

/**
 * GET /api/admin/premium/report
 *
 * Unified Premium report for Admin. Shows both Student Premium (MURID_PREMIUM)
 * and Teacher Premium (PREMIUM_UPGRADE / GURU_PRO) in a single endpoint.
 *
 * Premium status is determined by User.isPremium + User.premiumUntil,
 * NOT by transaction status.
 *
 * Transaction data provides payment/subscription history only.
 */

const VALID_AUDIENCES = ["ALL", "MURID", "GURU"] as const;
const VALID_STATUSES = ["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED"] as const;
const VALID_PLANS = [
  "ALL",
  "MURID_PREMIUM_MONTHLY",
  "MURID_PREMIUM_YEARLY",
  "GURU_PRO_MONTHLY",
  "GURU_PRO_YEARLY",
] as const;

type Audience = (typeof VALID_AUDIENCES)[number];
type Status = (typeof VALID_STATUSES)[number];
type PlanFilter = (typeof VALID_PLANS)[number];

export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    // --- Parse & validate query parameters ---
    const audience: Audience = VALID_AUDIENCES.includes(
      searchParams.get("audience") as Audience,
    )
      ? (searchParams.get("audience") as Audience)
      : "ALL";

    const status: Status = VALID_STATUSES.includes(
      searchParams.get("status") as Status,
    )
      ? (searchParams.get("status") as Status)
      : "ALL";

    const plan: PlanFilter = VALID_PLANS.includes(
      searchParams.get("plan") as PlanFilter,
    )
      ? (searchParams.get("plan") as PlanFilter)
      : "ALL";

    const search = searchParams.get("search")?.trim() || null;
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "25")),
    );

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // --- Helper: audience role filter ---
    const roleFilter =
      audience === "MURID"
        ? { role: "MURID" as const }
        : audience === "GURU"
          ? { role: "GURU" as const }
          : { role: { in: ["MURID", "GURU"] as Role[] } };

    // --- Build transaction where clause for include ---
    const txWhere: Record<string, unknown> = { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" };
    if (plan !== "ALL") txWhere.reference = { in: [plan] };
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");
      txWhere.createdAt = dateFilter;
    }

    const txSelect = {
      id: true,
      status: true,
      reference: true,
      orderId: true,
      midtransId: true,
      amount: true,
      createdAt: true,
    };

    // --- STATUS-SPECIFIC SUMMARY COUNTS (efficient per-status queries) ---
    const summaryWhere = (s: Status) => {
      const base: Record<string, unknown> = {
        ...roleFilter,
        isPremium: true,
        premiumUntil: { not: null },
      };
      if (s === "ACTIVE")
        return { ...base, premiumUntil: { gt: now } };
      if (s === "EXPIRING_SOON")
        return { ...base, premiumUntil: { gt: now, lte: sevenDaysFromNow } };
      return base;
    };

    const [activeCount, muridActiveCount, guruActiveCount, expiringCount] =
      await Promise.all([
        db.user.count({ where: summaryWhere("ACTIVE") }),
        db.user.count({
          where: { ...summaryWhere("ACTIVE"), role: "MURID" },
        }),
        db.user.count({
          where: { ...summaryWhere("ACTIVE"), role: "GURU" },
        }),
        db.user.count({ where: summaryWhere("EXPIRING_SOON") }),
      ]);

    // EXPIRED: users who had premium transactions but are no longer premium
    const expiredWhere = {
      ...roleFilter,
      OR: [
        { isPremium: false },
        { premiumUntil: null },
        { premiumUntil: { lte: now } },
      ],
      transaksi: {
        some: {
          type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
          status: "SUCCESS",
          ...(plan !== "ALL" ? { reference: { in: [plan] } } : {}),
        },
      },
    };
    const expiredCount = await db.user.count({ where: expiredWhere });

    // --- PAGINATED DATA ---
    // Fetch premium users (active + expiring) OR users with historical premium transactions
    const usersWhere = {
      OR: [
        // Active or expiring premium
        {
          isPremium: true,
          premiumUntil: { not: null, gt: new Date(0) },
        },
        // Historical premium transactions
        {
          transaksi: {
            some: {
              type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
              status: "SUCCESS",
            },
          },
        },
      ],
      ...roleFilter,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rawUsers, total] = await Promise.all([
      db.user.findMany({
        where: usersWhere,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isPremium: true,
          premiumPlan: true,
          premiumUntil: true,
          createdAt: true,
          transaksi: {
            where: txWhere,
            orderBy: { createdAt: "desc" as const },
            take: 1,
            select: txSelect,
          },
        },
      }),
      db.user.count({ where: usersWhere }),
    ]);

    // --- POST-PROCESS: determine status + extract last transaction ---
    const data = rawUsers.map((user) => {
      const tx = user.transaksi?.[0] ?? null;

      // Determine premium status from User flags (NOT from transactions)
      let premiumStatus: string;
      if (user.isPremium && user.premiumUntil && user.premiumUntil > now) {
        premiumStatus =
          user.premiumUntil <= sevenDaysFromNow ? "EXPIRING_SOON" : "ACTIVE";
      } else if (
        user.isPremium &&
        user.premiumUntil &&
        user.premiumUntil <= now
      ) {
        premiumStatus = "EXPIRED";
      } else {
        // Has historical transaction but not currently premium
        premiumStatus = "EXPIRED";
      }

      // Map audience from role
      const rowAudience = user.role === "MURID" ? "MURID" : "GURU";

      // Compute days until expiry
      let daysUntilExpiry: number | null = null;
      if (user.premiumUntil && user.premiumUntil > now) {
        daysUntilExpiry = Math.ceil(
          (user.premiumUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        audience: rowAudience,
        role: user.role,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
        premiumUntil: user.premiumUntil?.toISOString() ?? null,
        premiumStatus,
        daysUntilExpiry,
        subscriptionPlan: tx?.reference ?? null,
        amount: tx?.amount ?? null,
        lastTransaction: tx
          ? {
              id: tx.id,
              status: tx.status,
              reference: tx.reference,
              orderId: tx.orderId,
              midtransId: tx.midtransId,
              amount: tx.amount,
              createdAt: tx.createdAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalActive: activeCount,
        muridActive: muridActiveCount,
        guruActive: guruActiveCount,
        expiringSoon: expiringCount,
        expired: expiredCount,
      },
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        audience,
        status,
        plan,
        search,
        from,
        to,
      },
    });
  } catch (error) {
    console.error("[Admin Premium Report] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
