"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Lightbulb, Send, CheckCircle2, HelpCircle } from "lucide-react"

interface KontenPraktik {
  petunjuk: string
  tips: string[]
  contoh?: string
}

export default function PraktikPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [praktik, setPraktik] = useState<KontenPraktik | null>(null)
  const [judul, setJudul] = useState("")
  const [isi, setIsi] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [progressSaved, setProgressSaved] = useState(false)

  useEffect(() => {
    if (!sent || progressSaved) return
    setProgressSaved(true)
    fetch(`/api/jalur-cerdas/${unitId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "praktik" }),
    }).catch(() => {})
  }, [sent, progressSaved, unitId])

  useEffect(() => {
    fetch(`/api/jalur-cerdas/${unitId}`)
      .then(r => r.json())
      .then(d => { if (d.konten?.praktik) setPraktik(d.konten.praktik) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  const submit = async () => {
    if (!judul.trim() || !isi.trim()) return
    setSubmitting(true)
    try {
      await fetch("/api/siswa/karya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul: judul.trim(), isi: isi.trim(), tipe: "OPINI" }),
      })
      setSent(true)
    } catch {}
    setSubmitting(false)
  }

  if (loading) return <div className="px-4 py-6 arena-page space-y-3 animate-pulse">{/* skeleton */}</div>

  if (!praktik) return (
    <div className="px-4 py-6 arena-page text-center pt-20">
      <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">Praktik belum tersedia</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 font-semibold text-sm">Kembali</button>
    </div>
  )

  if (sent) return (
    <div className="px-4 py-6 arena-page text-center pt-16">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Tugas Terkirim!</h2>
      <p className="text-gray-500 mb-6">Karya kamu sudah dikirim ke feed Arena</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => router.push(`/arena/jalur-cerdas/${unitId}`)} className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
          Kembali ke Unit
        </button>
        <button onClick={() => router.push("/arena/feed")} className="px-5 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors">
          Lihat Feed
        </button>
      </div>
    </div>
  )

  return (
    <div className="px-4 py-6 arena-page">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="text-xs text-violet-600 font-semibold">Praktik</p>
          <h1 className="text-lg font-bold text-gray-900">Tugas Menulis</h1>
        </div>
      </div>

      {/* Petunjuk */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-violet-600" />
          <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Petunjuk</p>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{praktik.petunjuk}</p>
      </div>

      {/* Tips */}
      {praktik.tips.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Tips</p>
          <ul className="space-y-1">
            {praktik.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contoh */}
      {praktik.contoh && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Contoh</p>
          <p className="text-sm text-emerald-800 whitespace-pre-line leading-relaxed">{praktik.contoh}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Judul</label>
          <input
            value={judul}
            onChange={e => setJudul(e.target.value)}
            placeholder="Beri judul karyamu..."
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Tulisan</label>
          <textarea
            value={isi}
            onChange={e => setIsi(e.target.value)}
            placeholder="Tulis karyamu di sini..."
            rows={8}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
          />
        </div>
        <button
          onClick={submit}
          disabled={!judul.trim() || !isi.trim() || submitting}
          className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Mengirim..." : "Kirim Karya"}
        </button>
      </div>
    </div>
  )
}
