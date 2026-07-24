import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import cache from "@/lib/redis"
import LeagueTabs, { type LeagueRow } from "./league-tabs"
import { getDisplayName } from "@/lib/nickname"

export const dynamic = "force-dynamic"

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const { tab } = await searchParams
  const initialTab: "harian" | "mingguan" = tab === "harian" ? "harian" : "mingguan"

  // Both datasets are fetched up-front (cached) so the client can switch tabs
  // in place — no navigation, no reload, instant.
  const [weeklyRows, dailyRows] = await Promise.all([
    cache.getOrSet<LeagueRow[]>("league:mingguan:top50", async () =>
      db.user.findMany({
        where: { role: "MURID", xp: { gt: 0 } },
        orderBy: { xp: "desc" },
        take: 50,
        select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true, coins: true, streak: true },
      }) as Promise<LeagueRow[]>,
    300),
    // Daily board = coins earned today.
    //
    // This used to aggregate GameResult.xpEarned, but GameResult only ever gets
    // written by the multiplayer game server, which is offline and gated off —
    // the table holds zero rows, so the daily tab was permanently empty while
    // the weekly tab worked. CoinTransaction is the ledger that daily activity
    // actually writes to (writing karya, likes, comments, quests): 833 entries
    // across 69 students on the day this was changed.
    cache.getOrSet<LeagueRow[]>("league:harian:v2:top50", async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const earned = await db.coinTransaction.groupBy({
        by: ["userId"],
        // Positive only: spending in the shop must not count as achievement.
        where: { createdAt: { gte: today }, amount: { gt: 0 }, user: { role: "MURID" } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 50,
      })
      const userIds = earned.map(r => r.userId).filter(Boolean)
      if (userIds.length === 0) return []
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true, coins: true, streak: true },
      })
      const userMap = Object.fromEntries(users.map(u => [u.id, u]))
      return earned
        .map(r => ({ ...userMap[r.userId], id: r.userId, todayXP: r._sum.amount || 0 }))
        .filter(u => u.fullName) as LeagueRow[]
    }, 300),
  ])

  const weeklyRank = weeklyRows.findIndex(u => u.id === user.id) + 1
  const dailyRank = dailyRows.findIndex(u => u.id === user.id) + 1
  const dailyMyXP = dailyRows.find(u => u.id === user.id)?.todayXP || 0

  // Guru always sees real names; a murid viewing papan sekolah only sees the
  // nickname layer. Rows are cached viewer-independent, so displayName is
  // computed per request instead of baked into the cache.
  const isGuruViewer = user.role === "GURU" || user.isFounder
  const withDisplay = (rows: LeagueRow[]) =>
    rows.map((r) => ({ ...r, displayName: isGuruViewer ? r.fullName : getDisplayName(r, "peer") }))

  return (
    <div className="px-4 py-5 arena-page">
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Liga</h1>
      <p className="text-sm text-gray-500 mb-5">Peringkat — 50 murid teratas</p>

      <LeagueTabs
        weekly={{ rows: withDisplay(weeklyRows), myRank: weeklyRank, myXP: user.xp || 0 }}
        daily={{ rows: withDisplay(dailyRows), myRank: dailyRank, myXP: dailyMyXP }}
        userId={user.id}
        userXP={user.xp || 0}
        initialTab={initialTab}
      />
    </div>
  )
}
