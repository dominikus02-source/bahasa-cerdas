"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Lightbulb, CheckCircle2, XCircle, Sparkles, ChevronRight, Star, Brain, AlertTriangle, Target, ImageIcon, Loader2 } from "lucide-react"

interface KontenUnit {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
}

function parseLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return { type: "spacer" as const }
  if (trimmed.startsWith("✓ ")) return { type: "benar" as const, text: trimmed.slice(2) }
  if (trimmed.startsWith("✗ ")) return { type: "salah" as const, text: trimmed.slice(2) }
  if (/^\d+\./.test(trimmed)) return { type: "numbered" as const, text: trimmed }
  if (trimmed.startsWith("•")) return { type: "bullet" as const, text: trimmed }
  if (trimmed.startsWith("BENAR:")) return { type: "benar-label" as const, text: trimmed.slice(6).trim() }
  if (trimmed.startsWith("SALAH:")) return { type: "salah-label" as const, text: trimmed.slice(6).trim() }
  if (trimmed.startsWith("PENTING:")) return { type: "penting" as const, text: trimmed.slice(8).trim() }
  if (trimmed.startsWith("──")) return { type: "table-header" as const, text: trimmed }
  if (trimmed.startsWith("│")) return { type: "table-row" as const, text: trimmed }
  if (trimmed.startsWith("Tips")) return { type: "tip" as const, text: trimmed }
  if (trimmed.startsWith("[Ilustrasi:")) return { type: "ilustrasi" as const, text: trimmed.slice(11).trim().replace(/\]$/, "") }
  return { type: "text" as const, text: trimmed }
}

