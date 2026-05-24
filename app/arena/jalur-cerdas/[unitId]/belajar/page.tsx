"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Lightbulb, CheckCircle2, Sparkles, ChevronRight } from "lucide-react"

interface KontenUnit {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
}

export default function BelajarPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [unit, setUnit] = useState<any>(null)
  const [konten, setKonten] = useState<KontenUnit["belajar"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetch(`/api/jalur-cerdas/${unitId}`)
      .then(r => r.json())
      .then(d => {
        setUnit(d.unit)
        if (d.konten?.belajar) setKonten(d.konten.belajar)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  const total = konten?.materi.length || 1
  const selesai = () => {
    const next = progress + 1
    setProgress(next >= total ? total : next)
    if (next >= total) {
      router.push(`/arena/jalur-cerdas/${unitId}`)
    }
  }

  if (loading) return (
    <div className="px-4 py-6 arena-page space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-40 bg-gray-100 rounded-2xl" />
      <div className="h-20 bg-gray-100 rounded-2xl" />
    </div>
  )

  if (!konten) return (
    <div className="px-4 py-6 arena-page text-center pt-20">
      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">Materi belum tersedia</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 font-semibold text-sm">Kembali</button>
    </div>
  )

  return (
    <div className="px-4 py-6 arena-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="text-xs text-violet-600 font-semibold">{unit?.level?.title || unit?.title}</p>
          <h1 className="text-lg font-bold text-gray-900">Belajar</h1>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-bold text-violet-600">{progress}/{total} selesai</p>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(progress / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Tujuan */}
      {konten.tujuan.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-violet-600" />
            <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Tujuan Pembelajaran</p>
          </div>
          <ul className="space-y-1.5">
            {konten.tujuan.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Materi cards */}
      <div className="space-y-4 mb-6">
        {konten.materi.map((m, idx) => {
          const isActive = idx <= progress
          return (
            <div key={idx} className={`rounded-2xl border transition-all overflow-hidden ${
              isActive ? "border-violet-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50 opacity-60"
            }`}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    idx < progress ? "bg-emerald-100 text-emerald-600" : isActive ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {idx < progress ? "✓" : idx + 1}
                  </div>
                  <h3 className={`font-bold text-sm ${isActive ? "text-gray-900" : "text-gray-400"}`}>{m.judul}</h3>
                </div>

                {isActive && (
                  <div className="space-y-3 animate-fade-in">
                    {m.isi.map((p, pi) => (
                      <p key={pi} className="text-sm text-gray-700 leading-relaxed">{p}</p>
                    ))}
                    {m.contoh.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Contoh</p>
                        {m.contoh.map((c, ci) => (
                          <p key={ci} className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">{c}</p>
                        ))}
                      </div>
                    )}
                    {m.catatan && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700">{m.catatan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isActive && idx < konten.materi.length - 1 && (
                <button onClick={selesai} className="w-full py-2.5 bg-violet-50 text-violet-700 text-sm font-bold flex items-center justify-center gap-1 hover:bg-violet-100 transition-colors">
                  Lanjut <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {isActive && idx === konten.materi.length - 1 && (
                <button onClick={selesai} className="w-full py-2.5 bg-emerald-50 text-emerald-700 text-sm font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors">
                  Selesai Belajar <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Rangkuman */}
      {progress === total && konten.rangkuman.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Rangkuman</p>
          </div>
          <ul className="space-y-1.5">
            {konten.rangkuman.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
