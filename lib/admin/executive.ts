import { db } from "@/lib/db";
import { wibTodayStart, wibDaysAgo, utcToWibDate, wibDayToUtcRange } from "@/lib/admin/analytics-timezone";

// ════════════════════════════════════════════════════════════════════
// EXECUTIVE DASHBOARD SERVICE
//
// Single source of truth for all Control Tower queries.
// Used by: Server Component (production) AND integration tests.
// No mocking — both paths execute real Prisma against real DB.
//
// All date boundaries use Asia/Jakarta (WIB, UTC+7).
// Database timestamps remain UTC; only reporting boundaries convert.
// ════════════════════════════════════════════════════════════════════

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Canonical Premium plan prices (from webhook route). */
export const PLAN_PRICES = {
  MURID_PREMIUM_MONTHLY: 19_000,
  MURID_PREMIUM_YEARLY: 180_000,
  GURU_PRO_MONTHLY: 49_000,
  GURU_PRO_YEARLY: 399_000,
} as const;

/** MRR contribution per plan (yearly divided by 12). */
export const MRR_CONTRIBUTION = {
  MURID_PREMIUM_MONTHLY: 19_000,
  MURID_PREMIUM_YEARLY: Math.round(180_000 / 12), // = 15,000
  GURU_PRO_MONTHLY: 49_000,
  GURU_PRO_YEARLY: Math.round(399_000 / 12), // = 33,250
} as const;

// ── MRR ────────────────────────────────────────────────────────────

export interface MRRBreakdown {
  muridMonthly: number;
  muridYearly: number;
  guruMonthly: number;
  guruYearly: number;
  total: number;
}

/** Internal: fetch active premium users with plan detection data.
 * `now` is the snapshot moment (defaults to current time); the generator
 * passes end-of-business-day so historical snapshots reuse this SAME formula
 * evaluated at a different moment — never a second MRR implementation.
 * `client` is injectable for offline tests. */
