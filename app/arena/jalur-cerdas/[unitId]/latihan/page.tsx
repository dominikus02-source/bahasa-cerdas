"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, HelpCircle, Award } from "lucide-react"

interface Soal {
  id: number
  soal: string
  opsi: string[]
  jawaban: number
  penjelasan: string
}

export default function LatihanPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [soalList, setSoalList] = useState<Soal[]>([])
  const [current, setCurrent] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [selesai, setSelesai] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/jalur-cerdas/${unitId}`)
      .then(r => r.json())
      .then(d => { if (d.konten?.latihan) setSoalList(d.konten.latihan) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  const soal = soalList[current]
  const picked = jawaban[soal?.id]
  const isCorrect = picked === soal?.jawaban
  const showResult = picked !== undefined

  const pilih = (idx: number) => {
    if (showResult) return
    setJawaban(prev => ({ ...prev, [soal.id]: idx }))
  }

  const next = () => {
    if (current < soalList.length - 1) {
      setCurrent(c => c + 1)
    } else {
      setSelesai(true)
    }
  }

  const benar = soalList.filter(s => jawaban[s.id] === s.jawaban).length
  const total = soalList.length

  if (loading) return (
    <div className="px-4 py-6 arena-page space-y-3 animate-pulse">
      {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
    </div>
  )

  const [progressSaved, setProgressSaved] = useState(false)

  useEffect(() => {
    if (!selesai || progressSaved || total === 0) return
    setProgressSaved(true)
    const pct = Math.round((benar / total) * 100)
    fetch(`/api/jalur-cerdas/${unitId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: pct }),
    }).catch(() => {})
  }, [selesai, progressSaved, benar, total, unitId])

  if (selesai) return (
    <div className="px-4 py-6 arena-page text-center pt-16">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Award className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Latihan Selesai!</h2>
      <p className="text-gray-500 mb-6">Kamu menjawab {benar} dari {total} soal</p>
      <div className="w-32 h-32 rounded-full border-4 border-violet-200 flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl font-extrabold text-violet-600">{Math.round((benar / total) * 100)}%</span>
      </div>
      <button onClick={() => router.push(`/arena/jalur-cerdas/${unitId}`)} className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors">
        Kembali ke Unit
      </button>
    </div>
  )

  if (soalList.length === 0) return (
    <div className="px-4 py-6 arena-page text-center pt-20">
      <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">Latihan belum tersedia</p>
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
        <div className="flex-1">
          <p className="text-xs text-violet-600 font-semibold">Latihan</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">Soal {current + 1} dari {total}</p>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[120px]">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Soal */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-sm font-medium text-gray-400 mb-1">Soal #{current + 1}</p>
        <p className="text-base font-bold text-gray-900 leading-relaxed mb-5">{soal.soal}</p>

        <div className="space-y-2.5">
          {soal.opsi.map((o, idx) => {
            const letters = ["A", "B", "C", "D"]
            const isSelected = picked === idx
            const isRight = idx === soal.jawaban
            let btnClass = "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50"

            if (showResult) {
              if (isRight) btnClass = "border-emerald-400 bg-emerald-50"
              else if (isSelected && !isRight) btnClass = "border-red-400 bg-red-50"
              else btnClass = "border-gray-100 bg-gray-50 opacity-60"
            }

            return (
              <button
                key={idx}
                onClick={() => pilih(idx)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${btnClass}`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  showResult && isRight ? "bg-emerald-500 text-white" :
                  showResult && isSelected && !isRight ? "bg-red-500 text-white" :
                  isSelected ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {showResult && isRight ? <CheckCircle2 className="w-4 h-4" /> :
                   showResult && isSelected && !isRight ? <XCircle className="w-4 h-4" /> :
                   letters[idx]}
                </span>
                <span className={`text-sm font-medium ${
                  showResult && isRight ? "text-emerald-700" :
                  showResult && isSelected && !isRight ? "text-red-700" :
                  "text-gray-700"
                }`}>{o}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Penjelasan */}
      {showResult && (
        <div className={`p-4 rounded-xl border mb-4 animate-fade-in ${
          isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            {isCorrect ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm font-bold text-emerald-700">Benar!</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-bold text-red-700">Kurang tepat</span></>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{soal.penjelasan}</p>
        </div>
      )}

      {/* Next */}
      {showResult && (
        <button onClick={next} className="w-full py-3.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
          {current < total - 1 ? <>Lanjut <ChevronRight className="w-4 h-4" /></> : "Lihat Hasil"}
        </button>
      )}
    </div>
  )
}
