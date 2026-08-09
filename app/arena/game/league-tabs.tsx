"use client"

import { useState } from "react"
import { Crown } from "lucide-react"

export interface LeagueRow {
  id: string
  fullName: string
  displayName?: string
  xp: number
}

const INITIALS_COLORS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-orange-500 to-amber-600",
]

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

export default function GameHubLeagueTabs({
  userId,
  harian,
  mingguan,
}: {
  userId: string
  harian: LeagueRow[]
  mingguan: LeagueRow[]
}) {
  const [tab, setTab] = useState<"harian" | "mingguan">("mingguan")
  const rows = tab === "harian" ? harian : mingguan
  const isHarian = tab === "harian"

  return (
    <div className="rounded-[20px] border overflow-hidden mb-6" style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.2)" }}>
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <h3 className="font-bold text-white flex items-center gap-2">
          <Crown size={16} className="text-amber-400" /> {isHarian ? "Paling Aktif Hari Ini" : "XP Mingguan"}
        </h3>
        <div className="flex gap-1 p-0.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.05)" }}>
          <button
            type="button"
            onClick={() => setTab("harian")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
            style={isHarian ? { background: "#7C3AED", color: "#fff" } : { color: "#7C7A9E" }}
          >
            Harian
          </button>
          <button
            type="button"
            onClick={() => setTab("mingguan")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
            style={!isHarian ? { background: "#7C3AED", color: "#fff" } : { color: "#7C7A9E" }}
          >
            Mingguan
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs" style={{ color: "#7C7A9E" }}>
            {isHarian ? "Belum ada yang mengumpulkan koin hari ini." : "Belum ada peringkat."}
          </p>
        </div>
      ) : (
        rows.map((u, i) => {
          const isMe = u.id === userId
          const rankColors = ["text-amber-400", "text-gray-400", "text-orange-700"]
          const rankEmoji = i === 0 ? <Crown size={13} className="text-amber-400" /> : null
          const displayName = u.displayName || u.fullName
          return (
            <div key={u.id} className="px-5 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.04)", background: isMe ? "rgba(124,58,237,0.08)" : "transparent" }}>
              <div className="w-6 text-center shrink-0">
                {rankEmoji || <span className={`text-sm font-extrabold ${rankColors[i] || ""}`} style={{ color: !rankColors[i] ? "#7C7A9E" : undefined }}>{i + 1}</span>}
              </div>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${INITIALS_COLORS[i % INITIALS_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                {initials(displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {displayName}
                  {isMe && <span className="text-[11px] font-medium ml-1" style={{ color: "#A855F7" }}>(Kamu)</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-extrabold" style={{ color: "#A855F7" }}>{u.xp.toLocaleString()}</p>
                <p className="text-[10px]" style={{ color: "#7C7A9E" }}>{isHarian ? "Koin" : "XP"}</p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