// Narrow client surface (only user.findMany is used) so the snapshot
// generator can inject a Pick<PrismaClient> without a full client.
type PremiumUserClient = Pick<typeof db, "user">;
async function getActivePremiumUsers(now: Date = new Date(), client: PremiumUserClient = db) {
  return client.user.findMany({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
    select: {
      id: true, role: true, premiumPlan: true,
      transaksi: {
        where: { status: "SUCCESS", type: { in: ["PREMIUM_UPGRADE", "MURID_PREMIUM"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { reference: true, amount: true },
      },
    },
  });
}

function detectPlanKey(user: { role: string; premiumPlan: string | null }, txRef?: string | null): keyof typeof MRR_CONTRIBUTION {
  const ref = txRef || user.premiumPlan || "";
  const isYearly = ref.toUpperCase().includes("YEARLY");
  if (user.role === "MURID") return isYearly ? "MURID_PREMIUM_YEARLY" : "MURID_PREMIUM_MONTHLY";
  return isYearly ? "GURU_PRO_YEARLY" : "GURU_PRO_MONTHLY";
}

/**
 * Calculate true MRR from currently active Premium subscriptions.
 * For each active user, determine plan from most recent SUCCESS transaction
 * reference, then sum MRR_CONTRIBUTION[plan].
 * `now` = snapshot moment (historical snapshots pass end-of-business-day).
 */
export async function calculateMRR(now: Date = new Date(), client: PremiumUserClient = db): Promise<number> {
  const activeUsers = await getActivePremiumUsers(now, client);
  let totalMRR = 0;
  for (const user of activeUsers) {
    const planKey = detectPlanKey(user, user.transaksi[0]?.reference);
    totalMRR += MRR_CONTRIBUTION[planKey] || 0;
  }
  return totalMRR;
}

/**
 * Calculate MRR breakdown by plan type (murid/guru × monthly/yearly).
 * Each active premium user counted exactly once.
 * Plan detection: most recent SUCCESS transaction reference, fallback to premiumPlan.
 * `now` = snapshot moment; `client` injectable for offline tests.
 */
export async function calculateMRRBreakdown(now: Date = new Date(), client: PremiumUserClient = db): Promise<MRRBreakdown> {
  const activeUsers = await getActivePremiumUsers(now, client);
  const breakdown: MRRBreakdown = { muridMonthly: 0, muridYearly: 0, guruMonthly: 0, guruYearly: 0, total: 0 };
  for (const user of activeUsers) {
    const planKey = detectPlanKey(user, user.transaksi[0]?.reference);
    const contribution = MRR_CONTRIBUTION[planKey] || 0;
    breakdown.total += contribution;
    if (planKey === "MURID_PREMIUM_MONTHLY") breakdown.muridMonthly += contribution;
    else if (planKey === "MURID_PREMIUM_YEARLY") breakdown.muridYearly += contribution;
    else if (planKey === "GURU_PRO_MONTHLY") breakdown.guruMonthly += contribution;
    else if (planKey === "GURU_PRO_YEARLY") breakdown.guruYearly += contribution;
  }
  return breakdown;
}

// ── Executive Dashboard Data ───────────────────────────────────────

export interface ExecutiveDashboardData {
  timestamp: string;
  users: { total: number; murid: number; guru: number };
  active: {
    dau: { value: number; trend: number };
    wau: { value: number; trend: number };
    mau: { value: number; trend: number };
  };
  /** DAU for consecutive-day decline detection in the health engine. */
  dauConsecutive: { today: number; yesterday: number; twoDaysAgo: number };
  growth: {
    new7d: { value: number; trend: number };
    new30d: { value: number; trend: number };
  };
  premium: {
    active: { value: number; trend: number };
    murid: number;
    guru: number;
    conversionRate: number;
    trialActive: number;
  };
  revenue: {
    mrr: { value: number; trend: number | null; comparisonAvailable: boolean };
    mrrBreakdown: MRRBreakdown;
    cashCollectedMonth: { value: number; trend: number };
    cashCollected30d: { value: number; trend: number };
    cashCollectedAllTime: number;
    transactionsSuccess30d: number;
    transactionsPending: number;
  };
  learning: {
    jalurCompleted7d: { value: number; trend: number };
    ukbiSessions7d: number;
  };
  content: { karya7d: { value: number; trend: number } };
  ai: { generations7d: number };
  retention: { cohorts: { label: string; registered: number; active7d: number | null; active30d: number | null; d7Rate: number | null; d30Rate: number | null; hasEnoughData: boolean }[] };
  paymentHealth: {
    summary: { totalAffected: number; totalRevenueAtRisk: number; affectedByRole: { murid: number; guru: number } };
    affectedUsers: any[];
  };
}

/**
 * Fetch all Control Tower data from Prisma.
 * Called by Server Component in production.
 * Called by integration test against real DB.
 */
export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  const now = new Date();
  const todayStart = wibTodayStart(now);
  const yesterdayStart = wibDaysAgo(1, now);
  const weekAgo = wibDaysAgo(7, now);
  const twoWeeksAgo = wibDaysAgo(14, now);
  const monthAgo = wibDaysAgo(30, now);
  const twoMonthsAgo = wibDaysAgo(60, now);

  // ── Batch 1: all independent queries in parallel ──
  const [
    totalUsers, totalMurid, totalGuru, founderCount,
    dau, wau, mau, dauYesterday, dauTwoDaysAgo,
    wauPrev, mauPrev,
    newUsers7d, newUsersPrev7d, newUsers30d, newUsersPrev30d,
    activePremium, muridPremium, guruPremium, activePremiumPrev,
    revenue30d, revenuePrev30d, revenueAllTime,
    mrrCurrent, mrrPrev,
    txSuccess30d, txPending,
    jalurCompleted7d, jalurCompletedPrev7d,
    ukbiSessions7d,
    karya7d, karyaPrev7d,
    aiGenerations7d,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "MURID" } }),
    db.user.count({ where: { role: "GURU" } }),
    db.user.count({ where: { isFounder: true } }),

    // DAU/WAU/MAU
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: todayStart } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: weekAgo } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: monthAgo } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: wibDaysAgo(2, now), lt: yesterdayStart } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }).then((r) => r.length),

    // New users
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.user.count({ where: { createdAt: { gte: monthAgo } } }),
    db.user.count({ where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

    // Premium
    db.user.count({ where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false } }),
    db.user.count({ where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false, role: "MURID" } }),
    db.user.count({ where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false, role: "GURU" } }),
    db.user.count({ where: { isPremium: true, premiumUntil: { gt: weekAgo }, isFounder: false } }),

    // Revenue
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: monthAgo } } }).then((r) => r._sum.amount || 0),
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }).then((r) => r._sum.amount || 0),
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }).then((r) => r._sum.amount || 0),

    // Cash collected current month + prev month
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }).then((r) => r._sum.amount || 0),
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lt: new Date(now.getFullYear(), now.getMonth(), 1) } } }).then((r) => r._sum.amount || 0),

    // Transactions
    db.transaksi.count({ where: { status: "SUCCESS", createdAt: { gte: monthAgo } } }),
    db.transaksi.count({ where: { status: "PENDING" } }),

    // Learning
    db.userUnitProgress.count({ where: { completed: true, completedAt: { gte: weekAgo } } }),
    db.userUnitProgress.count({ where: { completed: true, completedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.progresKompetensi.count({ where: { startedAt: { gte: weekAgo } } }),

    // Karya
    db.studentKarya.count({ where: { createdAt: { gte: weekAgo } } }),
    db.studentKarya.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),

    // AI
    db.aIUsage.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  // ── Batch 2: payment health (needs `now` from batch 1 completion) ──
  const paymentHealth = await db.transaksi.findMany({
    where: { status: "SUCCESS", type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] } },
    select: {
      id: true, type: true, amount: true, createdAt: true, userId: true,
      user: { select: { id: true, fullName: true, email: true, isPremium: true, premiumUntil: true, role: true } },
    },
  }).then((txs) => {
    const affected = txs.filter((t) => {
      if (t.user.isPremium && t.user.premiumUntil && new Date(t.user.premiumUntil) > now) return false;
      return true;
    });
    const userMap = new Map<string, { userId: string; fullName: string; email: string; role: string; totalPaid: number; transactions: any[] }>();
    for (const t of affected) {
      const existing = userMap.get(t.userId);
      if (existing) {
        existing.totalPaid += t.amount;
        existing.transactions.push({ id: t.id, type: t.type, amount: t.amount, reference: null, orderId: null, createdAt: t.createdAt.toISOString() });
      } else {
        userMap.set(t.userId, {
          userId: t.userId, fullName: t.user.fullName, email: t.user.email, role: t.user.role,
          totalPaid: t.amount,
          transactions: [{ id: t.id, type: t.type, amount: t.amount, reference: null, orderId: null, createdAt: t.createdAt.toISOString() }],
        });
      }
    }
    const affectedUsers = Array.from(userMap.values());
    const muridCount = affectedUsers.filter((u) => u.role === "MURID").length;
    return {
      summary: {
        totalAffected: affectedUsers.length,
        totalRevenueAtRisk: affected.reduce((s, t) => s + t.amount, 0),
        affectedByRole: { murid: muridCount, guru: affectedUsers.length - muridCount },
      },
      affectedUsers,
    };
  });

  // ── Retention cohorts — standard D7/D30 semantics ──
  const cohorts: { label: string; registered: number; active7d: number | null; active30d: number | null; d7Rate: number | null; d30Rate: number | null; hasEnoughData: boolean }[] = [];
  const nowWib = utcToWibDate(now);

  for (let d = 30; d >= 1; d--) {
    const cohortWibDay = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - d));
    const { start: cohortDayStart, end: cohortDayEnd } = wibDayToUtcRange(cohortWibDay);

    const cohortUsers = await db.user.findMany({
      where: { createdAt: { gte: cohortDayStart, lt: cohortDayEnd } },
      select: { id: true },
    });
    const ids = cohortUsers.map((u) => u.id);
    const registered = ids.length;
    if (registered === 0) continue;

    // D7: activity on cohort_date + 7 WIB days
    const d7Day = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - d + 7));
    const d7Complete = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day)) > d7Day;

    let active7d: number | null = null;
    if (d7Complete && ids.length > 0) {
      const { start: d7Start, end: d7End } = wibDayToUtcRange(d7Day);
      active7d = (await db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: d7Start, lt: d7End }, userId: { in: ids } },
      })).length;
    }

    // D30: activity on cohort_date + 30 WIB days
    const d30Day = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - d + 30));
    const d30Complete = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day)) > d30Day;

    let active30d: number | null = null;
    if (d30Complete && ids.length > 0) {
      const { start: d30Start, end: d30End } = wibDayToUtcRange(d30Day);
      active30d = (await db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: d30Start, lt: d30End }, userId: { in: ids } },
      })).length;
    }

    const label = `${nowWib.year}-${String(nowWib.month + 1).padStart(2, "0")}-${String(nowWib.day - d).padStart(2, "0")}`;
    const d7Rate = active7d !== null && registered > 0 ? Math.round((active7d / registered) * 100) : null;
    const d30Rate = active30d !== null && registered > 0 ? Math.round((active30d / registered) * 100) : null;

    cohorts.push({ label, registered, active7d, active30d, d7Rate, d30Rate, hasEnoughData: d7Complete });
    if (cohorts.length >= 10) break;
  }

  // ── Derived metrics ──
  const guruCount = Math.max(totalGuru - founderCount, 0);
  const premiumConversionRate = guruCount > 0 ? Math.round((activePremium / guruCount) * 100) : 0;
  const trialActive = await db.user.count({ where: { role: "GURU", trialEndsAt: { gt: now } } });

  // TRUE MRR: from active subscriptions, not transaction cash
  const [trueMRR, mrrBreakdown] = await Promise.all([calculateMRR(), calculateMRRBreakdown()]);

  return {
    timestamp: now.toISOString(),
    users: { total: totalUsers, murid: totalMurid, guru: totalGuru },
    active: {
      dau: { value: dau, trend: pctChange(dau, dauYesterday) },
      wau: { value: wau, trend: pctChange(wau, wauPrev) },
      mau: { value: mau, trend: pctChange(mau, mauPrev) },
    },
    dauConsecutive: { today: dau, yesterday: dauYesterday, twoDaysAgo: dauTwoDaysAgo },
    growth: {
      new7d: { value: newUsers7d, trend: pctChange(newUsers7d, newUsersPrev7d) },
      new30d: { value: newUsers30d, trend: pctChange(newUsers30d, newUsersPrev30d) },
    },
    premium: {
      active: { value: activePremium, trend: pctChange(activePremium, activePremiumPrev) },
      murid: muridPremium,
      guru: guruPremium,
      conversionRate: premiumConversionRate,
      trialActive,
    },
    revenue: {
      mrr: { value: trueMRR, trend: null, comparisonAvailable: false },
      mrrBreakdown,
      cashCollectedMonth: { value: mrrCurrent, trend: pctChange(mrrCurrent, mrrPrev) },
      cashCollected30d: { value: revenue30d, trend: pctChange(revenue30d, revenuePrev30d) },
      cashCollectedAllTime: revenueAllTime,
      transactionsSuccess30d: txSuccess30d,
      transactionsPending: txPending,
    },
    learning: { jalurCompleted7d: { value: jalurCompleted7d, trend: pctChange(jalurCompleted7d, jalurCompletedPrev7d) }, ukbiSessions7d },
    content: { karya7d: { value: karya7d, trend: pctChange(karya7d, karyaPrev7d) } },
    ai: { generations7d: aiGenerations7d },
    retention: { cohorts },
    paymentHealth,
  };
}
