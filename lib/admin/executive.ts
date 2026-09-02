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

const DAY_MS = 86_400_000;

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

/**
 * Calculate true MRR from currently active Premium subscriptions.
 * For each active user, determine plan from most recent SUCCESS transaction
 * reference, then sum MRR_CONTRIBUTION[plan].
 */
export async function calculateMRR(): Promise<number> {
  const now = new Date();
  const activeUsers = await db.user.findMany({
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

  let totalMRR = 0;
  for (const user of activeUsers) {
    const tx = user.transaksi[0];
    const ref = tx?.reference || user.premiumPlan || "";
    const planKey = ref.includes("YEARLY")
      ? (user.role === "MURID" ? "MURID_PREMIUM_YEARLY" : "GURU_PRO_YEARLY")
      : (user.role === "MURID" ? "MURID_PREMIUM_MONTHLY" : "GURU_PRO_MONTHLY");
    totalMRR += MRR_CONTRIBUTION[planKey as keyof typeof MRR_CONTRIBUTION] || 0;
  }
  return totalMRR;
}

export interface ExecutiveDashboardData {
  timestamp: string;
  users: { total: number; murid: number; guru: number };
  active: {
    dau: { value: number; trend: number };
    wau: { value: number; trend: number };
    mau: { value: number; trend: number };
  };
  growth: {
    new7d: { value: number; trend: number };
    new30d: { value: number; trend: number };
  };
  premium: {
    active: { value: number; trend: number };
    conversionRate: number;
    trialActive: number;
  };
  revenue: {
    mrr: { value: number; trend: number };
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
 *
 * METRIC CONTRACT:
 *
 * | Metric                | Source Model      | Source Fields                          | Filter                                  | Aggregation | Time Window    | Formula                              | Type     |
 * |-----------------------|-------------------|----------------------------------------|-----------------------------------------|-------------|----------------|--------------------------------------|----------|
 * | totalUsers            | User              | id                                     | none                                    | count       | all-time       | count(*)                             | number   |
 * | DAU                   | XPTransaction     | userId                                 | createdAt >= todayStart                 | groupBy     | today          | distinct(userId)                     | number   |
 * | WAU                   | XPTransaction     | userId                                 | createdAt >= weekAgo                    | groupBy     | 7 days         | distinct(userId)                     | number   |
 * | MAU                   | XPTransaction     | userId                                 | createdAt >= monthAgo                   | groupBy     | 30 days        | distinct(userId)                     | number   |
 * | newUsers7d            | User              | id                                     | createdAt >= weekAgo                    | count       | 7 days         | count(*)                             | number   |
 * | activePremium         | User              | id                                     | isPremium=true, premiumUntil>now        | count       | current        | count(*)                             | number   |
 * | MRR                   | User + plan      | MRR_CONTRIBUTION[plan]                 | isPremium=true, premiumUntil>now        | sum         | current        | sum of active subscription MRR          | number   |
 * | revenue30d            | Transaksi         | amount                                 | status=SUCCESS, createdAt>=monthAgo     | sum         | 30 days        | sum(amount)                          | number   |
 * | revenueAllTime        | Transaksi         | amount                                 | status=SUCCESS                          | sum         | all-time       | sum(amount)                          | number   |
 * | jalurCompleted7d      | UserUnitProgress  | id                                     | completed=true, completedAt>=weekAgo    | count       | 7 days         | count(*)                             | number   |
 * | ukbiSessions7d        | ProgresKompetensi | id                                     | startedAt>=weekAgo                      | count       | 7 days         | count(*)                             | number   |
 * | karya7d               | StudentKarya      | id                                     | createdAt>=weekAgo                      | count       | 7 days         | count(*)                             | number   |
 * | aiGenerations7d       | AIUsage           | id                                     | createdAt>=weekAgo                      | count       | 7 days         | count(*)                             | number   |
 * | premiumConversionRate | derived           | activePremium / (guru - founderCount)  |                                         | ratio       | current        | round(activePremium / (guru-fc) * 100) | percent  |
 * | cohort D7 retention   | XPTransaction+User| userId, createdAt                      | cohort window                           | ratio       | 7 days after   | activeInWindow / registered          | percent  |
 * | cohort D30 retention  | XPTransaction+User| userId, createdAt                      | cohort window                           | ratio       | 30 days after  | activeAfterWindow / registered       | percent  |
 * | paymentHealth         | Transaksi+User    | status, isPremium, premiumUntil        | type IN (PREMIUM_UPGRADE,MURID_PREMIUM) | filter      | all-time       | mismatch detection                   | object   |
 */
export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  const now = new Date();
  const todayStart = wibTodayStart(now);
  const yesterdayStart = wibDaysAgo(1, now);
  const weekAgo = wibDaysAgo(7, now);
  const twoWeeksAgo = wibDaysAgo(14, now);
  const monthAgo = wibDaysAgo(30, now);
  const twoMonthsAgo = wibDaysAgo(60, now);

  const [
    totalUsers, totalMurid, totalGuru, founderCount,
    dau, wau, mau, dauYesterday, wauPrev, mauPrev,
    newUsers7d, newUsersPrev7d, newUsers30d, newUsersPrev30d,
    activePremium, activePremiumPrev,
    revenue30d, revenuePrev30d, revenueAllTime,
    mrrCurrent, mrrPrev,
    txSuccess30d, txPending,
    jalurCompleted7d, jalurCompletedPrev7d,
    ukbiSessions7d,
    karya7d, karyaPrev7d,
    aiGenerations7d,
    paymentHealth,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "MURID" } }),
    db.user.count({ where: { role: "GURU" } }),
    db.user.count({ where: { isFounder: true } }),

    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: todayStart } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: weekAgo } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: monthAgo } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }).then((r) => r.length),
    db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }).then((r) => r.length),

    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.user.count({ where: { createdAt: { gte: monthAgo } } }),
    db.user.count({ where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

    db.user.count({ where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false } }),
    db.user.count({ where: { isPremium: true, premiumUntil: { gt: weekAgo }, isFounder: false } }),

    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: monthAgo } } }).then((r) => r._sum.amount || 0),
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }).then((r) => r._sum.amount || 0),
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }).then((r) => r._sum.amount || 0),

    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }).then((r) => r._sum.amount || 0),
    db.transaksi.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lt: new Date(now.getFullYear(), now.getMonth(), 1) } } }).then((r) => r._sum.amount || 0),

    db.transaksi.count({ where: { status: "SUCCESS", createdAt: { gte: monthAgo } } }),
    db.transaksi.count({ where: { status: "PENDING" } }),

    db.userUnitProgress.count({ where: { completed: true, completedAt: { gte: weekAgo } } }),
    db.userUnitProgress.count({ where: { completed: true, completedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.progresKompetensi.count({ where: { startedAt: { gte: weekAgo } } }),

    db.studentKarya.count({ where: { createdAt: { gte: weekAgo } } }),
    db.studentKarya.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),

    db.aIUsage.count({ where: { createdAt: { gte: weekAgo } } }),

    // Payment health
    db.transaksi.findMany({
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
        if (existing) { existing.totalPaid += t.amount; existing.transactions.push({ id: t.id, type: t.type, amount: t.amount, reference: null, orderId: null, createdAt: t.createdAt.toISOString() }); }
        else { userMap.set(t.userId, { userId: t.userId, fullName: t.user.fullName, email: t.user.email, role: t.user.role, totalPaid: t.amount, transactions: [{ id: t.id, type: t.type, amount: t.amount, reference: null, orderId: null, createdAt: t.createdAt.toISOString() }] }); }
      }
      const affectedUsers = Array.from(userMap.values());
      const muridCount = affectedUsers.filter((u) => u.role === "MURID").length;
      return {
        summary: { totalAffected: affectedUsers.length, totalRevenueAtRisk: affected.reduce((s, t) => s + t.amount, 0), affectedByRole: { murid: muridCount, guru: affectedUsers.length - muridCount } },
        affectedUsers,
      };
    }),
  ]);

  // Retention cohorts — standard D7/D30 semantics
  // Cohort = users registered on a specific WIB calendar day
  // D7 = qualified activity on cohort_date + 7 calendar days (in WIB)
  // D30 = qualified activity on cohort_date + 30 calendar days (in WIB)
  // Returns null for insufficient observation window
  const cohorts: { label: string; registered: number; active7d: number | null; active30d: number | null; d7Rate: number | null; d30Rate: number | null; hasEnoughData: boolean }[] = [];
  const nowWib = utcToWibDate(now);

  for (let d = 30; d >= 1; d--) {
    // Cohort registration day in WIB, offset by d days from today
    const cohortWibDay = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - d));
    const { start: cohortDayStart, end: cohortDayEnd } = wibDayToUtcRange(cohortWibDay);

    // Users who registered on this WIB day
    const cohortUsers = await db.user.findMany({
      where: { createdAt: { gte: cohortDayStart, lt: cohortDayEnd } },
      select: { id: true },
    });
    const ids = cohortUsers.map((u) => u.id);
    const registered = ids.length;

    if (registered === 0) continue; // skip empty cohorts

    // D7: activity on cohort_date + 7 WIB days
    const d7Day = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - d + 7));
    const hasEnoughD7 = d <= 23; // today - d + 7 <= today → d >= 7, but need the day to have passed
    // D7 day must be strictly before today (the day must be complete)
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

    cohorts.push({
      label,
      registered,
      active7d,
      active30d,
      d7Rate,
      d30Rate,
      hasEnoughData: d7Complete,
    });

    if (cohorts.length >= 10) break; // show last 10 cohorts with data
  }

  const guruCount = Math.max(totalGuru - founderCount, 0);
  const premiumConversionRate = guruCount > 0 ? Math.round((activePremium / guruCount) * 100) : 0;
  const trialActive = await db.user.count({ where: { role: "GURU", trialEndsAt: { gt: now } } });

  // TRUE MRR: from active subscriptions, not transaction cash
  const trueMRR = await calculateMRR();

  return {
    timestamp: now.toISOString(),
    users: { total: totalUsers, murid: totalMurid, guru: totalGuru },
    active: { dau: { value: dau, trend: pctChange(dau, dauYesterday) }, wau: { value: wau, trend: pctChange(wau, wauPrev) }, mau: { value: mau, trend: pctChange(mau, mauPrev) } },
    growth: { new7d: { value: newUsers7d, trend: pctChange(newUsers7d, newUsersPrev7d) }, new30d: { value: newUsers30d, trend: pctChange(newUsers30d, newUsersPrev30d) } },
    premium: { active: { value: activePremium, trend: pctChange(activePremium, activePremiumPrev) }, conversionRate: premiumConversionRate, trialActive },
    revenue: { mrr: { value: trueMRR, trend: 0 }, cashCollectedMonth: { value: mrrCurrent, trend: pctChange(mrrCurrent, mrrPrev) }, cashCollected30d: { value: revenue30d, trend: pctChange(revenue30d, revenuePrev30d) }, cashCollectedAllTime: revenueAllTime, transactionsSuccess30d: txSuccess30d, transactionsPending: txPending },
    learning: { jalurCompleted7d: { value: jalurCompleted7d, trend: pctChange(jalurCompleted7d, jalurCompletedPrev7d) }, ukbiSessions7d },
    content: { karya7d: { value: karya7d, trend: pctChange(karya7d, karyaPrev7d) } },
    ai: { generations7d: aiGenerations7d },
    retention: { cohorts },
    paymentHealth,
  };
}
