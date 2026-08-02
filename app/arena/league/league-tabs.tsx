"use client"

import { useState } from "react"
import Link from "next/link"
import { Gamepad2, BookOpen } from "lucide-react"
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks"
import { RankIcon } from "@/components/gamification/RankIcon"

export interface LeagueRow {
  id: string
  fullName: string
  displayName?: string
  nickname?: string | null
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

// Liga 4 tingkat (Perunggu/Perak/Emas/Berlian) DIHAPUS: ambangnya berbeda dari
// 9 rank resmi, sehingga murid bisa tampil "Emas" di sini dan "Silver" di dasbor
// Pemain. Sumber tunggalnya sekarang rankFromLevel(levelFromXp(xp)).

export default function LeagueTabs({ weekly, daily, userId, userXP, initialTab = "mingguan" }: Props) {
  const [tab, setTab] = useState<"harian" | "mingguan">(initialTab)
  const isHarian = tab === "harian"
  const board = isHarian ? daily : weekly

  const userLevel = levelFromXp(userXP)
  const userRank = rankFromLevel(userLevel)
  const userMeta = RANK_META[userRank]

  const initials = (name: string) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
  const nameOf = (r: LeagueRow) => r.displayName || r.nickname || r.fullName

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <button onClick={() => setTab("mingguan")} className={`flex-1 text-center py-3.5 text-sm font-bold transition-all border-b-2 ${!isHarian ? "text-violet-700 border-violet-600" : "text-gray-500 border-transparent hover:text-violet-600"}`}>
          🏆 Peringkat XP
        </button>
        <button onClick={() => setTab("harian")} className={`flex-1 text-center py-3.5 text-sm font-bold transition-all border-b-2 ${isHarian ? "text-violet-700 border-violet-600" : "text-gray-500 border-transparent hover:text-violet-600"}`}>
          🔥 Paling Aktif Hari Ini
        </button>
      </div>

      {/* User's own card */}
      <div className={`mx-4 mt-4 p-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center gap-4 ${!isHarian ? "shadow-lg shadow-violet-200" : "shadow-lg shadow-orange-200"}`}>
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold border-2 border-white/30">
          {initials(nameOf({ id: userId, fullName: "Kamu", displayName: "Kamu", avatar: null, xp: userXP, level: 0, streak: 0 }))}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{isHarian ? "Kamu" : "Kamu"}</p>
          <p className="text-xs text-violet-200">Peringkat #{isHarian ? daily.myRank : weekly.myRank} • {userMeta.title}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{isHarian ? daily.myXP.toLocaleString() : weekly.myXP.toLocaleString()}</p>
          <p className="text-xs text-violet-200">{isHarian ? "koin hari ini" : "total XP"}</p>
        </div>
      </div>

      {/* Tier Indicator */}
      <div className="flex items-center gap-3 mx-4 mt-4 p-3 bg-gray-50 rounded-xl">
        <RankIcon rank={userRank} size={36} glow />
        <div>
          <p className="text-sm font-bold text-gray-900">{userMeta.label} · {userMeta.title}</p>
          <p className="text-xs text-gray-500">
            {userRank === "LEGEND" ? "Peringkat tertinggi!" : `Level ${userLevel} · terus tingkatkan!`}
          </p>
        </div>
      </div>

      {/* Rankings */}
      <div className="mt-4">
        {board.rows.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {isHarian ? "Belum ada aktivitas hari ini." : "Belum ada peringkat."}
          </div>
        ) : (
          board.rows.map((r, i) => {
            const rank = i + 1
            const isMe = r.id === userId
            const rowLevel = levelFromXp(r.xp)
            const rowRank = rankFromLevel(rowLevel)
            return (
              <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-violet-50 border-l-2 border-violet-500" : "hover:bg-gray-50"} transition-colors`}>
                <span className={`w-7 text-center font-extrabold text-sm ${rank === 1 ? "text-amber-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-orange-700" : "text-gray-300"}`}>
                  {rank}
                </span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {r.avatar ? <img src={r.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials(nameOf(r))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{isMe ? "Kamu" : nameOf(r)}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <RankIcon rank={rowRank} size={14} />
                    Level {rowLevel} • {RANK_META[rowRank].label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-900">{r.xp.toLocaleString()}</p>
                  {isHarian && r.todayXP && <p className="text-xs text-emerald-500">+{r.todayXP} koin</p>}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-gray-100 bg-gray-50/50">
        <span className="text-xs font-bold text-gray-600">Naikkan peringkatmu!</span>
        <Link href="/arena/game" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
          <Gamepad2 className="w-3.5 h-3.5" /> Main Game
        </Link>
        <Link href="/arena/jalur-cerdas" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
          <BookOpen className="w-3.5 h-3.5" /> Latihan Jalur Cerdas
        </Link>
      </div>
    </div>
  )
}
