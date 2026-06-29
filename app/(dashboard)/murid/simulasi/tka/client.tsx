"use client"

import Link from "next/link"
import { BookOpen, Clock, AlertTriangle } from "lucide-react"
import type { SimulationTrack } from "@/lib/kompetensi/get-simulation-packages"

interface Props {
  tracks: SimulationTrack[]
}

export function TKASimulationClient({ tracks }: Props) {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCapIcon size={24} />
          <h1 className="text-xl font-bold">Simulasi TKA Bahasa Indonesia</h1>
        </div>
        <p className="text-sm text-rose-200 max-w-2xl">
          Latihan soal tes kompetensi bahasa Indonesia untuk persiapan ujian sekolah dan seleksi masuk PTN.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Simulasi ini adalah latihan BahasaCerdas dan bukan hasil resmi TKA.
          </p>
        </div>
      </div>

      {/* Tracks */}
      {tracks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Paket simulasi belum tersedia</p>
          <p className="text-sm text-gray-400 mt-1">Segera tersedia</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tracks.map((track) => {
            const isAvailable = track.available && track.paketId
            return (
              <div
                key={track.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 transition-all ${
                  isAvailable ? "hover:shadow-md hover:border-rose-200" : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${track.bgGradient} flex items-center justify-center text-lg shrink-0`}>
                    {track.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm">{track.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{track.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{track.target}</p>
                    {isAvailable ? (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {track.questionCount} soal</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {track.duration} menit</span>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-600 font-medium mt-2">Segera tersedia</p>
                    )}
                  </div>
                </div>
                {isAvailable && track.paketId && (
                  <Link
                    href={`/kompetisi/${track.paketId}`}
                    className="mt-4 block text-center py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
                  >
                    Mulai Simulasi
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GraduationCapIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}
