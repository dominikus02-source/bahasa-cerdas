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

const RARITY_STYLE: Record<string, { chip: string; border: string }> = {
  BRONZE:    { chip: "bg-bc-warning-soft text-bc-warning-strong", border: "border-bc-warning/40" },
  SILVER:    { chip: "bg-bc-surface-2 text-bc-text-2",            border: "border-bc-border-strong" },
  GOLD:      { chip: "bg-bc-warning-soft text-bc-warning-strong", border: "border-bc-warning/70" },
  LEGENDARY: { chip: "bg-bc-violet-soft text-bc-violet",          border: "border-bc-violet/50" },
}

const CARD = "rounded-bc-card border border-bc-border bg-bc-surface p-4 shadow-bc-1 sm:p-5"

/** Lencana guru: tampilkan yang khusus guru (kode guru-*) + status unlock. */
export default function GuruBadgeGrid({ compact = false }: { compact?: boolean }) {
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
      <div className={CARD}>
        <div className="h-5 bg-bc-surface-2 rounded w-40 mb-4 animate-pulse" />
        <div className={compact ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-bc-surface-2 rounded-bc-tile animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) return null

  const unlockedCount = badges.filter(b => b.unlocked).length

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-bc-text flex items-center gap-2">
          <Award size={16} className="text-bc-warning" /> Lencana Guru
        </h3>
        <Link href="/arena/player/badges" className="shrink-0 text-xs font-semibold text-bc-aud hover:underline flex items-center gap-1">
          {unlockedCount}/{badges.length} terbuka
        </Link>
      </div>

      {badges.length === 0 ? (
        <p className="text-sm text-bc-text-2 text-center py-6">
          Lencana guru belum tersedia — jalankan seed badge guru.
        </p>
      ) : (
        <div className={compact ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"}>
          {(compact ? badges.slice(0, 5) : badges).map(b => {
            const st = RARITY_STYLE[b.rarity] || RARITY_STYLE.BRONZE
            const target = b.condition?.target || 0
            // Saat terkunci, progress = nilai aktual menuju target; saat
            // terbuka engine membatasi progress = target (100%).
            const pct = b.unlocked || target <= 0 ? 100 : Math.min(100, Math.round((b.progress / target) * 100))
            return (
              <div
                key={b.code}
                title={`${b.description}${b.unlocked ? "" : ` (progres ${b.progress.toLocaleString()})`}`}
                className={`min-w-0 rounded-bc-tile border p-3 text-center transition-all ${
                  b.unlocked
                    ? `bg-bc-surface ${st.border} shadow-bc-1`
                    : "border-bc-border bg-bc-surface-2"
                }`}
              >
                <div className={`relative w-11 h-11 mx-auto mb-1.5 rounded-full flex items-center justify-center ${b.unlocked ? "bg-bc-warning-soft" : "bg-bc-surface"}`}>
                  {b.unlocked ? (
                    <BadgeIcon icon={b.icon} alt={b.name} size={36} className="w-9 h-9" />
                  ) : (
                    <Lock size={14} className="text-bc-text-3" />
                  )}
                </div>
                <p className={`text-[11px] font-bold leading-tight break-words ${b.unlocked ? "text-bc-text" : "text-bc-text-2"}`}>{b.name}</p>
                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${st.chip}`}>
                  {b.rarity}
                </span>
                <div className="mt-1.5 h-1 rounded-full bg-bc-border overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.unlocked ? "bg-bc-warning" : "bg-bc-text-3"}`}
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
