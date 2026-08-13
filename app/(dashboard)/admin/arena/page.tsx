import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { RANK_META } from "@/lib/gamification/ranks";
import type { PlayerRank } from "@prisma/client";
import { Trophy, Zap, Coins, Medal, Users, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminArenaPage() {
  const user = await getUser();
  if (!user || (user.role !== "ADMIN" && !user.isFounder)) redirect("/login");

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    profileCount,
    totalXpAgg,
    totalXpTx,
    xpToday,
    activeToday,
    rankAgg,
    xpBySource,
    topRankUser,
    topXpUsers,
    topStreakUsers,
    badgeCount,
    badgeAwardCount,
    achCount,
    achCompleted,
    achClaimed,
  ] = await Promise.all([
    db.playerProfile.count(),
    db.playerProfile.aggregate({ _sum: { totalXP: true, coin: true } }),
    db.xPTransaction.count(),
    db.xPTransaction.count({ where: { createdAt: { gte: dayAgo } } }),
    db.playerProfile.count({ where: { lastActiveAt: { gte: dayAgo } } }),
    db.playerProfile.groupBy({ by: ["currentRank"], _count: { _all: true } }),
    db.xPTransaction.groupBy({ by: ["source"], _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 8 }),
    db.playerProfile.findFirst({ orderBy: { level: "desc" }, include: { user: { select: { fullName: true } } } }),
    db.playerProfile.findMany({ take: 5, orderBy: { totalXP: "desc" }, include: { user: { select: { fullName: true } } } }),
    db.playerProfile.findMany({ take: 5, orderBy: { streak: "desc" }, include: { user: { select: { fullName: true } } } }),
    db.badge.count(),
    db.userBadge.count(),
    db.achievement.count(),
    db.userAchievement.count({ where: { completed: true } }),
    db.userAchievement.count({ where: { claimed: true } }),
  ]);

  const totalXp = totalXpAgg._sum.totalXP ?? 0;
  const totalCoins = totalXpAgg._sum.coin ?? 0;

  const rankDistribution = rankAgg.map((r) => ({
    rank: r.currentRank,
    label: RANK_META[r.currentRank as PlayerRank]?.label ?? r.currentRank,
    color: RANK_META[r.currentRank as PlayerRank]?.color ?? "#64748b",
    count: r._count._all,
  }));
  rankDistribution.sort((a, b) => b.count - a.count);

  const maxRankCount = Math.max(1, ...rankDistribution.map((r) => r.count));

  const card = (title: string, value: string, sub: string, icon: React.ReactNode, accent: string) => (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Arena BC — Gamifikasi</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Statistik PlayerProfile, XP, koin, badge & achievement universal.</p>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {card("Total Pemain", profileCount.toLocaleString("id-ID"), "PlayerProfile terdaftar", <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />, "bg-emerald-50 dark:bg-emerald-950/40")}
        {card("Total XP", totalXp.toLocaleString("id-ID"), `${xpToday.toLocaleString("id-ID")} transaksi hari ini`, <Zap className="h-6 w-6 text-amber-500 dark:text-amber-400" />, "bg-amber-50 dark:bg-amber-950/40")}
        {card("Total Koin", totalCoins.toLocaleString("id-ID"), "Saldo koin seluruh pemain", <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />, "bg-yellow-50 dark:bg-yellow-950/40")}
        {card("Aktif 24 Jam", activeToday.toLocaleString("id-ID"), "Pemain lastActiveAt hari ini", <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-400" />, "bg-violet-50 dark:bg-violet-950/40")}
      </div>

      {/* Distribusi rank */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Distribusi Peringkat</h2>
        <div className="mt-4 space-y-3">
          {rankDistribution.map((r) => (
            <div key={r.rank} className="flex items-center gap-3">
              <span className="w-28 text-sm font-medium text-slate-700 dark:text-slate-200" style={{ color: r.color }}>
                {r.label}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/70">
                <div className="h-full rounded-full" style={{ width: `${(r.count / maxRankCount) * 100}%`, backgroundColor: r.color }} />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">{r.count}</span>
            </div>
          ))}
          {rankDistribution.length === 0 && <p className="text-sm text-slate-400">Belum ada pemain.</p>}
        </div>
      </div>

      {/* Papan teratas + XP per sumber */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Trophy className="h-5 w-5 text-amber-500 dark:text-amber-400" /> Pemain Teratas (Total XP)
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {topXpUsers.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700 dark:text-amber-300" : "bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.user.fullName}</p>
                    <p className="text-xs text-slate-400">Level {p.level} • {RANK_META[p.currentRank]?.label ?? p.currentRank}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{p.totalXP.toLocaleString("id-ID")} XP</span>
              </div>
            ))}
            {topXpUsers.length === 0 && <p className="py-3 text-sm text-slate-400">Belum ada data.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Medal className="h-5 w-5 text-violet-500 dark:text-violet-400" /> Streak Terpanjang
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {topStreakUsers.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-orange-100 text-orange-700 dark:text-orange-300" : "bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300"}`}>
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.user.fullName}</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                  🔥 {p.streak} hari
                </span>
              </div>
            ))}
            {topStreakUsers.length === 0 && <p className="py-3 text-sm text-slate-400">Belum ada data.</p>}
          </div>
        </div>
      </div>

      {/* XP per sumber */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">XP per Sumber</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {xpBySource.map((r) => (
            <div key={r.source} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{r.source}</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-200">{(r._sum.amount ?? 0).toLocaleString("id-ID")}</p>
              <p className="text-xs text-slate-400">XP</p>
            </div>
          ))}
          {xpBySource.length === 0 && <p className="col-span-full text-sm text-slate-400">Belum ada transaksi XP.</p>}
        </div>
      </div>

      {/* Badge & Achievement */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Lencana</h2>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">{badgeCount}</span> definisi badge</p>
            <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">{badgeAwardCount}</span> badge diberikan ke pemain</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Achievement</h2>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">{achCount}</span> definisi achievement</p>
            <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">{achCompleted}</span> selesai oleh pemain</p>
            <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">{achClaimed}</span> reward diklaim</p>
          </div>
        </div>
      </div>
    </div>
  );
}
