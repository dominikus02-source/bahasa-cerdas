import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import cache from "@/lib/redis"
import { Crown, Trophy, Zap, Clock } from "lucide-react"
import LeagueTabs, { type LeagueRow, type HallOfFameRow } from "./league-tabs"
import { getLeaderboard } from "@/lib/gamification/leaderboard"
import { getWeeklyCompetition } from "@/lib/gamification/motivation"
import CompetitionHero from "@/components/arena/player/CompetitionHero"
import WeeklyCountdown from "@/components/arena/player/WeeklyCountdown"

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
      const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true, coins: true, streak: true, isFounder: true, isPremium: true } })
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
    isFounder: e.isFounder,
    isPremium: e.isPremium,
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

  // ARENA 4.2 — canvas desktop-first: root memakai canvas 1280px penuh dari
  // layout (tanpa max-w-* legacy). Header kompetitif ringkas membuat peringkat
  // sekarang langsung terlihat; CompetitionHero + LeagueTabs tetap full-width.
  const myRank = meWeekly?.rank ?? weeklyRows.length + 1
  const myWeeklyXP = meWeekly?.score ?? 0

  // Daily leaderboard is based on coins earned today — compute user's daily total.
  const myDailyEntry = dailyRows.find(r => r.id === user.id)
  const myDailyXP = (myDailyEntry as any)?.todayXP ?? 0

  return (
    <div className="arena-page space-y-6 p-4 md:p-6">
      {/* ARENA / LEAGUE HEADER — light premium, violet-tinted, ringkas */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-900 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-5 py-5 md:px-7 md:py-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            <Trophy className="h-3.5 w-3.5" /> Liga
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 md:text-3xl">
            Liga Minggu Ini
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Kompetisi mingguan untuk membuktikan kemampuanmu.</p>

          {/* Status kilat — peringkat sekarang, XP minggu ini, countdown */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" /> Peringkatmu #{myRank}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700 dark:text-violet-300">
              <Zap className="h-3.5 w-3.5" /> {myWeeklyXP.toLocaleString("id-ID")} XP minggu ini
            </span>
            {competition && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-3 py-1.5 text-gray-600">
                <Clock className="h-3.5 w-3.5" />
                Berakhir <WeeklyCountdown endsAt={competition.periodEndsAt} baseline={competition.now} />
              </span>
            )}
          </div>
        </div>
      </section>

      {/* COMPETITION STATUS — status penuh + podium + gap + sumber XP */}
      {competition && <CompetitionHero payload={competition} />}

      {/* LEADERBOARD + YOUR POSITION — papan penuh canvas (tab Mingguan/Harian/HoF) */}
      <LeagueTabs
        weekly={{ rows: weeklyRows, myRank, myXP: myWeeklyXP }}
        daily={{ rows: dailyRows, myRank: dailyRows.findIndex(r => r.id === user.id) + 1, myXP: myDailyXP }}
        hallOfFame={hallOfFame}
        userId={user.id}
        userXP={user.xp || 0}
        initialTab={initialTab}
      />

      {/* HOW IT WORKS */}
      <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 p-4 text-xs text-violet-800 md:p-5">
        <p className="mb-1.5 font-bold">Cara kerja XP</p>
        <ul className="space-y-1 list-disc pl-4 md:columns-2 md:space-y-1.5">
          <li>Papan XP mingguan mulai dari nol setiap Senin pukul 00.00 WIB.</li>
          <li>Musim baru dimulai setiap 4 minggu — perebutan juara musim juga mulai dari nol.</li>
          <li>XP total, level, dan pangkatmu tidak pernah direset.</li>
          <li>Juara 1-3 tiap minggu &amp; season otomatis masuk Hall of Fame dan mendapat hadiah.</li>
        </ul>
      </div>
    </div>
  )
}
