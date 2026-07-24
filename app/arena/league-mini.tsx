"use client"

import Link from "next/link"
import { useState } from "react"

export interface MiniRow {
  id: string
  fullName: string
  displayName?: string
  xp: number
}

const INITIALS_COLORS = [
  "from-amber-400 to-orange-500",
  "from-slate-300 to-slate-400",
  "from-orange-400 to-amber-600",
]

function initials(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?"
}

/**
 * Mini league board on the Arena home.
 *
 * The two labels used to be plain <Link>s that navigated away, so "Harian"
 * never actually showed daily standings here — the widget always rendered the
 * weekly list. They are real tabs now, switching in place.
 *
 * The daily board ranks coins earned today, matching /arena/league. It reads
 * "koin" rather than "XP" because those are different things in this app: XP
 * comes only from learning, coins from everyday activity.
 */
export default function LeagueMini({
  userId,
  harian,
  mingguan,
}: {
  userId: string
  harian: MiniRow[]
  mingguan: MiniRow[]
}) {
  const [tab, setTab] = useState<"harian" | "mingguan">("mingguan")
  const rows = tab === "harian" ? harian : mingguan
  const isHarian = tab === "harian"

  const tabClass = (active: boolean) =>
    `flex-1 text-center py-2.5 text-xs transition-colors border-b-2 ${
      active
        ? "font-bold text-purple-700 border-purple-600"
        : "font-semibold text-gray-500 border-transparent hover:text-purple-600"
    }`

  return (
    <div className="liga-card">
      <div className="flex border-b border-gray-200">
        <button type="button" onClick={() => setTab("harian")} className={tabClass(isHarian)}>
          Harian
        </button>
        <button type="button" onClick={() => setTab("mingguan")} className={tabClass(!isHarian)}>
          Mingguan
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 px-4 flex items-center justify-between">
        <h4 className="font-extrabold text-sm text-white">
          {isHarian ? "Paling Aktif Hari Ini" : "Papan Peringkat XP"}
        </h4>
        <span className="bg-black/20 px-2.5 py-1 rounded-[10px] text-[11px] font-bold text-white">
          {isHarian ? "Koin" : "Total XP"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-gray-500">
            {isHarian
              ? "Belum ada yang mengumpulkan koin hari ini."
              : "Belum ada peringkat."}
          </p>
        </div>
      ) : (
        <div className="py-2">
          {rows.map((u, i) => {
            const isMe = u.id === userId
            const rankClass = i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-orange-700"
            return (
              <div key={u.id} className={`flex items-center gap-2.5 px-4 py-2 ${isMe ? "bg-purple-50" : ""}`}>
                <span className={`font-extrabold text-sm w-5 text-center shrink-0 ${rankClass}`}>{i + 1}</span>
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${INITIALS_COLORS[i] ?? INITIALS_COLORS[2]} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                >
                  {initials(u.displayName || u.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1A1033] truncate">
                    {isMe ? "Kamu" : (u.displayName || u.fullName)}
                  </p>
                </div>
                <span className="font-extrabold text-sm text-purple-600 shrink-0">
                  {u.xp.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <Link
        href={isHarian ? "/arena/league?tab=harian" : "/arena/league"}
        className="block text-center py-2.5 text-xs font-semibold text-purple-600 border-t border-gray-100 hover:bg-purple-50/50 transition-colors"
      >
        Lihat 50 besar
      </Link>
    </div>
  )
}