function ContentLine({ line, index, ilustrasiUrl }: { line: string; index: number; ilustrasiUrl?: string }) {
  const p = parseLine(line)

  if (p.type === "spacer") return <div className="h-2" />

  if (p.type === "benar")
    return (
      <div className="flex items-start gap-2 py-0.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <span className="text-sm text-emerald-800 font-medium">{p.text}</span>
      </div>
    )

  if (p.type === "salah")
    return (
      <div className="flex items-start gap-2 py-0.5">
        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <span className="text-sm text-red-600">{p.text}</span>
      </div>
    )

  if (p.type === "benar-label")
    return (
      <div className="flex items-start gap-2 py-0.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <span className="text-sm text-emerald-800 font-medium">{p.text}</span>
      </div>
    )

  if (p.type === "salah-label")
    return (
      <div className="flex items-start gap-2 py-0.5">
        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <span className="text-sm text-red-600">{p.text}</span>
      </div>
    )

  if (p.type === "bullet")
    return (
      <div className="flex items-start gap-2 py-0.5">
        <span className="text-gray-400 mt-0.5 shrink-0">•</span>
        <span className="text-sm text-gray-700 leading-relaxed">{p.text}</span>
      </div>
    )

  if (p.type === "numbered")
    return (
      <div className="flex items-start gap-3 py-0.5">
        <span className="text-xs font-bold text-violet-600 bg-violet-50 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0">
          {p.text.match(/^(\d+)/)?.[1] || "•"}
        </span>
        <span className="text-sm text-gray-700 leading-relaxed">{p.text.replace(/^\d+\.\s*/, "")}</span>
      </div>
    )

  if (p.type === "penting")
    return (
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl my-2">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <span className="text-sm text-amber-800 font-medium">{p.text}</span>
      </div>
    )

  if (p.type === "tip")
    return (
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl my-2">
        <Brain className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <span className="text-sm text-blue-800">{p.text}</span>
      </div>
    )

  if (p.type === "ilustrasi")
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-violet-200 bg-violet-50">
        {ilustrasiUrl ? (
          <img
            src={ilustrasiUrl}
            alt={p.text}
            className="w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-48 bg-violet-100 animate-pulse">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm">
          <ImageIcon className="w-4 h-4 text-violet-500 shrink-0" />
          <p className="text-xs text-violet-700 italic">{p.text}</p>
        </div>
      </div>
    )

  return <p className="text-sm text-gray-700 leading-relaxed">{line}</p>
}

export default function BelajarPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [unit, setUnit] = useState<any>(null)
  const [konten, setKonten] = useState<KontenUnit["belajar"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)
  const [ilustrasiUrls, setIlustrasiUrls] = useState<Record<string, string>>({})

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

  useEffect(() => {
    if (!konten) return
    const prompts = new Set<string>()
    const extract = (lines: string[]) => lines.forEach(l => {
      const t = l.trim()
      if (t.startsWith("[Ilustrasi:")) prompts.add(t.slice(11).trim().replace(/\]$/, ""))
    })
    konten.materi.forEach(m => {
      extract(m.isi)
      if (m.contoh) extract(m.contoh)
    })
    if (prompts.size === 0) return
    ;(async () => {
      const results = await Promise.allSettled(
        [...prompts].map(async prompt => {
          const res = await fetch(`/api/ai/ilustrasi?prompt=${encodeURIComponent(prompt)}`)
          const data = await res.json()
          if (data.url) return [prompt, data.url] as const
          return null
        })
      )
      const newUrls: Record<string, string> = {}
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value) {
          newUrls[r.value[0]] = r.value[1]
        }
      })
      setIlustrasiUrls(prev => ({ ...prev, ...newUrls }))
    })()
  }, [konten])

  const total = konten?.materi.length || 0
  const isLast = activeIdx >= total - 1
  const selesai = useCallback(() => {
    if (isLast) {
      fetch(`/api/jalur-cerdas/${unitId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "belajar" }),
      }).catch(() => {})
      router.push(`/arena/jalur-cerdas/${unitId}`)
    } else {
      setActiveIdx(i => i + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [isLast, router, unitId])

  if (loading) return (
    <div className="px-4 py-6 arena-page space-y-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3" />
      <div className="h-24 bg-gray-100 rounded-2xl" />
      {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
    </div>
  )

  if (!konten) return (
    <div className="px-4 py-6 arena-page text-center pt-20">
      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">Materi belum tersedia</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 font-semibold text-sm">Kembali</button>
    </div>
  )

  const m = konten.materi[activeIdx]

  const getIlustrasiUrl = (line: string) => {
    const t = line.trim()
    if (t.startsWith("[Ilustrasi:")) {
      const prompt = t.slice(11).trim().replace(/\]$/, "")
      return ilustrasiUrls[prompt]
    }
    return undefined
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-violet-50/30 to-white">
      {/* Top Progress Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-violet-600">{unit?.level?.title || "Belajar"}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">{activeIdx + 1} dari {total}</span>
                <span className="text-[11px] text-gray-400">•</span>
                <span className="text-xs font-bold text-violet-600">{Math.round(((activeIdx + 1) / total) * 100)}%</span>
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((activeIdx + 1) / total) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-2 justify-center">
            {konten.materi.map((_, i) => (
              <button
                key={i}
                onClick={() => i <= activeIdx + 1 && setActiveIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx ? "w-6 bg-violet-500" : i < activeIdx ? "w-1.5 bg-emerald-400" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {/* Tujuan — show only on first card */}
        {activeIdx === 0 && konten.tujuan.length > 0 && (
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 mb-6 shadow-lg shadow-violet-200/50 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-violet-200" />
              <p className="text-[11px] font-bold text-violet-200 uppercase tracking-wider">Tujuan Pembelajaran</p>
            </div>
            <ul className="space-y-2">
              {konten.tujuan.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white">
                  <Star className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Content Card */}
        <div key={activeIdx} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {activeIdx + 1}
              </div>
              <h2 className="text-base font-bold text-gray-900">{m.judul}</h2>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-5 py-4 space-y-2">
            {m.isi.map((line, li) => (
              <ContentLine key={li} line={line} index={li} ilustrasiUrl={getIlustrasiUrl(line)} />
            ))}

            {/* Examples Section */}
            {m.contoh && m.contoh.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Contoh Penggunaan</span>
                </div>
                <div className="space-y-2">
                  {m.contoh.map((c, ci) => {
                    const p = parseLine(c)
                    const isBenarLabel = p.type === "benar" || p.type === "benar-label"
                    const isSalahLabel = p.type === "salah" || p.type === "salah-label"

                    if (isBenarLabel || isSalahLabel) {
                      return <ContentLine key={ci} line={c} index={ci} ilustrasiUrl={getIlustrasiUrl(c)} />
                    }

                    return (
                      <div key={ci} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-gray-700 leading-relaxed">{c}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Catatan */}
            {m.catatan && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-0.5">Catatan Penting</span>
                  <p className="text-sm text-blue-800">{m.catatan}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="px-5 py-4 bg-gradient-to-b from-white to-gray-50 border-t border-gray-100">
            <button
              onClick={selesai}
              className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
                isLast
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-emerald-200/50"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-violet-200/50"
              }`}
            >
              {isLast ? (
                <><CheckCircle2 className="w-5 h-5" /> Selesai Belajar</>
              ) : (
                <><ChevronRight className="w-5 h-5" /> Lanjut</>
              )}
            </button>
          </div>
        </div>

        {/* Rangkuman — shown at end */}
        {isLast && konten.rangkuman.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mt-6 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Rangkuman</span>
            </div>
            <ul className="space-y-2">
              {konten.rangkuman.map((r, i) => {
                const isBold = r.startsWith("**")
                const text = isBold ? r.replace(/\*\*/g, "") : r
                return (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0" />
                    <span className={isBold ? "font-bold" : ""}>{text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
