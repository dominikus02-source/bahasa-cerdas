import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import cache from "@/lib/redis"
import LeagueTabs, { type LeagueRow, type HallOfFameRow } from "./league-tabs"
import { getLeaderboard } from "@/lib/gamification/leaderboard"
import { getWeeklyCompetition } from "@/lib/gamification/motivation"
import CompetitionHero from "@/components/arena/player/CompetitionHero"

export const dynamic = "force-dynamic"

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  const { tab } = await searchParams
  const initialTab: "harian" | "mingguan" | "hall-of-fame" =
    tab === "harian" ? "harian" : tab === "hall-of-fame" ? "hall-of-fame" : "mingguan"

  // Papan "Mingguan" memakai PlayerProfile.weeklyXP (mulai dari nol setiap Senin
  // 00:00 WIB), bukan XP seumur hidup. Engine getLeaderboard sudah filter role
  // MURID + isMe sehingga papan ini khusus murid.
  const [weeklyEntries, dailyRows, competition] = await Promise.all([
    getLeaderboard({ scope: "GLOBAL", period: "WEEKLY", userId: user.id, limit: 50 }),
    cache.getOrSet<LeagueRow[]>("league:harian:v2:top50", async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const earned = await db.coinTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: today }, amount: { gt: 0 }, user: { role: "MURID" } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 50,
      })
      const userIds = earned.map(e => e.userId)
      if (userIds.length === 0) return []
      const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true, coins: true, streak: true } })
      return earned.map(e => {
        const u = users.find(us => us.id === e.userId)
        if (!u) return null
        return { ...u, todayXP: e._sum.amount || 0 }
      }).filter(Boolean) as LeagueRow[]
    }, 120),
    getWeeklyCompetition(user.id).catch(() => null),
  ])

  const meWeekly = weeklyEntries.find(e => e.isMe)
  const weeklyRows: LeagueRow[] = weeklyEntries.map(e => ({
    id: e.userId,
    fullName: e.name,
    nickname: e.nickname,
    avatar: e.avatar,
    xp: e.score,
    level: e.level,
    streak: 0,
  }))

  const hallOfFame: HallOfFameRow[] = (competition?.hallOfFame ?? []).map(h => ({
    periodLabel: h.periodLabel,
    periodType: h.periodType,
    rank: h.rank,
    name: h.name,
    score: h.score,
    badgeCode: h.badgeCode,
    settledAt: h.settledAt.toISOString(),
  }))

  return (
    <div className="arena-page max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Papan Peringkat</h1>
        <p className="text-sm text-gray-500 mt-1">Bersaing dengan siswa lain dan dapatkan hadiah</p>
      </div>

      {competition && <CompetitionHero payload={competition} />}

      <div className="mt-4">
        <LeagueTabs
          weekly={{ rows: weeklyRows, myRank: meWeekly?.rank ?? weeklyRows.length + 1, myXP: meWeekly?.score ?? 0 }}
          daily={{ rows: dailyRows, myRank: dailyRows.findIndex(r => r.id === user.id) + 1, myXP: user.coins || 0 }}
          hallOfFame={hallOfFame}
          userId={user.id}
          userXP={user.xp || 0}
          initialTab={initialTab}
        />
      </div>

      <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-4 text-xs text-violet-800">
        <p className="font-bold mb-1.5">Cara kerja XP</p>
        <ul className="space-y-1 list-disc pl-4">
          <li>Papan XP mingguan mulai dari nol setiap Senin pukul 00.00 WIB.</li>
          <li>Musim baru dimulai setiap 4 minggu — perebutan juara musim juga mulai dari nol.</li>
          <li>XP total, level, dan pangkatmu tidak pernah direset.</li>
          <li>Juara 1-3 tiap minggu &amp; season otomatis masuk Hall of Fame dan mendapat hadiah.</li>
        </ul>
      </div>
    </div>
  )
}
