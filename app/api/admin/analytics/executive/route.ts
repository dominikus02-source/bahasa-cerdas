import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// ════════════════════════════════════════════════════════════════════
// FOUNDER CONTROL TOWER — Executive KPI API
//
// Single endpoint returning all high-level metrics a founder needs:
//   totalUsers, activeUsers (DAU/WAU/MAU), activePremium, newPremium,
//   revenue (MRR), premiumConversionRate, retentionCohorts.
//
// Read-only, founder-only. Cache headers encouraged (60s stale).
// ════════════════════════════════════════════════════════════════════

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
    const twoMonthsAgo = new Date(now.getTime() - 60 * DAY_MS);

    // ── Parallel queries ──
    const [
      // User totals
      totalUsers,
      totalMurid,
      totalGuru,
      // Active users (DAU/WAU/MAU via XPTransaction — proxy for real activity)
      dau,
      wau,
      mau,
      dauYesterday,
      wauPrev,
      mauPrev,
      // New users
      newUsers7d,
      newUsersPrev7d,
      newUsers30d,
      newUsersPrev30d,
      // Premium
      activePremium,
      newPremium7d,
      newPremium30d,
      activePremiumPrev,
      // Revenue (successful transactions)
      revenue30d,
      revenuePrev30d,
      revenueAllTime,
      mrrCurrent,
      mrrPrev,
      // Transactions
      txSuccess30d,
      txPending,
      // Learning
      jalurCompleted7d,
      jalurCompletedPrev7d,
      ukbiSessions7d,
      // Karya
      karya7d,
      karyaPrev7d,
      // AI
      aiGenerations7d,
    ] = await Promise.all([
      // User totals
      db.user.count(),
      db.user.count({ where: { role: "MURID" } }),
      db.user.count({ where: { role: "GURU" } }),

      // DAU (active today via XP)
      db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: todayStart } },
      }).then((r) => r.length),
      // WAU (active last 7 days)
      db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: weekAgo } },
      }).then((r) => r.length),
      // MAU (active last 30 days)
      db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: monthAgo } },
      }).then((r) => r.length),

      // DAU yesterday (for trend)
      db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      }).then((r) => r.length),
      // WAU previous week
      db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
      }).then((r) => r.length),
      // MAU previous month
      db.xPTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } },
      }).then((r) => r.length),

      // New users
      db.user.count({ where: { createdAt: { gte: weekAgo } } }),
      db.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      db.user.count({ where: { createdAt: { gte: monthAgo } } }),
      db.user.count({ where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

      // Premium
      db.user.count({
        where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
      }),
      db.user.count({
        where: { isPremium: true, premiumUntil: { gte: weekAgo }, isFounder: false },
      }).then((c) => c), // new premium-like in last 7d
      db.user.count({
        where: { isPremium: true, premiumUntil: { gte: monthAgo }, isFounder: false },
      }).then((c) => c),
      db.user.count({
        where: { isPremium: true, premiumUntil: { gt: weekAgo }, isFounder: false },
      }), // premium last week for trend

      // Revenue (last 30 days, successful only)
      db.transaksi.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS", createdAt: { gte: monthAgo } },
      }).then((r) => r._sum.amount || 0),
      db.transaksi.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS", createdAt: { gte: twoMonthsAgo, lt: monthAgo } },
      }).then((r) => r._sum.amount || 0),
      db.transaksi.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS" },
      }).then((r) => r._sum.amount || 0),

      // MRR: revenue from current calendar month vs previous calendar month
      db.transaksi.aggregate({
        _sum: { amount: true },
        where: {
          status: "SUCCESS",
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }).then((r) => r._sum.amount || 0),
      db.transaksi.aggregate({
        _sum: { amount: true },
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }).then((r) => r._sum.amount || 0),

      // Transaction counts
      db.transaksi.count({
        where: { status: "SUCCESS", createdAt: { gte: monthAgo } },
      }),
      db.transaksi.count({ where: { status: "PENDING" } }),

      // Learning
      db.userUnitProgress.count({
        where: { completed: true, completedAt: { gte: weekAgo } },
      }),
      db.userUnitProgress.count({
        where: { completed: true, completedAt: { gte: twoWeeksAgo, lt: weekAgo } },
      }),
      db.progresKompetensi.count({
        where: { startedAt: { gte: weekAgo } },
      }),

      // Karya
      db.studentKarya.count({ where: { createdAt: { gte: weekAgo } } }),
      db.studentKarya.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),

      // AI
      db.aIUsage.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    // ── Retention cohorts (4 weekly cohorts) ──
    const cohorts: { label: string; registered: number; active7d: number; active30d: number }[] = [];
    for (let w = 0; w < 4; w++) {
      const cohortStart = new Date(now.getTime() - (w + 1) * 7 * DAY_MS);
      const cohortEnd = new Date(now.getTime() - w * 7 * DAY_MS);
      const cohortUsers = await db.user.findMany({
        where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
        select: { id: true },
      });
      const ids = cohortUsers.map((u) => u.id);
      const registered = ids.length;
      if (registered === 0) {
        cohorts.push({ label: `W-${w + 1}`, registered: 0, active7d: 0, active30d: 0 });
        continue;
      }
      const [active7d, active30d] = await Promise.all([
        db.xPTransaction.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: cohortStart, lt: cohortEnd }, userId: { in: ids } },
        }).then((r) => r.length),
        db.xPTransaction.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: cohortEnd }, userId: { in: ids } },
        }).then((r) => r.length),
      ]);
      cohorts.push({ label: `W-${w + 1}`, registered, active7d, active30d });
    }

    // ── Derived metrics ──
    const premiumConversionRate = totalGuru > 0
      ? Math.round((activePremium / (totalGuru - 3)) * 100) // exclude founders
      : 0;

    const newUsers7dTrend = pctChange(newUsers7d, newUsersPrev7d);
    const newUsers30dTrend = pctChange(newUsers30d, newUsersPrev30d);
    const dauTrend = pctChange(dau, dauYesterday);
    const wauTrend = pctChange(wau, wauPrev);
    const mauTrend = pctChange(mau, mauPrev);
    const mrrTrend = pctChange(mrrCurrent, mrrPrev);
    const revenueTrend = pctChange(revenue30d, revenuePrev30d);
    const premiumTrend = pctChange(activePremium, activePremiumPrev);
    const jalurTrend = pctChange(jalurCompleted7d, jalurCompletedPrev7d);
    const karyaTrend = pctChange(karya7d, karyaPrev7d);

    const response = {
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        murid: totalMurid,
        guru: totalGuru,
      },
      active: {
        dau: { value: dau, trend: dauTrend },
        wau: { value: wau, trend: wauTrend },
        mau: { value: mau, trend: mauTrend },
      },
      growth: {
        new7d: { value: newUsers7d, trend: newUsers7dTrend },
        new30d: { value: newUsers30d, trend: newUsers30dTrend },
      },
      premium: {
        active: { value: activePremium, trend: premiumTrend },
        conversionRate: premiumConversionRate,
        new7d: newPremium7d,
        new30d: newPremium30d,
        trialActive: await db.user.count({
          where: { role: "GURU", trialEndsAt: { gt: now } },
        }),
      },
      revenue: {
        mrr: { value: mrrCurrent, trend: mrrTrend },
        last30d: { value: revenue30d, trend: revenueTrend },
        allTime: revenueAllTime,
        transactionsSuccess30d: txSuccess30d,
        transactionsPending: txPending,
      },
      learning: {
        jalurCompleted7d: { value: jalurCompleted7d, trend: jalurTrend },
        ukbiSessions7d,
      },
      content: {
        karya7d: { value: karya7d, trend: karyaTrend },
      },
      ai: {
        generations7d: aiGenerations7d,
      },
      retention: {
        cohorts,
      },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Executive analytics error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
