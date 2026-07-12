"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, ArrowLeft, Zap, Trophy, ArrowRight, Loader2, Sparkles, BookOpen, Lightbulb, Star } from "lucide-react"

interface Lesson {
  title: string
  levelBand: "dasar" | "menengah" | "tinggi"
  summary: string
  explanation: string
  examples: { label: string; text: string; note?: string }[]
  tips: string[]
  beforePracticePrompt: string
}

interface Question {
  id: string
  tipe: "pilihan_ganda" | "benar_salah" | "isi_blank"
  soal: string
  opsi?: string[]
}

interface Level {
  id: string
  title: string
  level: number
}

interface Unit {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  emoji: string | null
  xpReward: number
  coinReward: number
  level: Level | null
}

interface QuestionResult {
  correct: boolean
  correctAnswer: string | number
  correctIndex: number | null
  explanation: string | null
}

type Phase = "intro" | "lesson" | "question" | "result" | "complete"

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function LessonPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = use(params)
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("intro")
  const [unit, setUnit] = useState<Unit | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null)
  const [result, setResult] = useState<QuestionResult | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [earnedXp, setEarnedXp] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const isDasar = lesson?.levelBand === "dasar"
  const isMenengah = lesson?.levelBand === "menengah"
  const isTinggi = lesson?.levelBand === "tinggi"

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/jalur-cerdas/${unitId}`)
        if (!res.ok) throw new Error("Gagal memuat pelajaran")
        const data = await res.json()
        setUnit(data.unit)
        setLesson(data.lesson)
        setQuestions(data.questions || [])

        if (data.progress?.completed) {
          setPhase("complete")
          setCorrectCount(data.questions?.length || 0)
        }
      } catch (e: any) {
        setError(e.message || "Gagal memuat")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [unitId])

  async function handleAnswer(answer: string | number) {
    if (submitting) return
    setSelectedAnswer(answer)
    setSubmitting(true)
    const q = questions[currentIdx]
    try {
      const res = await fetch(`/api/jalur-cerdas/${unitId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answer }),
      })
      if (!res.ok) throw new Error("Gagal mengirim jawaban")
      const data: QuestionResult = await res.json()
      setResult(data)
      if (data.correct) setCorrectCount((c) => c + 1)
      setPhase("result")
    } catch (e: any) {
      setError(e.message || "Gagal mengirim")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContinue() {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1)
      setSelectedAnswer(null)
      setResult(null)
      setPhase("question")
    } else {
      await saveProgress()
      setPhase("complete")
    }
  }

  async function saveProgress() {
    const score = Math.round((correctCount / questions.length) * 100) || 0
    try {
      const res = await fetch(`/api/jalur-cerdas/${unitId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      })
      if (res.ok) {
        const data = await res.json()
        setEarnedXp(data.earnedXp || 0)
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">{error || "Unit tidak ditemukan"}</p>
        <button onClick={() => router.push("/arena/jalur-cerdas")} className="text-violet-600 underline">
          Kembali
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-purple-100">
        <BookOpen className="w-12 h-12 text-violet-300 mb-3" />
        <p className="text-gray-600 font-medium text-lg">Belum ada soal</p>
        <p className="text-gray-400 text-sm mt-1">Soal untuk unit ini sedang disiapkan</p>
        <button onClick={() => router.push("/arena/jalur-cerdas")} className="mt-6 text-violet-600 underline text-sm">
          Kembali
        </button>
      </div>
    )
  }

  const q = questions[currentIdx]
  const progressPct = Math.round(((result ? currentIdx + 1 : currentIdx) / questions.length) * 100)

  // ===== INTRO PHASE =====
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-500 to-purple-700 px-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className={`${isDasar ? "w-24 h-24" : "w-20 h-20"} bg-white/20 rounded-3xl flex items-center justify-center mb-6`}>
            <BookOpen className={`${isDasar ? "w-12 h-12" : "w-10 h-10"} text-white`} />
          </div>
          <h1 className={`${isDasar ? "text-3xl" : "text-2xl"} font-extrabold text-white mb-2`}>{unit.title}</h1>
          {unit.subtitle && <p className={`text-white/80 ${isDasar ? "text-base" : "text-sm"} mb-6`}>{unit.subtitle}</p>}
          <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold mb-8">
            <Zap className="w-4 h-4" />
            {unit.xpReward || 50} XP
          </div>
          <button
            onClick={() => setPhase("lesson")}
            className={`bg-white text-violet-700 font-bold ${isDasar ? "text-xl px-12 py-5" : "text-lg px-10 py-4"} rounded-2xl shadow-xl hover:scale-105 transition-transform active:scale-95`}
          >
            {lesson ? "Mulai Belajar" : "Mulai latihan"}
          </button>
        </div>
      </div>
    )
  }

  // ===== LESSON PHASE =====
  if (phase === "lesson" && lesson) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-50 to-purple-100">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/arena/jalur-cerdas/${unitId}`)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-gray-500">Materi Belajar</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Summary Card */}
          <div className={`bg-white rounded-2xl shadow-sm border border-violet-100 p-6 mb-4 mt-4 ${isDasar ? "text-lg" : isMenengah ? "text-base" : "text-sm"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Star className={`${isDasar ? "w-6 h-6" : "w-5 h-5"} text-violet-500`} />
              <h2 className={`font-bold text-violet-900 ${isDasar ? "text-xl" : "text-lg"}`}>Ringkasan</h2>
            </div>
            <p className={`text-gray-700 leading-relaxed ${isDasar ? "text-lg" : ""}`}>{lesson.summary}</p>
          </div>

          {/* Explanation Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className={`${isDasar ? "w-6 h-6" : "w-5 h-5"} text-indigo-500`} />
              <h2 className={`font-bold text-indigo-900 ${isDasar ? "text-xl" : "text-lg"}`}>Penjelasan</h2>
            </div>
            <p className={`text-gray-700 leading-relaxed ${isDasar ? "text-lg" : isMenengah ? "text-base" : "text-sm"}`}>
              {lesson.explanation}
            </p>
          </div>

          {/* Examples Cards */}
          {lesson.examples.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-amber-800 text-base mb-3 px-1">Contoh</h3>
              <div className="space-y-3">
                {lesson.examples.map((ex, i) => (
                  <div key={i} className={`bg-amber-50 border border-amber-200 rounded-2xl p-4 ${isDasar ? "text-lg" : "text-sm"}`}>
                    <p className="font-semibold text-amber-900 mb-1">{ex.label}</p>
                    <p className={`text-amber-800 ${isDasar ? "text-lg" : ""}`}>{ex.text}</p>
                    {ex.note && (
                      <p className={`mt-1 text-amber-600 italic ${isDasar ? "text-base" : "text-xs"}`}>{ex.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {lesson.tips.length > 0 && (
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className={`${isDasar ? "w-6 h-6" : "w-5 h-5"} text-cyan-600`} />
                <h3 className={`font-bold text-cyan-900 ${isDasar ? "text-xl" : "text-lg"}`}>Tips</h3>
              </div>
              <ul className="space-y-2">
                {lesson.tips.map((tip, i) => (
                  <li key={i} className={`flex items-start gap-2 text-gray-700 ${isDasar ? "text-lg" : "text-sm"}`}>
                    <span className="text-cyan-500 mt-0.5 shrink-0">✦</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={() => setPhase("question")}
            className={`w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold ${isDasar ? "text-xl py-5" : "text-lg py-4"} rounded-2xl hover:from-violet-700 hover:to-purple-700 transition-all active:scale-[0.98] shadow-lg shadow-violet-200`}
          >
            {lesson.beforePracticePrompt || "Yuk, coba latihan!"}
          </button>
        </div>
      </div>
    )
  }

  // ===== COMPLETE PHASE =====
  if (phase === "complete") {
    const pct = correctCount && questions.length
      ? Math.round((correctCount / questions.length) * 100) : 0
    const passed = pct >= 70

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-500 to-teal-700 px-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
            {passed ? (
              <Trophy className="w-12 h-12 text-yellow-300" />
            ) : (
              <Sparkles className="w-12 h-12 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">
            {passed ? "Hebat!" : "Unit selesai"}
          </h1>
          <p className="text-white/80 text-sm mb-4">
            {passed
              ? `Kamu menjawab ${correctCount} dari ${questions.length} soal dengan benar`
              : "Coba lagi untuk nilai yang lebih baik"}
          </p>
          <div className="w-48 h-2 bg-white/20 rounded-full mb-4">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-white text-lg font-bold">
            {pct}%
          </p>
          {earnedXp > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-bold">+{earnedXp} XP</span>
            </div>
          )}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => router.push("/arena/jalur-cerdas")}
              className="bg-white/20 text-white font-semibold px-5 py-3 rounded-xl hover:bg-white/30 transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => {
                setCurrentIdx(0)
                setSelectedAnswer(null)
                setResult(null)
                setCorrectCount(0)
                setEarnedXp(0)
                setPhase("question")
              }}
              className="bg-white text-violet-700 font-bold px-5 py-3 rounded-xl hover:scale-105 transition-transform"
            >
              Ulangi
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isResult = phase === "result"

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-50 to-purple-100">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push(`/arena/jalur-cerdas/${unitId}`)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 shrink-0">
            {result ? currentIdx + 1 : currentIdx}/{questions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-6 pb-8">
        <div className="flex-1 flex flex-col">
          {/* Question card */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 ${isDasar ? "text-lg" : "text-base"}`}>
            <p className={`font-medium text-violet-500 mb-2 ${isDasar ? "text-base" : "text-sm"}`}>
              {q.tipe === "pilihan_ganda" ? "Pilih jawaban yang tepat" :
               q.tipe === "benar_salah" ? "Benar atau salah?" :
               "Isilah titik-titik"}
            </p>
            <p className={`font-semibold text-gray-900 leading-relaxed ${isDasar ? "text-xl" : "text-lg"}`}>{q.soal}</p>
          </div>

          {/* Result feedback */}
          {isResult && result && (
            <div className={`rounded-2xl p-5 mb-4 ${result.correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.correct ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <span className={`font-bold ${result.correct ? "text-emerald-700" : "text-red-700"}`}>
                  {result.correct ? "Benar!" : "Kurang tepat"}
                </span>
              </div>
              {result.explanation && (
                <p className="text-sm text-gray-600 ml-8">{result.explanation}</p>
              )}
            </div>
          )}

          {/* Answer area — sits right under the question (no big gap) */}
          {!isResult && (
            <div className="flex flex-col gap-2.5 mt-1">
              {q.tipe === "pilihan_ganda" && q.opsi?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={submitting}
                  className={`w-full flex items-center gap-3 text-left p-4 rounded-2xl border-2 font-medium transition-all
                    ${selectedAnswer === i ? "border-violet-500 bg-violet-50" : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50"}
                    ${submitting ? "opacity-50 cursor-not-allowed" : ""}
                    ${isDasar ? "text-lg p-5" : "text-base"}
                  `}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 font-bold text-gray-500 shrink-0 ${isDasar ? "w-8 h-8" : ""}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
              {q.tipe === "benar_salah" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAnswer("Benar")}
                    disabled={submitting}
                    className={`flex-1 p-4 rounded-2xl border-2 font-semibold transition-all
                      ${selectedAnswer === "Benar" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"}
                      ${submitting ? "opacity-50 cursor-not-allowed" : ""}
                      ${isDasar ? "p-5 text-lg" : "text-base"}
                    `}
                  >
                    <CheckCircle2 className={`text-emerald-500 inline mr-2 ${isDasar ? "w-6 h-6" : "w-5 h-5"}`} />
                    Benar
                  </button>
                  <button
                    onClick={() => handleAnswer("Salah")}
                    disabled={submitting}
                    className={`flex-1 p-4 rounded-2xl border-2 font-semibold transition-all
                      ${selectedAnswer === "Salah" ? "border-red-500 bg-red-50" : "border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50"}
                      ${submitting ? "opacity-50 cursor-not-allowed" : ""}
                      ${isDasar ? "p-5 text-lg" : "text-base"}
                    `}
                  >
                    <XCircle className={`text-red-500 inline mr-2 ${isDasar ? "w-6 h-6" : "w-5 h-5"}`} />
                    Salah
                  </button>
                </div>
              )}
              {q.tipe === "isi_blank" && (
                <div className="flex gap-2">
                  <input
                    id="isi-blank-input"
                    type="text"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        handleAnswer((e.target as HTMLInputElement).value.trim())
                      }
                    }}
                    className={`flex-1 rounded-2xl border-2 border-gray-200 bg-white font-medium focus:border-violet-500 focus:outline-none ${isDasar ? "p-5 text-lg" : "p-4 text-base"}`}
                    placeholder="Ketik jawaban..."
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("isi-blank-input") as HTMLInputElement
                      if (input?.value.trim()) handleAnswer(input.value.trim())
                    }}
                    disabled={submitting}
                    className={`px-6 bg-violet-600 text-white font-semibold rounded-2xl hover:bg-violet-700 transition-colors disabled:opacity-50 ${isDasar ? "text-lg" : "text-base"}`}
                  >
                    Kirim
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Continue button */}
          {isResult && currentIdx + 1 <= questions.length && (
            <button
              onClick={handleContinue}
              className="mt-6 w-full bg-violet-600 text-white font-bold text-lg py-4 rounded-2xl hover:bg-violet-700 transition-colors active:scale-[0.98] shadow-lg shadow-violet-200"
            >
              {currentIdx + 1 < questions.length ? (
                <span className="flex items-center justify-center gap-2">
                  Lanjutkan <ArrowRight className="w-5 h-5" />
                </span>
              ) : (
                "Lihat hasil"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
