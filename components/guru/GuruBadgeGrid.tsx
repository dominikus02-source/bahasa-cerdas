"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Award, Lock } from "lucide-react"
import { BadgeIcon } from "@/components/gamification/BadgeIcon"

type BadgeItem = {
  code: string
  name: string
  icon: string
  description: string
  rarity: "BRONZE" | "SILVER" | "GOLD" | "LEGENDARY"
  progress: number
  unlocked: boolean
  condition?: { type?: string; target?: number }
}

const RARITY_STYLE: Record<string, { chip: string; border: string; glow: string }> = {
  BRONZE:    { chip: "bg-orange-100 text-orange-700",       border: "border-orange-200",       glow: "shadow-orange-200/50" },
  SILVER:    { chip: "bg-slate-100 text-slate-600",         border: "border-slate-300",         glow: "shadow-slate-300/50" },
  GOLD:      { chip: "bg-amber-100 text-amber-700",         border: "border-amber-300",         glow: "shadow-amber-300/50" },
  LEGENDARY: { chip: "bg-violet-100 text-violet-700",       border: "border-violet-300",        glow: "shadow-violet-300/50" },
}

/** Lencana guru: tampilkan yang khusus guru (kode guru-*) + status unlock. */
export default function GuruBadgeGrid() {
  const [badges, setBadges] = useState<BadgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/player/badges")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (cancelled) return
        const all: BadgeItem[] = d.badges || []
        setBadges(all.filter((b: BadgeItem) => b.code.startsWith("guru-")))
      })
      .catch(() => { if (!cancelled) setError("Gagal memuat lencana") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="h-5 bg-gray-100 rounded w-40 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) return null

  const unlockedCount = badges.filter(b => b.unlocked).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Award size={16} className="text-amber-500" /> Lencana Guru
        </h3>
        <Link href="/arena/player/badges" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          {unlockedCount}/{badges.length} terbuka
        </Link>
      </div>

      {badges.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Lencana guru belum tersedia — jalankan seed badge guru.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {badges.map(b => {
            const st = RARITY_STYLE[b.rarity] || RARITY_STYLE.BRONZE
            const target = b.condition?.target || 0
            // Saat terkunci, progress = nilai aktual menuju target; saat
            // terbuka engine membatasi progress = target (100%).
            const pct = b.unlocked || target <= 0 ? 100 : Math.min(100, Math.round((b.progress / target) * 100))
            return (
              <div
                key={b.code}
                title={`${b.description}${b.unlocked ? "" : ` (progres ${b.progress.toLocaleString()})`}`}
                className={`rounded-xl border p-3 text-center transition-all ${
                  b.unlocked
                    ? `bg-gradient-to-b from-white to-amber-50/40 ${st.border} shadow-sm ${st.glow}`
                    : "border-gray-100 bg-gray-50/60 opacity-70"
                }`}
              >
                <div className={`relative w-11 h-11 mx-auto mb-1.5 rounded-full flex items-center justify-center ${b.unlocked ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-gray-200"}`}>
                  {b.unlocked ? (
                    <BadgeIcon icon={b.icon} alt={b.name} size={36} className="w-9 h-9" />
                  ) : (
                    <Lock size={14} className="text-gray-400" />
                  )}
                </div>
                <p className={`text-[11px] font-bold leading-tight ${b.unlocked ? "text-gray-900" : "text-gray-400"}`}>{b.name}</p>
                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${st.chip}`}>
                  {b.rarity}
                </span>
                <div className="mt-1.5 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.unlocked ? "bg-amber-400" : "bg-gray-300"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
