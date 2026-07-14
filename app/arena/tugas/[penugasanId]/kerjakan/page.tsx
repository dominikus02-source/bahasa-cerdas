"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, Target, Lightbulb, ArrowRight, ArrowLeft, CheckCircle2, Trophy, Loader2 } from "lucide-react"

type Q = { id: string; question: string; options: string[]; tipe: "PG" | "BENAR_SALAH" | "ISIAN" }
type Materi = { judul: string; isi: string[]; contoh: string[]; catatan?: string }
type Data = {
  judul: string
  unitTitle: string
  belajar: { tujuan: string[]; materi: Materi[]; rangkuman: string[] }
  latihan: Q[]
  reading: { title: string; text: string } | null
  praktik: { petunjuk: string; tips: string[]; contoh?: string } | null
  submission: { status: string; score: number | null } | null
}
type Phase = "belajar" | "latihan" | "praktik" | "done"

export default function KerjakanTugasPage() {
  const { penugasanId } = useParams<{ penugasanId: string }>()
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>("belajar")
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/murid/penugasan/${penugasanId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d.data))
      .catch(() => setError("Gagal memuat tugas."))
      .finally(() => setLoading(false))
  }, [penugasanId])

  const hasLatihan = (data?.latihan?.length ?? 0) > 0
  const hasPraktik = !!data?.praktik

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/murid/penugasan/${penugasanId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setResult(d.data)
      setPhase("done")
    } catch {
      setError("Tugas belum berhasil dikirim. Silakan coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
  )
  if (!data) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-500">{error || "Tugas tidak ditemukan."}</p>
      <Link href="/arena/tugas" className="inline-block mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold">Kembali</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F6FF] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/arena/tugas" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="min-w-0">
          <p className="text-[11px] text-violet-500 font-semibold truncate">Tugas · {data.unitTitle}</p>
          <h1 className="text-sm font-bold text-gray-900 truncate">{data.judul}</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 px-4 pt-3">
        {(["belajar", "latihan", "praktik"] as Phase[]).map((p) => {
          const skip = (p === "latihan" && !hasLatihan) || (p === "praktik" && !hasPraktik)
          if (skip) return null
          const active = phase === p
          return <div key={p} className={`h-1.5 flex-1 rounded-full ${active ? "bg-violet-500" : "bg-violet-100"}`} />
        })}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* BELAJAR */}
        {phase === "belajar" && (
          <div className="space-y-4">
            {data.belajar.tujuan.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-violet-500" /> Tujuan Pembelajaran</h2>
                <ul className="space-y-1.5">
                  {data.belajar.tujuan.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-violet-400 font-bold">{i + 1}.</span>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.belajar.materi.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-500" />{m.judul}</h3>
                <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
                  {m.isi.map((line, j) => <p key={j}>{line}</p>)}
                </div>
                {m.contoh.length > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-amber-600 uppercase mb-1">Contoh</p>
                    {m.contoh.map((c, j) => <p key={j} className="text-sm text-amber-800">{c}</p>)}
                  </div>
                )}
                {m.catatan && <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg p-2">{m.catatan}</p>}
              </div>
            ))}
            {data.belajar.rangkuman.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                <h3 className="font-bold text-emerald-700 mb-2">Rangkuman</h3>
                <ul className="space-y-1.5">
                  {data.belajar.rangkuman.map((r, i) => <li key={i} className="flex gap-2 text-sm text-emerald-800"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* LATIHAN */}
        {phase === "latihan" && (
          <div className="space-y-4">
            {data.reading && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bacaan</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.reading.text}</p>
              </div>
            )}
            {!hasLatihan ? (
              <p className="text-center text-gray-400 py-10 text-sm">Tidak ada latihan untuk tugas ini.</p>
            ) : data.latihan.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="font-semibold text-gray-900 text-sm mb-3"><span className="text-violet-500 mr-1">{idx + 1}.</span>{q.question}</p>
                {q.tipe === "ISIAN" ? (
                  <input
                    value={(answers[q.id] as string) ?? ""}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Ketik jawaban..."
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none p-3 text-sm"
                  />
                ) : (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = Number(answers[q.id]) === oi
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                          className={`w-full flex items-center gap-2.5 text-left p-3 rounded-xl border-2 text-sm transition-all ${
                            selected ? "border-violet-500 bg-violet-50 font-medium" : "border-gray-200 hover:border-violet-300"
                          }`}
                        >
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shrink-0 ${selected ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500"}`}>{String.fromCharCode(65 + oi)}</span>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PRAKTIK */}
        {phase === "praktik" && data.praktik && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Petunjuk Praktik</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.praktik.petunjuk}</p>
            </div>
            {data.praktik.tips.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-2">Langkah</h3>
                <ul className="space-y-1.5">
                  {data.praktik.tips.map((t, i) => <li key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-amber-500 font-bold">{i + 1}.</span>{t}</li>)}
                </ul>
              </div>
            )}
            {data.praktik.contoh && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[11px] font-bold text-amber-600 uppercase mb-1">Contoh Hasil</p>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{data.praktik.contoh}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 text-center">Kerjakan praktik ini di buku/lembar kerjamu, lalu tandai selesai.</p>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && result && (
          <div className="text-center py-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Tugas Selesai!</h2>
            <p className="text-5xl font-black text-violet-600 my-3">{result.score}</p>
            <p className="text-sm text-gray-500">
              {result.total > 0 ? `${result.correct} dari ${result.total} latihan benar` : "Materi & praktik selesai"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Nilaimu otomatis masuk ke rekap guru.</p>
            <Link href="/arena/tugas" className="inline-block mt-6 px-6 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold">Kembali ke Tugas</Link>
          </div>
        )}

        {error && phase !== "done" && <p className="text-xs text-red-500 text-center mt-4">{error}</p>}
      </div>

      {/* Bottom action bar */}
      {phase !== "done" && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 safe-area-bottom">
          <div className="max-w-2xl mx-auto">
            <BottomButton
              phase={phase}
              hasLatihan={hasLatihan}
              hasPraktik={hasPraktik}
              submitting={submitting}
              onNext={() => {
                if (phase === "belajar") setPhase(hasLatihan ? "latihan" : hasPraktik ? "praktik" : "done")
                else if (phase === "latihan") { if (hasPraktik) setPhase("praktik"); else submit() }
                else if (phase === "praktik") submit()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function BottomButton({ phase, hasLatihan, hasPraktik, submitting, onNext }: {
  phase: Phase; hasLatihan: boolean; hasPraktik: boolean; submitting: boolean; onNext: () => void
}) {
  const isFinal = (phase === "praktik") || (phase === "latihan" && !hasPraktik) || (phase === "belajar" && !hasLatihan && !hasPraktik)
  const label = isFinal ? "Selesaikan Tugas" : phase === "belajar" ? "Lanjut ke Latihan" : "Lanjut ke Praktik"
  return (
    <button
      onClick={onNext}
      disabled={submitting}
      className="w-full py-3.5 bg-violet-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
    >
      {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : <>{label} <ArrowRight className="w-4 h-4" /></>}
    </button>
  )
}
