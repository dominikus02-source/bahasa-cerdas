import { db } from "@/lib/db";

// ════════════════════════════════════════════════════════════════════
// EXECUTIVE DASHBOARD SERVICE
//
// Single source of truth for all Control Tower queries.
// Used by: Server Component (production) AND integration tests.
// No mocking — both paths execute real Prisma against real DB.
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
  retention: { cohorts: { label: string; registered: number; active7d: number; active30d: number }[] };
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
 * | MRR                   | Transaksi         | amount                                 | status=SUCCESS, createdAt>=monthStart   | sum         | current month  | sum(amount)                          | number   |
 * | revenue30d            | Transaksi         | amount                                 | status=SUCCESS, createdAt>=monthAgo     | sum         | 30 days        | sum(amount)                          | number   |
 * | revenueAllTime        | Transaksi         | amount                                 | status=SUCCESS                          | sum         | all-time       | sum(amount)                          | number   |
 * | jalurCompleted7d      | UserUnitProgress  | id                                     | completed=true, completedAt>=weekAgo    | count       | 7 days         | count(*)                             | number   |
 * | ukbiSessions7d        | ProgresKompetensi | id                                     | startedAt>=weekAgo                      | count       | 7 days         | count(*)                             | number   |
 * | karya7d               | StudentKarya      | id                                     | createdAt>=weekAgo                      | count       | 7 days         | count(*)                             | number   |
 * | aiGenerations7d       | AIUsage           | id                                     | createdAt>=weekAgo                      | count       | 7 days         | count(*)                             | number   |
 * | premiumConversionRate | derived           | activePremium / (guru - founders)      |                                         | ratio       | current        | round(activePremium / (guru-3) * 100)| percent  |
 * | cohort D7 retention   | XPTransaction+User| userId, createdAt                      | cohort window                           | ratio       | 7 days after   | activeInWindow / registered          | percent  |
 * | cohort D30 retention  | XPTransaction+User| userId, createdAt                      | cohort window                           | ratio       | 30 days after  | activeAfterWindow / registered       | percent  |
 * | paymentHealth         | Transaksi+User    | status, isPremium, premiumUntil        | type IN (PREMIUM_UPGRADE,MURID_PREMIUM) | filter      | all-time       | mismatch detection                   | object   |
 */
export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const twoMonthsAgo = new Date(now.getTime() - 60 * DAY_MS);

  const [
    totalUsers, totalMurid, totalGuru,
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

  // Retention cohorts
  const cohorts: { label: string; registered: number; active7d: number; active30d: number }[] = [];
  for (let w = 0; w < 4; w++) {
    const cohortStart = new Date(now.getTime() - (w + 1) * 7 * DAY_MS);
    const cohortEnd = new Date(now.getTime() - w * 7 * DAY_MS);
    const cohortUsers = await db.user.findMany({ where: { createdAt: { gte: cohortStart, lt: cohortEnd } }, select: { id: true } });
    const ids = cohortUsers.map((u) => u.id);
    const registered = ids.length;
    if (registered === 0) { cohorts.push({ label: `W-${w + 1}`, registered: 0, active7d: 0, active30d: 0 }); continue; }
    const [active7d, active30d] = await Promise.all([
      db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: cohortStart, lt: cohortEnd }, userId: { in: ids } } }).then((r) => r.length),
      db.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: cohortEnd }, userId: { in: ids } } }).then((r) => r.length),
    ]);
    cohorts.push({ label: `W-${w + 1}`, registered, active7d, active30d });
  }

  const guruCount = Math.max(totalGuru - 3, 0);
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
