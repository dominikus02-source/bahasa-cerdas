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

export interface HallOfFameRow {
  periodLabel: string
  periodType: string
  rank: number
  name: string
  score: number
  badgeCode?: string | null
  settledAt?: string | null
}

type TabKey = "harian" | "mingguan" | "hall-of-fame"

interface Props {
  weekly: Board
  daily: Board
  hallOfFame: HallOfFameRow[]
  userId: string
  userXP: number
  initialTab?: TabKey
}

// Liga 4 tingkat (Perunggu/Perak/Emas/Berlian) DIHAPUS: ambangnya berbeda dari
// 9 rank resmi, sehingga murid bisa tampil "Emas" di sini dan "Silver" di dasbor
// Pemain. Sumber tunggalnya sekarang rankFromLevel(levelFromXp(xp)).
const HOF_MEDALS = ["🥇", "🥈", "🥉"]

export default function LeagueTabs({ weekly, daily, hallOfFame, userId, userXP, initialTab = "mingguan" }: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab)
  const isHarian = tab === "harian"
  const isHof = tab === "hall-of-fame"
  const board = isHarian ? daily : weekly

  const userLevel = levelFromXp(userXP)
  const userRank = rankFromLevel(userLevel)
  const userMeta = RANK_META[userRank]

  const initials = (name: string) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
  const nameOf = (r: LeagueRow) => r.displayName || r.nickname || r.fullName

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-purple-50">
        <button onClick={() => setTab("mingguan")} className={`flex-1 text-center py-3.5 text-sm font-bold transition-all border-b-2 ${!isHarian && !isHof ? "text-violet-700 dark:text-violet-300 border-violet-600" : "text-gray-500 border-transparent hover:text-violet-600"}`}>
          🏆 XP Mingguan
        </button>
        <button onClick={() => setTab("harian")} className={`flex-1 text-center py-3.5 text-sm font-bold transition-all border-b-2 ${isHarian ? "text-violet-700 dark:text-violet-300 border-violet-600" : "text-gray-500 border-transparent hover:text-violet-600"}`}>
          🔥 Paling Aktif Hari Ini
        </button>
        <button onClick={() => setTab("hall-of-fame")} className={`flex-1 text-center py-3.5 text-sm font-bold transition-all border-b-2 ${isHof ? "text-violet-700 dark:text-violet-300 border-violet-600" : "text-gray-500 border-transparent hover:text-violet-600"}`}>
          🏅 Hall of Fame
        </button>
      </div>

      {/* Hall of Fame */}
      {isHof ? (
        <div>
          <div className="mx-4 mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 p-4 text-xs text-amber-900">
            <p className="font-bold text-sm mb-1">🏅 Hall of Fame</p>
            <p>
              Juara 1–3 dari setiap minggu dan season tiap musim. Penampil hebat dikenang selamanya —
              tidak akan hilang saat musim baru dimulai.
            </p>
          </div>
          {hallOfFame.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Belum ada juara. Jadilah yang pertama!</div>
          ) : (
            <div className="mt-3 divide-y divide-gray-50">
              {hallOfFame.map((h, i) => (
                <div key={`${h.periodType}-${h.periodLabel}-${i}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:bg-slate-800/60 transition-colors">
                  <span className="text-lg shrink-0">{HOF_MEDALS[h.rank - 1] ?? "🏅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{h.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{h.periodLabel}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{h.score.toLocaleString()} XP</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {h.periodType === "season" ? "Juara Season" : "Juara Mingguan"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
      {/* User's own card */}
      <div className={`mx-4 mt-4 p-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center gap-4 ${!isHarian ? "shadow-lg shadow-violet-200" : "shadow-lg shadow-orange-200"}`}>
        <div className="w-12 h-12 rounded-full bg-white bg-white/20 dark:bg-slate-900/20 flex items-center justify-center text-lg font-bold border-2 border-white/30">
          {initials(nameOf({ id: userId, fullName: "Kamu", displayName: "Kamu", avatar: null, xp: userXP, level: 0, streak: 0 }))}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{isHarian ? "Kamu" : "Kamu"}</p>
          <p className="text-xs text-violet-200">Peringkat #{isHarian ? daily.myRank : weekly.myRank} • {userMeta.title}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{isHarian ? daily.myXP.toLocaleString() : weekly.myXP.toLocaleString()}</p>
          <p className="text-xs text-violet-200">{isHarian ? "koin hari ini" : "XP minggu ini"}</p>
        </div>
      </div>

      {/* Tier Indicator */}
      <div className="flex items-center gap-3 mx-4 mt-4 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
        <RankIcon rank={userRank} size={36} glow />
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{userMeta.label} · {userMeta.title}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {userRank === "LEGEND" ? "Peringkat tertinggi!" : `Tingkat ${userLevel} · terus tingkatkan!`}
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
            // r.xp = skor periode (weekly/daily), sedangkan r.level = level total pemain.
            const rowLevel = r.level > 0 ? r.level : levelFromXp(r.xp)
            const rowRank = rankFromLevel(rowLevel)
            return (
              <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-violet-50 border-l-2 border-violet-500" : "hover:bg-gray-50 dark:bg-slate-800/60"} transition-colors`}>
                <span className={`w-7 text-center font-extrabold text-sm ${rank === 1 ? "text-amber-500 dark:text-amber-400" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-orange-700 dark:text-orange-300" : "text-gray-300"}`}>
                  {rank}
                </span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {r.avatar ? <img src={r.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials(nameOf(r))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{isMe ? "Kamu" : nameOf(r)}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <RankIcon rank={rowRank} size={14} />
                    Tingkat {rowLevel} • {RANK_META[rowRank].label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{r.xp.toLocaleString()}</p>
                  {isHarian && r.todayXP && <p className="text-xs text-emerald-500 dark:text-emerald-400">+{r.todayXP} koin</p>}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 bg-gray-50/50 dark:bg-slate-800/50">
        <span className="text-xs font-bold text-gray-600 dark:text-slate-300">Naikkan peringkatmu!</span>
        <Link href="/arena/game" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 transition-colors">
          <Gamepad2 className="w-3.5 h-3.5" /> Main Game
        </Link>
        <Link href="/arena/jalur-cerdas" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 transition-colors">
          <BookOpen className="w-3.5 h-3.5" /> Latihan Jalur Cerdas
        </Link>
      </div>
        </>
      )}
    </div>
  )
}
