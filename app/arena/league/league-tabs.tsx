"use client"

import { useState } from "react"
import Link from "next/link"
import { Medal, Crown, Diamond } from "lucide-react"
import { calcLevel, calcLeagueFromXP } from "@/lib/xp"

export interface LeagueRow {
  id: string
  fullName: string
  displayName?: string
  avatar: string | null
  xp: number
  level: number
  streak: number
  todayXP?: number
}

interface Board {
  rows: LeagueRow[]
  myRank: number
  myXP: number
}

interface Props {
  weekly: Board
  daily: Board
  userId: string
  userXP: number
  initialTab?: "harian" | "mingguan"
}

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

export default function LeagueTabs({ weekly, daily, userId, userXP, initialTab = "mingguan" }: Props) {
  const [tab, setTab] = useState<"harian" | "mingguan">(initialTab)
  const isHarian = tab === "harian"
  const board = isHarian ? daily : weekly

  const userTier = calcLeagueFromXP(userXP)
  const nextTierXP = userTier === "BRONZE" ? 1000 : userTier === "SILVER" ? 3000 : userTier === "GOLD" ? 8000 : null
  const nextTierName = userTier === "BRONZE" ? "Perak" : userTier === "SILVER" ? "Emas" : userTier === "GOLD" ? "Berlian" : null

  return (
    <>
      {/* Tabs — switch in place, no navigation */}
      <div className="flex gap-2 mb-5" role="tablist" aria-label="Periode liga">
        <button
          role="tab"
          aria-selected={!isHarian}
          onClick={() => setTab("mingguan")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${
            !isHarian ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Mingguan
        </button>
        <button
          role="tab"
          aria-selected={isHarian}
          onClick={() => setTab("harian")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${
            isHarian ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Harian
        </button>
      </div>

      {/* My rank card */}
      <div className={`bg-gradient-to-br ${TIER_COLOR[userTier]} rounded-2xl p-4 mb-6 shadow-lg`}>
        <div className="flex items-center gap-3">
          <div>{TIER_ICON[userTier]}</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-white">Peringkat #{board.myRank > 0 ? board.myRank : "-"}</p>
            <p className="text-sm text-white/80">{board.myXP.toLocaleString()} XP {isHarian ? "hari ini" : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70 uppercase tracking-wider">{TIER_LABEL[userTier]}</p>
            {!isHarian && nextTierXP && nextTierName && (
              <p className="text-[10px] text-white/60">{nextTierXP - userXP} XP lagi ke {nextTierName}</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        {isHarian ? "Koin Hari Ini" : "Papan Peringkat"}
      </h2>

      {board.rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Crown className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium px-6">
            {isHarian
              ? "Belum ada yang mengumpulkan koin hari ini. Tulis karya, beri suka, atau selesaikan misi untuk masuk papan."
              : "Belum ada peringkat mingguan. Kumpulkan poin minggu ini untuk masuk papan liga."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {board.rows.map((u, idx) => {
            const isMe = u.id === userId
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
                  {(u.displayName || u.fullName)?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {u.displayName || u.fullName}
                    {isMe && <span className="text-[10px] text-violet-600 ml-1">(kamu)</span>}
                  </p>
                  <p className="text-[10px] text-gray-400">Level {calcLevel(u.xp || 0)} • Streak {u.streak || 0}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    {isHarian ? (u.todayXP?.toLocaleString() || "0") : u.xp?.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">{isHarian ? "koin hari ini" : "XP"}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
