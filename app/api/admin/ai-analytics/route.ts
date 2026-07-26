import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";

const AGENT_LABELS: Record<string, string> = {
  rpp: "Rencana Pembelajaran",
  soal: "Soal",
  ppt: "PPT",
  review: "Review",
  "bc-assistant": "BC Asst",
  eyd: "EYD",
  feedback: "Feedback",
  grading: "Nilai",
  "text-analysis": "Analisis",
};

const LEGACY_FEATURES: { feature: string; label: string }[] = [
  { feature: "legacy:eyd", label: "EYD (Lama)" },
  { feature: "legacy:feedback", label: "Feedback (Lama)" },
  { feature: "legacy:grading", label: "Nilai (Lama)" },
  { feature: "legacy:text-analysis", label: "Analisis (Lama)" },
];

/** Matches feature names logged by usage-logger.ts as `agent:<agentId>` */
const AGENT_IDS = Object.keys(AGENT_LABELS);
const AGENT_FEATURE_PREFIX = "agent:";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "7d";
    const agentFilter = searchParams.get("agentId") || "";
    const providerFilter = searchParams.get("provider") || "";

    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const usageWhere: any = { createdAt: { gte: since } };
    if (agentFilter) usageWhere.feature = `${AGENT_FEATURE_PREFIX}${agentFilter}`;
    if (providerFilter) usageWhere.provider = providerFilter;

    const savedWhere: any = { createdAt: { gte: since } };
    if (agentFilter) savedWhere.agentId = agentFilter;

    // Overview aggregates — status in DB is lowercase "success" / "error"
    const [totalRequests, successCount, failedCount, latencyAgg, tokenAgg, savedResults, exportEvents] = await Promise.all([
      prisma.aIUsage.count({ where: usageWhere }),
      prisma.aIUsage.count({ where: { ...usageWhere, status: "success" } }),
      prisma.aIUsage.count({ where: { ...usageWhere, status: { not: "success" } } }),
      prisma.aIUsage.aggregate({ where: { ...usageWhere, latencyMs: { not: null } }, _avg: { latencyMs: true } }),
      prisma.aIUsage.aggregate({ where: usageWhere, _sum: { tokens: true, costUSD: true } }),
      prisma.aiSavedResult.count({ where: savedWhere }),
      prisma.aIUsage.count({ where: { ...usageWhere, feature: { startsWith: "ai_export_" } } }),
    ]);

    // Agent breakdown — feature stored as `agent:<agentId>`
    const agentUsagePromises = AGENT_IDS.map(async (agentId) => {
      const where = { ...usageWhere, feature: `${AGENT_FEATURE_PREFIX}${agentId}` };
      const [total, success, failed, latency, saved] = await Promise.all([
        prisma.aIUsage.count({ where }),
        prisma.aIUsage.count({ where: { ...where, status: "success" } }),
        prisma.aIUsage.count({ where: { ...where, status: { not: "success" } } }),
        prisma.aIUsage.aggregate({ where: { ...where, latencyMs: { not: null } }, _avg: { latencyMs: true } }),
        prisma.aiSavedResult.count({ where: { ...savedWhere, agentId } }),
      ]);
      return { agentId, label: AGENT_LABELS[agentId], totalRequests: total, success, failed, avgLatency: latency._avg.latencyMs, savedResults: saved };
    });
    const agentUsage = await Promise.all(agentUsagePromises);

    // Legacy route usage breakdown
    const legacyUsagePromises = LEGACY_FEATURES.map(async (legacy) => {
      const where = { ...usageWhere, feature: legacy.feature };
      const [total, success, failed, latency] = await Promise.all([
        prisma.aIUsage.count({ where }),
        prisma.aIUsage.count({ where: { ...where, status: "success" } }),
        prisma.aIUsage.count({ where: { ...where, status: { not: "success" } } }),
        prisma.aIUsage.aggregate({ where: { ...where, latencyMs: { not: null } }, _avg: { latencyMs: true } }),
      ]);
      return { feature: legacy.feature, label: legacy.label, totalRequests: total, success, failed, avgLatency: latency._avg.latencyMs };
    });
    const legacyUsage = (await Promise.all(legacyUsagePromises)).filter(l => l.totalRequests > 0);

    // Provider breakdown
    const providerList = ["deepseek", "groq", "gemini"];
    const providerUsagePromises = providerList.map(async (provider) => {
      const where = { ...usageWhere, provider };
      const [total, failed, latency, tokens] = await Promise.all([
        prisma.aIUsage.count({ where }),
        prisma.aIUsage.count({ where: { ...where, status: { not: "success" } } }),
        prisma.aIUsage.aggregate({ where: { ...where, latencyMs: { not: null } }, _avg: { latencyMs: true } }),
        prisma.aIUsage.aggregate({ where, _sum: { tokens: true } }),
      ]);
      return { provider, totalRequests: total, failed, avgLatency: latency._avg.latencyMs, totalTokens: tokens._sum.tokens || 0 };
    });
    // Handle records with null/unknown provider
    const unknownProviderCount = await prisma.aIUsage.count({
      where: { ...usageWhere, provider: null },
    });
    if (unknownProviderCount > 0) {
      providerList.push("unknown");
      providerUsagePromises.push(
        (async () => {
          const where = { ...usageWhere, provider: null };
          const [total, failed, latency, tokens] = await Promise.all([
            prisma.aIUsage.count({ where }),
            prisma.aIUsage.count({ where: { ...where, status: { not: "success" } } }),
            prisma.aIUsage.aggregate({ where: { ...where, latencyMs: { not: null } }, _avg: { latencyMs: true } }),
            prisma.aIUsage.aggregate({ where, _sum: { tokens: true } }),
          ]);
          return { provider: "unknown", totalRequests: total, failed, avgLatency: latency._avg.latencyMs, totalTokens: tokens._sum.tokens || 0 };
        })()
      );
    }
    const providerUsage = (await Promise.all(providerUsagePromises)).filter(p => p.totalRequests > 0);

    // Daily usage — raw query to group by date efficiently
    let dailyUsage: { date: string; count: number }[] = [];
    try {
      const rows: { date: Date | string; count: bigint }[] = await prisma.$queryRawUnsafe(
        `SELECT DATE(created_at) as date, COUNT(*)::int as count FROM "AIUsage" WHERE created_at >= $1 GROUP BY DATE(created_at) ORDER BY date ASC`,
        since
      );
      dailyUsage = rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        count: Number(r.count),
      }));
    } catch {
      // Fallback: load rows and group in-memory
      const fallback = await prisma.aIUsage.findMany({ where: usageWhere, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1000 });
      const map = new Map<string, number>();
      for (const r of fallback) {
        const d = r.createdAt.toISOString().slice(0, 10);
        map.set(d, (map.get(d) || 0) + 1);
      }
      dailyUsage = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
    }

    // System notes (declared early so defensive catch blocks can push to it)
    const notes: string[] = [];

    // Top users (defensive — inner groupBy can fail if feature filter mismatches)
    let topUsers: { userId: string; fullName: string; email: string; totalUsage: number; mostUsedAgent: string }[] = [];
    try {
      const userUsageAgg = await prisma.aIUsage.groupBy({
        by: ["userId"],
        where: usageWhere,
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      });
      const userIds = userUsageAgg.map(u => u.userId).filter(Boolean) as string[];
      const userProfiles: { id: string; fullName: string; email: string }[] = userIds.length > 0
        ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        })
        : [];
      const userMap = new Map(userProfiles.map(u => [u.id, u]));

      topUsers = await Promise.all(
        userUsageAgg.map(async (u) => {
          const profile = userMap.get(u.userId);
          const agentFeatures = AGENT_IDS.map(a => `${AGENT_FEATURE_PREFIX}${a}`);
          const agentAgg = await prisma.aIUsage.groupBy({
            by: ["feature"],
            where: { userId: u.userId, createdAt: { gte: since }, feature: { in: agentFeatures } },
            _count: { feature: true },
            orderBy: { _count: { feature: "desc" } },
            take: 1,
          });
          const mostUsedAgent = agentAgg[0]?.feature?.replace(AGENT_FEATURE_PREFIX, "") || "";
          return {
            userId: u.userId,
            fullName: profile?.fullName || "—",
            email: profile?.email || "—",
            totalUsage: u._count.userId,
            mostUsedAgent,
          };
        })
      );
    } catch {
      console.error("Top users query failed (non-fatal):");
      notes.push("Data pengguna paling aktif tidak tersedia.");
    }

    // Saved results by agent
    const savedByAgent = await Promise.all(
      AGENT_IDS.map(async (agentId) => {
        const count = await prisma.aiSavedResult.count({ where: { ...savedWhere, agentId } });
        return { agentId, label: AGENT_LABELS[agentId], count };
      })
    );

    // Recent saved results
    const recentSavedResults = await prisma.aiSavedResult.findMany({
      where: savedWhere,
      select: {
        id: true,
        title: true,
        agentId: true,
        createdAt: true,
        qualityScore: true,
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Error insights (defensive)
    let errors: { code: string; count: number }[] = [];
    try {
      const errorAgg = await prisma.aIUsage.groupBy({
        by: ["errorCode"],
        where: { ...usageWhere, errorCode: { not: null }, status: { not: "success" } },
        _count: { errorCode: true },
        orderBy: { _count: { errorCode: "desc" } },
      });
      errors = errorAgg
        .filter((e): e is typeof e & { errorCode: string } => e.errorCode !== null)
        .map(e => ({ code: e.errorCode, count: e._count.errorCode }));
    } catch {
      console.error("Error insights query failed (non-fatal):");
      notes.push("Data insight error tidak tersedia.");
    }

    const recentErrors = await prisma.aIUsage.count({
      where: { createdAt: { gte: since }, status: { not: "success" } },
    });
    const totalWithRange = await prisma.aIUsage.count({ where: { createdAt: { gte: since } } });
    const rateLimitHits = await prisma.aIUsage.count({
      where: { createdAt: { gte: since }, errorCode: "RATE_LIMIT" },
    });

    if (totalWithRange === 0) {
      notes.push("Belum ada penggunaan AI dalam periode ini.");
    } else {
      const successRate = totalWithRange > 0 ? ((totalWithRange - recentErrors) / totalWithRange * 100).toFixed(1) : "0";
      notes.push(`Tingkat keberhasilan keseluruhan: ${successRate}% (${totalWithRange - recentErrors} dari ${totalWithRange} request).`);
      if (rateLimitHits > 0) notes.push(`Rate limit tercapai ${rateLimitHits}x — pertimbangkan throttle atau upgrade provider.`);
      if (recentErrors > 10) notes.push(`Lebih dari ${recentErrors} error dalam ${range} — review log untuk penyebab utama.`);
      if (totalWithRange > 100) notes.push(`Volume penggunaan tinggi (${totalWithRange} request) — pantau biaya dan latency.`);
      if (providerUsage.length === 0) notes.push("Data provider tidak tersedia — periksa logging AIUsage.");

      // Phase 9B — estimated AI Gateway credit usage
      try {
        const agentCosts: Record<string, number> = { rpp: 5, soal: 3, ppt: 5, review: 2, "bc-assistant": 1, eyd: 1, feedback: 2, grading: 2, "text-analysis": 2 };
        const creditFeatureIds = Object.keys(agentCosts).map(id => `agent:${id}`);
        const creditUsageAgg = await prisma.aIUsage.groupBy({
          by: ["feature"],
          where: { ...usageWhere, feature: { in: creditFeatureIds }, status: "success" },
          _count: { feature: true },
        });
        let estimatedCredits = 0;
        const perAgent: Record<string, number> = {};
        for (const row of creditUsageAgg) {
          const agentId = row.feature.replace("agent:", "");
          const cost = agentCosts[agentId] ?? 2;
          const count = row._count.feature;
          perAgent[agentId] = (perAgent[agentId] ?? 0) + count;
          estimatedCredits += cost * count;
        }
        if (estimatedCredits > 0) {
          notes.push(`Estimasi kredit AI: ~${estimatedCredits} kredit dalam ${range}.`);
          const sorted = Object.entries(perAgent).sort((a, b) => b[1] - a[1]).slice(0, 3);
          notes.push(`Agent paling sering digunakan: ${sorted.map(([id, c]) => `${AGENT_LABELS[id] || id} (${c}x)`).join(", ")}.`);
        }
      } catch {
        // silently skip gateway notes
      }

      // Phase 9C — trial stats
      try {
        const activeTrials = await prisma.user.count({
          where: { trialEndsAt: { gt: new Date() }, role: "GURU", isPremium: false },
        });
        const expiringSoon = await prisma.user.count({
          where: {
            trialEndsAt: { gt: new Date(), lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            role: "GURU",
            isPremium: false,
          },
        });
        if (activeTrials > 0) notes.push(`Guru Pro Trial aktif: ${activeTrials} pengguna.`);
        if (expiringSoon > 0) notes.push(`${expiringSoon} trial akan berakhir dalam 7 hari.`);
      } catch {
        // silently skip trial notes
      }

      // Phase 9D — hard mode & credit usage notes
      try {
        const isHardModeActive = process.env.AI_CREDIT_HARD_MODE === "true" || process.env.NODE_ENV === "production";
        notes.push(`Mode kredit: ${isHardModeActive ? "KERAS (pemblokiran aktif)" : "LUNAK (hanya peringatan)"}.`);

        // Total credits used this month
        const thisMonth = new Date().toISOString().slice(0, 7);
        const ledgerAgg = await prisma.aiCreditLedger.aggregate({
          where: { period: thisMonth },
          _sum: { creditsUsed: true, creditsTotal: true },
        });
        const totalCreditsUsed = ledgerAgg._sum.creditsUsed || 0;
        const totalCreditsAvailable = ledgerAgg._sum.creditsTotal || 0;
        if (totalCreditsUsed > 0) {
          notes.push(`Total kredit terpakai bulan ini: ${totalCreditsUsed} dari ${totalCreditsAvailable}.`);
        }

        // Users with 0 credits remaining — use raw query
        try {
          const zeroRemaining = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
            `SELECT COUNT(*)::int as count FROM "AiCreditLedger" WHERE period = $1 AND "creditsUsed" >= "creditsTotal"`,
            thisMonth
          );
          const zeroCount = Number(zeroRemaining[0]?.count ?? 0);
          if (zeroCount > 0) notes.push(`${zeroCount} pengguna kehabisan kredit bulan ini.`);
        } catch {
          // skip
        }

        // Top credit consumers
        const topConsumers = await prisma.$queryRawUnsafe<{ userId: string; used: bigint }[]>(
          `SELECT "userId", "creditsUsed" as used FROM "AiCreditLedger" WHERE period = $1 ORDER BY "creditsUsed" DESC LIMIT 3`,
          thisMonth
        );
        if (topConsumers.length > 0) {
          const userIds = topConsumers.map(r => r.userId).filter(Boolean) as string[];
          const profiles = userIds.length > 0
            ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
            : [];
          const profileMap = new Map(profiles.map(p => [p.id, p.fullName]));
          const topList = topConsumers.map(r => `${profileMap.get(r.userId) || r.userId.slice(0, 8)} (${r.used} kredit)`).join(", ");
          notes.push(`Konsumen kredit terbanyak: ${topList}.`);
        }
      } catch {
        // silently skip Phase 9D notes
      }
    }

    const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRequests,
          successCount,
          failedCount,
          successRate,
          avgLatency: latencyAgg._avg.latencyMs,
          savedResults,
          exportEvents,
          totalTokens: tokenAgg._sum.tokens || 0,
          estimatedCost: tokenAgg._sum.costUSD || 0,
        },
        agentUsage,
        legacyUsage,
        providerUsage,
        dailyUsage,
        topUsers,
        savedResultsByAgent: savedByAgent,
        recentSavedResults,
        errors,
        notes,
      },
    });
  } catch (err: any) {
    console.error("AI Analytics API error:", err);
    return NextResponse.json({
      success: false,
      error: "Data AI Analytics belum bisa dimuat. Silakan coba lagi.",
      code: "AI_ANALYTICS_QUERY_FAILED",
    }, { status: 500 });
  }
}
