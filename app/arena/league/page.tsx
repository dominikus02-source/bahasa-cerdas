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

  const [weeklyRows, dailyRows] = await Promise.all([
    cache.getOrSet<LeagueRow[]>("league:mingguan:top50", async () =>
      db.user.findMany({
        where: { role: "MURID", xp: { gt: 0 } },
        orderBy: { xp: "desc" },
        take: 50,
        select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true, coins: true, streak: true },
      }) as Promise<LeagueRow[]>,
    300),
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
  ])

  return (
    <div className="arena-page max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Papan Peringkat</h1>
        <p className="text-sm text-gray-500 mt-1">Bersaing dengan siswa lain dan dapatkan hadiah</p>
      </div>
      <LeagueTabs
        weekly={{ rows: weeklyRows, myRank: weeklyRows.findIndex(r => r.id === user.id) + 1, myXP: user.xp || 0 }}
        daily={{ rows: dailyRows, myRank: dailyRows.findIndex(r => r.id === user.id) + 1, myXP: user.coins || 0 }}
        userId={user.id}
        userXP={user.xp || 0}
        initialTab={initialTab}
      />
    </div>
  )
}
