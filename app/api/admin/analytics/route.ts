import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

async function getWeeklyGrowth(table: string, dateField: string, weeks: number) {
  const data: { week: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    let count = 0;
    if (table === "user") {
      count = await db.user.count({ where: { createdAt: { gte: start, lt: end } } });
    } else if (table === "studentKarya") {
      count = await db.studentKarya.count({ where: { createdAt: { gte: start, lt: end } } });
    } else if (table === "video") {
      count = await db.video.count({ where: { createdAt: { gte: start, lt: end } } });
    } else if (table === "artikel") {
      count = await db.artikel.count({ where: { createdAt: { gte: start, lt: end } } });
    } else if (table === "pembelian") {
      count = await db.pembelian.count({ where: { createdAt: { gte: start, lt: end }, status: "PAID" } });
    }

    const label = start.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    data.push({ week: label, count });
  }
  return data;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalKarya,
      totalVideo,
      totalArtikel,
      totalPembelian,
      userThisWeek,
      userLastWeek,
      karyaThisWeek,
      karyaLastWeek,
      videoThisWeek,
      videoLastWeek,
      artikelThisWeek,
      artikelLastWeek,
      pembelianThisWeek,
      pembelianLastWeek,
      pendingKomunitas,
      pendingLoker,
      userGrowth,
      totalRevenue,
      pendingWithdrawals,
      recentUsers,
      popularKarya,
      popularVideo,
      popularArtikel,
    ] = await Promise.all([
      db.user.count(),
      db.studentKarya.count(),
      db.video.count({ where: { isPublished: true } }),
      db.artikel.count({ where: { isPublished: true } }),
      db.pembelian.count({ where: { status: "PAID" } }),

      db.user.count({ where: { createdAt: { gte: weekAgo } } }),
      db.user.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.studentKarya.count({ where: { createdAt: { gte: weekAgo } } }),
      db.studentKarya.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.video.count({ where: { createdAt: { gte: weekAgo } } }),
      db.video.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.artikel.count({ where: { createdAt: { gte: weekAgo } } }),
      db.artikel.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.pembelian.count({ where: { createdAt: { gte: weekAgo }, status: "PAID" } }),
      db.pembelian.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo }, status: "PAID" } }),

      db.community.count({ where: { status: "PENDING" } }),
      db.loker.count({ where: { isApproved: false } }),

      db.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),

      db.pembelian.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),

      db.withdrawal.findMany({ where: { status: "PENDING" }, select: { amount: true }, take: 50 }),

      db.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, email: true, role: true, isPremium: true, createdAt: true } }),

      db.studentKarya.findMany({ take: 5, orderBy: { likesCount: "desc" }, select: { id: true, title: true, likesCount: true, viewsCount: true, createdAt: true } }),

      db.video.findMany({ take: 5, orderBy: { views: "desc" }, select: { id: true, title: true, views: true, createdAt: true } }),

      db.artikel.findMany({ take: 5, orderBy: { readCount: "desc" }, select: { id: true, title: true, slug: true, readCount: true, createdAt: true } }),
    ]);

    const userTrend = await getWeeklyGrowth("user", "createdAt", 12);
    const karyaTrend = await getWeeklyGrowth("studentKarya", "createdAt", 12);
    const videoTrend = await getWeeklyGrowth("video", "createdAt", 12);
    const artikelTrend = await getWeeklyGrowth("artikel", "createdAt", 12);
    const revenueTrend = await getWeeklyGrowth("pembelian", "createdAt", 12);

    const pct = (current: number, prev: number) =>
      prev === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - prev) / prev) * 100);

    const totalWithdrawalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    return NextResponse.json({
      totals: { users: totalUsers, karya: totalKarya, video: totalVideo, artikel: totalArtikel, pembelian: totalPembelian, revenue: totalRevenue._sum.amount || 0, withdrawalPending: totalWithdrawalPending },
      trends: {
        user: { thisWeek: userThisWeek, lastWeek: userLastWeek, pct: pct(userThisWeek, userLastWeek), weekly: userTrend },
        karya: { thisWeek: karyaThisWeek, lastWeek: karyaLastWeek, pct: pct(karyaThisWeek, karyaLastWeek), weekly: karyaTrend },
        video: { thisWeek: videoThisWeek, lastWeek: videoLastWeek, pct: pct(videoThisWeek, videoLastWeek), weekly: videoTrend },
        artikel: { thisWeek: artikelThisWeek, lastWeek: artikelLastWeek, pct: pct(artikelThisWeek, artikelLastWeek), weekly: artikelTrend },
        revenue: { thisWeek: pembelianThisWeek, lastWeek: pembelianLastWeek, pct: pct(pembelianThisWeek, pembelianLastWeek), weekly: revenueTrend },
      },
      pending: {
        komunitas: pendingKomunitas,
        loker: pendingLoker,
        withdrawals: pendingWithdrawals.length,
      },
      growth: { today: userGrowth },
      recentUsers,
      popular: {
        karya: popularKarya,
        video: popularVideo,
        artikel: popularArtikel,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
