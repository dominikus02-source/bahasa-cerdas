"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Timer, CheckCircle2, XCircle, HelpCircle, Award, Zap, Check, X, Lightbulb, TimerReset } from "lucide-react"
import { usePowerUps } from "@/hooks/usePowerUps"
import ConfettiBurst from "@/components/game/ConfettiBurst"
import { pilihOpsiSalah } from "@/lib/power-up-hint"

interface SoalKuis {
  id: number
  tipe?: "PG" | "BENAR_SALAH" | "ISIAN"
  soal: string
  opsi: string[]
  jawaban: number | string
}

/** Batas pemakaian Time Extension dalam satu sesi kuis (3 × 30 detik). */
const MAKS_TAMBAH_WAKTU = 3

export default function KuisPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [soalList, setSoalList] = useState<SoalKuis[]>([])
  const [current, setCurrent] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number | string>>({})
  const [selesai, setSelesai] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(120)
  const [started, setStarted] = useState(false)
  const [showingResult, setShowingResult] = useState(false)
  const [progressSaved, setProgressSaved] = useState(false)
  const [inputIsian, setInputIsian] = useState("")
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Item bantuan dari Toko Koin. Murid yang tidak punya apa pun: semua nol,
  // tombolnya tidak dirender, dan kuis berjalan persis seperti sebelumnya.
  const { hintCount, timeCount, confettiAktif, consume, error: powerUpError, clearError } = usePowerUps()
  // Opsi yang sudah dicoret per soal — sekali terisi, tidak pernah dihitung ulang.
  const [opsiDicoret, setOpsiDicoret] = useState<Record<number, number>>({})
  const [hintProses, setHintProses] = useState(false)
  const [tambahWaktuDipakai, setTambahWaktuDipakai] = useState(0)
  const [waktuProses, setWaktuProses] = useState(false)
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const benar = soalList.filter(s => {
    const j = jawaban[s.id]
    if (j === undefined) return false
    if (s.tipe === "ISIAN") return j === s.jawaban
    return j === s.jawaban
  }).length
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
  const tipe = soal?.tipe || "PG"
  const picked = jawaban[soal?.id]
  const showResult = picked !== undefined
  const isCorrect = tipe === "ISIAN"
    ? picked === soal?.jawaban
    : picked === soal?.jawaban

  const dicoret = soal ? opsiDicoret[soal.id] : undefined
  const bolehPakaiHint = tipe === "PG" && !showResult && dicoret === undefined && hintCount > 0

  /** Pakai Hint Token: coret satu opsi salah — HANYA kalau server sudah mengurangi stok. */
  const pakaiHint = async () => {
    if (!soal || !bolehPakaiHint || hintProses) return
    const target = pilihOpsiSalah(`${unitId}-${soal.id}`, soal.opsi.length, soal.jawaban as number)
    if (target === null) return
    setHintProses(true)
    const berhasil = await consume("HINT_TOKEN")
    setHintProses(false)
    if (!berhasil) return
    setOpsiDicoret(prev => (prev[soal.id] !== undefined ? prev : { ...prev, [soal.id]: target }))
  }

  /** Pakai Time Extension: +30 detik untuk sisa kuis. */
  const pakaiTambahWaktu = async () => {
    if (waktuProses || timeCount <= 0 || tambahWaktuDipakai >= MAKS_TAMBAH_WAKTU || selesai) return
    setWaktuProses(true)
    const berhasil = await consume("TIME_EXTENSION")
    setWaktuProses(false)
    if (!berhasil) return
    setTambahWaktuDipakai(n => n + 1)
    setTimeLeft(t => t + 30)
  }

  const rayakanJawabanBenar = () => {
    if (confettiAktif) setConfettiTrigger(t => t + 1)
  }

  const pilihPG = (idx: number) => {
    if (showResult) return
    if (dicoret === idx) return
    setJawaban(prev => ({ ...prev, [soal.id]: idx }))
    if (idx === soal.jawaban) rayakanJawabanBenar()
    setShowingResult(true)
    setTimeout(() => {
      setShowingResult(false)
      nextSoal()
    }, 1200)
  }

  const pilihBS = (idx: number) => {
    if (showResult) return
    setJawaban(prev => ({ ...prev, [soal.id]: idx }))
    if (idx === soal.jawaban) rayakanJawabanBenar()
    setShowingResult(true)
    setTimeout(() => {
      setShowingResult(false)
      nextSoal()
    }, 1200)
  }

  const submitIsian = () => {
    if (showResult || !inputIsian.trim()) return
    const jawab = inputIsian.trim().toLowerCase()
    const kunci = (soal.jawaban as string).toLowerCase()
    setJawaban(prev => ({ ...prev, [soal.id]: jawab === kunci ? soal.jawaban : jawab }))
    if (jawab === kunci) rayakanJawabanBenar()
    setShowingResult(true)
    setTimeout(() => {
      setShowingResult(false)
      setInputIsian("")
      nextSoal()
    }, 1500)
  }

  const nextSoal = () => {
    if (current < soalList.length - 1) {
      setCurrent(c => c + 1)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setSelesai(true)
    }
  }

  const getJawabanBenar = (s: SoalKuis) => {
    if (s.tipe === "ISIAN") return s.jawaban as string
    return s.opsi[s.jawaban as number]
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
      {confettiAktif && <ConfettiBurst trigger={confettiTrigger} />}
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
            <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${(current + 1 / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Item bantuan — hanya muncul kalau murid memilikinya */}
      {(bolehPakaiHint || dicoret !== undefined || timeCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {tipe === "PG" && dicoret !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <Lightbulb className="w-3.5 h-3.5" /> Petunjuk terpakai di soal ini
            </span>
          )}
          {bolehPakaiHint && (
            <button onClick={pakaiHint} disabled={hintProses}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-200 disabled:opacity-60 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {hintProses ? "Memakai…" : `Coret 1 opsi salah (${hintCount})`}
            </button>
          )}
          {timeCount > 0 && (
            <button onClick={pakaiTambahWaktu} disabled={waktuProses || tambahWaktuDipakai >= MAKS_TAMBAH_WAKTU}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 border border-sky-300 text-sky-800 text-xs font-bold hover:bg-sky-200 disabled:opacity-50 transition-colors"
            >
              <TimerReset className="w-3.5 h-3.5" />
              {tambahWaktuDipakai >= MAKS_TAMBAH_WAKTU
                ? "Batas tambah waktu tercapai"
                : waktuProses ? "Menambah…" : `+30 detik (${timeCount})`}
            </button>
          )}
        </div>
      )}

      {powerUpError && (
        <div className="mb-3 flex items-center justify-between gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs text-red-700 font-medium">{powerUpError}</p>
          <button onClick={clearError} className="text-red-500 shrink-0" aria-label="Tutup pesan">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Soal */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 min-h-[200px]">
        <p className="text-base font-bold text-gray-900 leading-relaxed mb-5">{soal.soal}</p>

        {tipe === "PG" && (
          <div className="space-y-2.5">
            {soal.opsi.map((o, idx) => {
              const letters = ["A", "B", "C", "D"]
              const isSelected = picked === idx
              const isRight = idx === soal.jawaban
              const isDicoret = dicoret === idx
              let btnClass = "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50"

              if (isDicoret && !showResult) btnClass = "border-gray-100 bg-gray-50 opacity-50 line-through cursor-not-allowed"

              if (showResult) {
                if (isRight) btnClass = "border-emerald-400 bg-emerald-50"
                else if (isSelected && !isRight) btnClass = "border-red-400 bg-red-50"
                else btnClass = "border-gray-100 bg-gray-50 opacity-60"
              }

              return (
                <button key={idx} onClick={() => pilihPG(idx)} disabled={showResult || isDicoret}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${btnClass}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    showResult && isRight ? "bg-emerald-500 text-white" :
                    showResult && isSelected && !isRight ? "bg-red-500 text-white" :
                    isSelected ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {showResult && isRight ? <CheckCircle2 className="w-4 h-4" /> :
                     showResult && isSelected && !isRight ? <XCircle className="w-4 h-4" /> :
                     !showResult && isDicoret ? <X className="w-4 h-4" /> :
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
        )}

        {tipe === "BENAR_SALAH" && (
          <div className="flex gap-3">
            {["Benar", "Salah"].map((label, idx) => {
              const isSelected = picked === idx
              const isRight = idx === soal.jawaban
              let btnClass = "flex-1 border-2 border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50"

              if (showResult) {
                if (isRight) btnClass = "flex-1 border-2 border-emerald-400 bg-emerald-50"
                else if (isSelected && !isRight) btnClass = "flex-1 border-2 border-red-400 bg-red-50"
                else btnClass = "flex-1 border-2 border-gray-100 bg-gray-50 opacity-60"
              }

              return (
                <button key={idx} onClick={() => pilihBS(idx)} disabled={showResult}
                  className={`${btnClass} py-4 rounded-xl text-center font-bold text-sm transition-all`}
                >
                  <span className={`flex justify-center mb-0.5 ${idx === 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {idx === 0 ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {tipe === "ISIAN" && (
          <div className="space-y-3">
            <input
              value={inputIsian}
              onChange={e => setInputIsian(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitIsian()}
              placeholder="Ketik jawabanmu..."
              disabled={showResult}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50"
              autoFocus
            />
            {!showResult && (
              <button onClick={submitIsian} disabled={!inputIsian.trim()}
                className="px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all text-sm"
              >
                Jawab
              </button>
            )}
          </div>
        )}
      </div>

      {showingResult && (
        <div className={`p-4 rounded-xl border mb-4 animate-fade-in ${
          isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-1.5">
            {isCorrect ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm font-bold text-emerald-700">Benar!</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-bold text-red-700">Kurang tepat</span></>
            )}
          </div>
          {!isCorrect && (
            <p className="text-xs text-gray-500 mt-1">Jawaban benar: <strong className="text-gray-800">{getJawabanBenar(soal)}</strong></p>
          )}
        </div>
      )}
    </div>
  )
}
