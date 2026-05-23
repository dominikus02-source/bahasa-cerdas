import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, Medal, Crown, Diamond, TrendingUp, ChevronRight } from "lucide-react"

const TIER_ICON: Record<string, React.ReactNode> = {
  BRONZE: <Medal className="w-8 h-8 text-amber-700" />,
  SILVER: <Medal className="w-8 h-8 text-slate-400" />,
  GOLD: <Crown className="w-8 h-8 text-yellow-500" />,
  DIAMOND: <Diamond className="w-8 h-8 text-cyan-400" />,
}
const TIER_COLOR: Record<string, string> = {
  BRONZE: "from-amber-700 to-amber-600", SILVER: "from-slate-400 to-slate-300",
  GOLD: "from-yellow-500 to-amber-500", DIAMOND: "from-cyan-400 to-blue-500",
}
const TIER_LABEL: Record<string, string> = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }

export default async function LeaguePage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const topUsers = await db.user.findMany({
    where: { role: "MURID", xp: { gt: 0 } },
    orderBy: { xp: "desc" },
    take: 50,
    select: { id: true, fullName: true, avatar: true, xp: true, level: true, coins: true, streak: true },
  })

  const myRank = topUsers.findIndex(u => u.id === user.id) + 1
  const userTier = user.xp >= 10000 ? "DIAMOND" : user.xp >= 5000 ? "GOLD" : user.xp >= 2000 ? "SILVER" : "BRONZE"
  const nextTierXP = userTier === "BRONZE" ? 2000 : userTier === "SILVER" ? 5000 : userTier === "GOLD" ? 10000 : null
  const nextTierName = userTier === "BRONZE" ? "Perak" : userTier === "SILVER" ? "Emas" : userTier === "GOLD" ? "Berlian" : null

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Liga</h1>
      <p className="text-sm text-gray-500 mb-5">Peringkat mingguan — 50 murid teratas</p>

      {/* Kartu peringkatku */}
      <div className={`bg-gradient-to-br ${TIER_COLOR[userTier]} rounded-2xl p-4 mb-6 shadow-lg`}>
        <div className="flex items-center gap-3">
          <div>{TIER_ICON[userTier]}</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-white">Peringkat #{myRank || "-"}</p>
            <p className="text-sm text-white/80">{user.xp?.toLocaleString() || 0} XP</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70 uppercase tracking-wider">{TIER_LABEL[userTier]}</p>
            {nextTierXP && nextTierName && (
              <p className="text-[10px] text-white/60">{nextTierXP - (user.xp || 0)} XP lagi ke {nextTierName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Daftar peringkat */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Papan Peringkat</h2>
      <div className="space-y-2">
        {topUsers.map((u, idx) => {
          const isMe = u.id === user.id
          const rank = idx + 1
          return (
            <Link
              key={u.id}
              href={isMe ? "#" : `/profile/${u.id}`}
              className={`flex items-center gap-3 p-3 rounded-xl bg-white border transition-all ${
                isMe ? "border-violet-300 bg-violet-50/50" : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="w-7 text-center shrink-0">
                {rank === 1 ? <Crown className="w-5 h-5 text-yellow-500 mx-auto" />
                  : rank === 2 ? <Medal className="w-5 h-5 text-gray-400 mx-auto" />
                  : rank === 3 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" />
                  : <span className="text-sm font-bold text-gray-400">{rank}</span>}
              </div>

              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {u.fullName?.charAt(0).toUpperCase() || "?"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {u.fullName}
                  {isMe && <span className="text-[10px] text-violet-600 ml-1">(kamu)</span>}
                </p>
                <p className="text-[10px] text-gray-400">Level {u.level} • Streak {u.streak || 0}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{u.xp?.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">XP</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
