import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import cache from "@/lib/redis"
import LeagueTabs, { type LeagueRow } from "./league-tabs"

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
        select: { id: true, fullName: true, avatar: true, xp: true, level: true, coins: true, streak: true },
      }) as Promise<LeagueRow[]>,
    300),
    cache.getOrSet<LeagueRow[]>("league:harian:top50", async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dailyResults = await db.gameResult.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: today }, user: { role: "MURID" } },
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 50,
      })
      const userIds = dailyResults.map(r => r.userId).filter(Boolean)
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, avatar: true, xp: true, level: true, coins: true, streak: true },
      })
      const userMap = Object.fromEntries(users.map(u => [u.id, u]))
      return dailyResults
        .map(r => ({ ...userMap[r.userId], id: r.userId, todayXP: r._sum.xpEarned || 0 }))
        .filter(u => u.fullName) as LeagueRow[]
    }, 300),
  ])

  const weeklyRank = weeklyRows.findIndex(u => u.id === user.id) + 1
  const dailyRank = dailyRows.findIndex(u => u.id === user.id) + 1
  const dailyMyXP = dailyRows.find(u => u.id === user.id)?.todayXP || 0

  return (
    <div className="px-4 py-5 arena-page">
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Liga</h1>
      <p className="text-sm text-gray-500 mb-5">Peringkat — 50 murid teratas</p>

      <LeagueTabs
        weekly={{ rows: weeklyRows, myRank: weeklyRank, myXP: user.xp || 0 }}
        daily={{ rows: dailyRows, myRank: dailyRank, myXP: dailyMyXP }}
        userId={user.id}
        userXP={user.xp || 0}
        initialTab={initialTab}
      />
    </div>
  )
}
