"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Timer, CheckCircle2, XCircle, ChevronRight, HelpCircle, Award, Zap } from "lucide-react"

interface SoalKuis {
  id: number
  soal: string
  opsi: string[]
  jawaban: number
}

export default function KuisPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [soalList, setSoalList] = useState<SoalKuis[]>([])
  const [current, setCurrent] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [selesai, setSelesai] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(120)
  const [started, setStarted] = useState(false)
  const [showingResult, setShowingResult] = useState(false)
  const [progressSaved, setProgressSaved] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const benar = soalList.filter(s => jawaban[s.id] === s.jawaban).length
  const total = soalList.length
  const skor = total > 0 ? Math.round((benar / total) * 100) : 0
  const grade = skor >= 85 ? "A" : skor >= 70 ? "B" : skor >= 55 ? "C" : "D"

  useEffect(() => {
    if (!selesai || progressSaved || soalList.length === 0) return
    setProgressSaved(true)
    const pct = Math.round((benar / soalList.length) * 100)
    fetch(`/api/jalur-cerdas/${unitId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: pct }),
    }).catch(() => {})
  }, [selesai, progressSaved, benar, soalList.length, unitId])

  useEffect(() => {
    fetch(`/api/jalur-cerdas/${unitId}`)
      .then(r => r.json())
      .then(d => { if (d.konten?.kuis) setSoalList(d.konten.kuis) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setSelesai(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const mulai = () => {
    setStarted(true)
    startTimer()
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const soal = soalList[current]
  const picked = jawaban[soal?.id]
  const showResult = picked !== undefined

  const pilih = (idx: number) => {
    if (showResult) return
    setJawaban(prev => ({ ...prev, [soal.id]: idx }))
    setShowingResult(true)
    setTimeout(() => {
      setShowingResult(false)
      if (current < soalList.length - 1) {
        setCurrent(c => c + 1)
      } else {
        if (timerRef.current) clearInterval(timerRef.current)
        setSelesai(true)
      }
    }, 1500)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  if (loading) return <div className="px-4 py-6 arena-page space-y-3 animate-pulse">{/* skeleton */}</div>
  if (soalList.length === 0) return (
    <div className="px-4 py-6 arena-page text-center pt-20">
      <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">Kuis belum tersedia</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 font-semibold text-sm">Kembali</button>
    </div>
  )

  if (!started) return (
    <div className="px-4 py-6 arena-page text-center pt-16">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Zap className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Kuis</h2>
      <p className="text-gray-500 mb-2">{total} soal • {minutes}:{seconds.toString().padStart(2, "0")} menit</p>
      <p className="text-sm text-gray-400 mb-6">Jawab secepat dan setepat mungkin!</p>
      <button onClick={mulai} className="px-8 py-3.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-lg">
        Mulai Kuis
      </button>
    </div>
  )

  if (selesai) return (
    <div className="px-4 py-6 arena-page text-center pt-12">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Award className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Kuis Selesai!</h2>
      <p className="text-gray-500 mb-4">Skor: {benar}/{total}</p>
      <div className="w-36 h-36 rounded-full border-4 border-rose-200 flex items-center justify-center mx-auto mb-4">
        <div>
          <span className="text-4xl font-extrabold text-rose-600 block">{skor}%</span>
          <span className="text-lg font-bold text-rose-500">Grade {grade}</span>
        </div>
      </div>
      {grade === "A" && <p className="text-sm text-emerald-600 font-bold mb-6">Luar biasa! Pertahankan!</p>}
      {grade === "B" && <p className="text-sm text-blue-600 font-bold mb-6">Bagus! Tingkatkan lagi!</p>}
      {grade === "C" && <p className="text-sm text-amber-600 font-bold mb-6">Cukup. Ayo belajar lagi!</p>}
      {grade === "D" && <p className="text-sm text-red-600 font-bold mb-6">Ayo ulang dan belajar lebih giat!</p>}
      <button onClick={() => router.push(`/arena/jalur-cerdas/${unitId}`)} className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors">
        Kembali ke Unit
      </button>
    </div>
  )

  return (
    <div className="px-4 py-6 arena-page">
      {/* Header with timer */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-violet-600 font-semibold">Kuis • Soal {current + 1}/{total}</p>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
              timeLeft < 30 ? "bg-red-100 text-red-700 animate-pulse" : "bg-gray-100 text-gray-600"
            }`}>
              <Timer className="w-3.5 h-3.5" />
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${(benar / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Soal */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 min-h-[200px]">
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
                disabled={showResult}
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

      {showingResult && (
        <div className={`p-4 rounded-xl border mb-4 animate-fade-in ${
          picked === soal.jawaban ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-1.5">
            {picked === soal.jawaban ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm font-bold text-emerald-700">Benar!</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-bold text-red-700">Kurang tepat</span></>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
