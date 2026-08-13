"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, HelpCircle, Award, Check, X, Lightbulb } from "lucide-react"
import { usePowerUps } from "@/hooks/usePowerUps"
import ConfettiBurst from "@/components/game/ConfettiBurst"
import { pilihOpsiSalah } from "@/lib/power-up-hint"

interface Soal {
  id: number
  tipe?: "PG" | "BENAR_SALAH" | "ISIAN"
  soal: string
  opsi: string[]
  jawaban: number | string
  penjelasan: string
}

export default function LatihanPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const [soalList, setSoalList] = useState<Soal[]>([])
  const [current, setCurrent] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number | string>>({})
  const [selesai, setSelesai] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inputIsian, setInputIsian] = useState("")

  // Item bantuan dari Toko Koin (Hint Token + efek confetti). Tanpa item,
  // semuanya nol/false dan halaman ini berperilaku persis seperti sebelumnya.
  const { hintCount, confettiAktif, consume, error: powerUpError, clearError } = usePowerUps()
  const [opsiDicoret, setOpsiDicoret] = useState<Record<number, number>>({})
  const [hintProses, setHintProses] = useState(false)
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  useEffect(() => {
    fetch(`/api/jalur-cerdas/${unitId}`)
      .then(r => r.json())
      .then(d => { if (d.konten?.latihan) setSoalList(d.konten.latihan) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  const soal = soalList[current]
  const tipe = soal?.tipe || "PG"
  const picked = jawaban[soal?.id]
  const showResult = picked !== undefined
  const isCorrect = tipe === "ISIAN"
    ? picked === soal?.jawaban
    : picked === soal?.jawaban

  const dicoret = soal ? opsiDicoret[soal.id] : undefined
  const bolehPakaiHint = tipe === "PG" && !showResult && dicoret === undefined && hintCount > 0

  const rayakanJawabanBenar = () => {
    if (confettiAktif) setConfettiTrigger(t => t + 1)
  }

  /** Hint Token: coret satu opsi salah, hanya setelah server berhasil mengurangi stok. */
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

  const pilihPG = (idx: number) => {
    if (showResult) return
    if (dicoret === idx) return
    setJawaban(prev => ({ ...prev, [soal.id]: idx }))
    if (idx === soal.jawaban) rayakanJawabanBenar()
  }

  const pilihBS = (idx: number) => {
    if (showResult) return
    setJawaban(prev => ({ ...prev, [soal.id]: idx }))
    if (idx === soal.jawaban) rayakanJawabanBenar()
  }

  const submitIsian = () => {
    if (showResult || !inputIsian.trim()) return
    const jawab = inputIsian.trim().toLowerCase()
    const kunci = (soal.jawaban as string).toLowerCase()
    setJawaban(prev => ({ ...prev, [soal.id]: jawab === kunci ? soal.jawaban : jawab }))
    if (jawab === kunci) rayakanJawabanBenar()
  }

  const getJawabanBenar = (s: Soal) => {
    if (s.tipe === "ISIAN") return s.jawaban as string
    return s.opsi[s.jawaban as number]
  }

  const next = () => {
    setInputIsian("")
    if (current < soalList.length - 1) {
      setCurrent(c => c + 1)
    } else {
      setSelesai(true)
    }
  }

  const benar = soalList.filter(s => {
    const j = jawaban[s.id]
    if (j === undefined) return false
    if (s.tipe === "ISIAN") return j === s.jawaban
    return j === s.jawaban
  }).length
  const total = soalList.length

  if (loading) return (
    <div className="px-4 py-6 arena-page space-y-3 animate-pulse">
      {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800/80 rounded-2xl" />)}
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
      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mb-1">Latihan Selesai!</h2>
      <p className="text-gray-500 dark:text-slate-400 mb-6">Kamu menjawab {benar} dari {total} soal</p>
      <div className="w-32 h-32 rounded-full border-4 border-violet-200 dark:border-violet-800 flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl font-extrabold text-violet-600 dark:text-violet-400">{Math.round((benar / total) * 100)}%</span>
      </div>
      <button onClick={() => router.push(`/arena/jalur-cerdas/${unitId}`)} className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors">
        Kembali ke Unit
      </button>
    </div>
  )

  if (soalList.length === 0) return (
    <div className="px-4 py-6 arena-page text-center pt-20">
      <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 dark:text-slate-400">Latihan belum tersedia</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 dark:text-violet-400 font-semibold text-sm">Kembali</button>
    </div>
  )

  const tipeLabel = tipe === "BENAR_SALAH" ? "Benar/Salah" : tipe === "ISIAN" ? "Isian Singkat" : "Pilihan Ganda"

  return (
    <div className="px-4 py-6 arena-page">
      {confettiAktif && <ConfettiBurst trigger={confettiTrigger} />}
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800/80 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">Latihan — {tipeLabel}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-slate-400">Soal {current + 1} dari {total}</p>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[120px]">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Item bantuan — hanya muncul kalau murid punya Hint Token */}
      {(bolehPakaiHint || dicoret !== undefined) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {dicoret !== undefined ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Lightbulb className="w-3.5 h-3.5" /> Petunjuk terpakai di soal ini
            </span>
          ) : (
            <button onClick={pakaiHint} disabled={hintProses}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 dark:border-amber-700 text-amber-800 text-xs font-bold hover:bg-amber-200 disabled:opacity-60 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {hintProses ? "Memakai…" : `Coret 1 opsi salah (${hintCount})`}
            </button>
          )}
        </div>
      )}

      {powerUpError && (
        <div className="mb-3 flex items-center justify-between gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">{powerUpError}</p>
          <button onClick={clearError} className="text-red-500 dark:text-red-400 shrink-0" aria-label="Tutup pesan">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Soal */}
      <div className="bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-sm font-medium text-gray-400 mb-1">Soal #{current + 1}</p>
        <p className="text-base font-bold text-gray-900 dark:text-slate-100 leading-relaxed mb-5">{soal.soal}</p>

        {tipe === "PG" && (
          <div className="space-y-2.5">
            {soal.opsi.map((o, idx) => {
              const letters = ["A", "B", "C", "D"]
              const isSelected = picked === idx
              const isRight = idx === soal.jawaban
              const isDicoret = dicoret === idx
              let btnClass = "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-violet-300 hover:bg-violet-50"

              if (isDicoret && !showResult) btnClass = "border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 opacity-50 line-through cursor-not-allowed"

              if (showResult) {
                if (isRight) btnClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                else if (isSelected && !isRight) btnClass = "border-red-400 bg-red-50 dark:bg-red-950/40"
                else btnClass = "border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 opacity-60"
              }

              return (
                <button key={idx} onClick={() => pilihPG(idx)} disabled={!showResult && isDicoret}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${btnClass}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    showResult && isRight ? "bg-emerald-500 text-white" :
                    showResult && isSelected && !isRight ? "bg-red-500 text-white" :
                    isSelected ? "bg-violet-500 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500"
                  }`}>
                    {showResult && isRight ? <CheckCircle2 className="w-4 h-4" /> :
                     showResult && isSelected && !isRight ? <XCircle className="w-4 h-4" /> :
                     !showResult && isDicoret ? <X className="w-4 h-4" /> :
                     letters[idx]}
                  </span>
                  <span className={`text-sm font-medium ${
                    showResult && isRight ? "text-emerald-700 dark:text-emerald-300" :
                    showResult && isSelected && !isRight ? "text-red-700 dark:text-red-300" :
                    "text-gray-700 dark:text-slate-300"
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
              let btnClass = "flex-1 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-violet-300 hover:bg-violet-50"

              if (showResult) {
                if (isRight) btnClass = "flex-1 border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                else if (isSelected && !isRight) btnClass = "flex-1 border-2 border-red-400 bg-red-50 dark:bg-red-950/40"
                else btnClass = "flex-1 border-2 border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 opacity-60"
              }

              return (
                <button key={idx} onClick={() => pilihBS(idx)}
                  className={`${btnClass} py-4 rounded-xl text-center font-bold text-sm transition-all`}
                >
                  <span className={`flex justify-center mb-0.5 ${idx === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
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
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50 dark:bg-slate-800/60 disabled:cursor-not-allowed"
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

      {/* Penjelasan */}
      {showResult && (
        <div className={`p-4 rounded-xl border mb-4 animate-fade-in ${
          isCorrect ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            {isCorrect ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Benar!</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-red-600 dark:text-red-400" /><span className="text-sm font-bold text-red-700 dark:text-red-300">Kurang tepat</span></>
            )}
          </div>
          {!isCorrect && (
            <p className="text-xs text-gray-500 mb-1">Jawaban benar: <strong className="text-gray-800 dark:text-slate-200">{getJawabanBenar(soal)}</strong></p>
          )}
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{soal.penjelasan}</p>
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
