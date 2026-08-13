"use client"

import Link from "next/link"
import { BookOpen, Clock, AlertTriangle } from "lucide-react"
import type { SimulationTrack } from "@/lib/kompetensi/get-simulation-packages"
import { TrackIcon } from "@/components/shared/TrackIcon"

interface Props {
  tracks: SimulationTrack[]
}

const UKBI_GRADES = [
  { level: "Istimewa (I)", range: "725–800" },
  { level: "Sangat Unggul (II)", range: "641–724" },
  { level: "Unggul (III)", range: "578–640" },
  { level: "Madya (IV)", range: "482–577" },
  { level: "Semenjana (V)", range: "405–481" },
  { level: "Marginal (VI)", range: "326–404" },
  { level: "Terbatas (VII)", range: "251–325" },
]

export function UKBISimulationClient({ tracks }: Props) {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={24} />
          <h1 className="text-xl font-bold">Simulasi UKBI BahasaCerdas</h1>
        </div>
        <p className="text-sm text-violet-200 max-w-2xl">
          Ukur kemampuan berbahasa Indonesia melalui latihan adaptif dan acak sesuai standar UKBI.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            Skor ini adalah skor latihan/simulasi BahasaCerdas, bukan skor resmi UKBI dari Badan Bahasa.
          </p>
        </div>
      </div>

      {/* Tracks */}
      {tracks.length === 0 ? (
        <div className="text-center py-16 bg-card dark:bg-slate-900 rounded-xl border border-border">
          <BookOpen size={48} className="mx-auto text-gray-200 dark:text-slate-700 mb-3" />
          <p className="text-muted-foreground font-medium">Paket simulasi belum tersedia</p>
          <p className="text-sm text-muted-foreground mt-1">Segera tersedia</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tracks.map((track) => {
            const isAvailable = track.available && track.paketId
            return (
              <div
                key={track.id}
                className={`bg-card dark:bg-slate-900 rounded-xl border border-border p-5 transition-all ${
                  isAvailable ? "hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/60" : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${track.bgGradient} flex items-center justify-center shrink-0`}>
                    <TrackIcon name={track.icon} className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm">{track.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{track.description}</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">{track.target}</p>
                    {isAvailable ? (
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {track.questionCount} soal</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {track.duration} menit</span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2">Segera tersedia</p>
                    )}
                  </div>
                </div>
                {isAvailable && track.paketId && (
                  <Link
                    href={`/kompetisi/${track.paketId}/device-check`}
                    className="mt-4 block text-center py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
                  >
                    Mulai Simulasi
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Info Predikat */}
      <div className="mt-8 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
        <h2 className="font-bold text-sm mb-3">Tingkat Predikat UKBI</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {UKBI_GRADES.map(g => (
            <div key={g.level} className="bg-white bg-white/10 dark:bg-slate-900/10 rounded-xl p-2 text-center">
              <p className="text-xs font-bold">{g.level}</p>
              <p className="text-[10px] text-white/70">{g.range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
