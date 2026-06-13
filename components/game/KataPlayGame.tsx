"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart, Star, Trophy, Zap, RefreshCw, Crown, BookOpen,
  ChevronRight, Lock, Sparkles, Volume2,
} from "lucide-react"
import { kataPlayLevels, KataPlayLevel, KataPlayQuestion, KataPlayLesson } from "./kataplay-content"

const XpRewardCorrect = 50
const XpRewardBonus = 25
const StreakBonus = 10
const TotalRounds = 10

const levelColors = [
  { bg: "from-violet-500 to-purple-600", card: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
  { bg: "from-emerald-500 to-teal-600", card: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  { bg: "from-blue-500 to-cyan-600", card: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  { bg: "from-orange-500 to-amber-600", card: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
  { bg: "from-pink-500 to-rose-600", card: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
  { bg: "from-teal-500 to-emerald-600", card: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" },
  { bg: "from-indigo-500 to-violet-600", card: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" },
  { bg: "from-rose-500 to-pink-600", card: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
]

const characterIcons: Record<string, string> = {
  zelby: "🤖", hazel: "🐱", alby: "✨",
}

type Phase = "splash" | "levels" | "lessons" | "playing" | "result"

type ProgressData = {
  completedLessons: string[]
  xp: number
}

function loadProgress(): ProgressData {
  if (typeof window === "undefined") return { completedLessons: [], xp: 0 }
  try {
    const raw = localStorage.getItem("kataplay-progress")
    if (raw) return JSON.parse(raw)
  } catch {}
  return { completedLessons: [], xp: 0 }
}

function saveProgress(data: ProgressData) {
  localStorage.setItem("kataplay-progress", JSON.stringify(data))
}

function pickQuestions(level: KataPlayLevel, count: number): KataPlayQuestion[] {
  const all = level.lessons.flatMap((l) => l.questions)
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export default function KataPlayGame({ hideBackButton }: { hideBackButton?: boolean }) {
  const [phase, setPhase] = useState<Phase>("splash")
  const [progress, setProgress] = useState<ProgressData>({ completedLessons: [], xp: 0 })

  // Level select
  const [selectedLevel, setSelectedLevel] = useState<KataPlayLevel | null>(null)

  // Lesson select
  const [levelLessons, setLevelLessons] = useState<KataPlayLesson[]>([])

  // Playing
  const [questions, setQuestions] = useState<KataPlayQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [shakeInput, setShakeInput] = useState(false)

  useEffect(() => {
    setProgress(loadProgress())
    const timer = setTimeout(() => setPhase("levels"), 2200)
    return () => clearTimeout(timer)
  }, [])

  const updateProgress = useCallback((newXp: number, lessonId?: string) => {
    setProgress((prev) => {
      const completed = lessonId && !prev.completedLessons.includes(lessonId)
        ? [...prev.completedLessons, lessonId]
        : prev.completedLessons
      const data = { xp: prev.xp + newXp, completedLessons: completed }
      saveProgress(data)
      return data
    })
  }, [])

  function isLevelUnlocked(level: KataPlayLevel): boolean {
    if (level.levelNumber === 1) return true
    const prevLevel = kataPlayLevels.find((l) => l.levelNumber === level.levelNumber - 1)
    if (!prevLevel) return true
    return prevLevel.lessons.every((l) => progress.completedLessons.includes(l.id))
  }

  function handleLevelSelect(level: KataPlayLevel) {
    setSelectedLevel(level)
    setLevelLessons(level.lessons)
    setPhase("lessons")
  }

  function handleLessonSelect(lesson: KataPlayLesson) {
    const pool = lesson.questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setQuestions(shuffled.slice(0, Math.min(TotalRounds, shuffled.length)))
    setCurrentQ(0)
    setLives(3)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setWrong(0)
    setSelected(null)
    setFeedback(null)
    setPhase("playing")
  }

  function handleLevelPlayAll(level: KataPlayLevel) {
    const picked = pickQuestions(level, TotalRounds)
    setQuestions(picked)
    setCurrentQ(0)
    setLives(3)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setWrong(0)
    setSelected(null)
    setFeedback(null)
    setPhase("playing")
  }

  function handleAnswer(idx: number) {
    if (selected !== null || feedback !== null) return
    const q = questions[currentQ]
    const isCorrect = q.options[idx] === q.correctAnswer || idx.toString() === q.correctAnswer || idx === parseInt(q.correctAnswer)

    setSelected(idx)

    if (isCorrect) {
      const bonus = streak * StreakBonus
      const points = XpRewardCorrect + bonus
      const newStreak = streak + 1
      setScore((s) => s + points)
      setStreak(newStreak)
      setBestStreak((b) => Math.max(b, newStreak))
      setCorrect((c) => c + 1)
      setFeedback({ correct: true, message: `+${points}` })
    } else {
      const newLives = lives - 1
      setLives(newLives)
      setStreak(0)
      setWrong((w) => w + 1)
      setShakeInput(true)
      setTimeout(() => setShakeInput(false), 500)
      if (newLives <= 0) {
        setFeedback({ correct: false, message: `Jawaban: ${q.correctAnswer}` })
        setTimeout(() => {
          const earned = Math.floor(score / 2)
          updateProgress(earned)
          setPhase("result")
        }, 2000)
        return
      }
      setFeedback({ correct: false, message: `Jawaban: ${q.correctAnswer} · ${newLives} nyawa` })
    }

    setTimeout(() => {
      setSelected(null)
      setFeedback(null)
      if (currentQ < questions.length - 1) {
        setCurrentQ((c) => c + 1)
      } else {
        const earned = score + correct * XpRewardBonus
        updateProgress(earned)
        setPhase("result")
      }
    }, 1200)
  }

  const restart = () => {
    setPhase("levels")
    setSelectedLevel(null)
    setLevelLessons([])
    setQuestions([])
    setCurrentQ(0)
    setScore(0)
    setLives(3)
    setStreak(0)
    setBestStreak(0)
    setCorrect(0)
    setWrong(0)
    setSelected(null)
    setFeedback(null)
  }

  // ── Splash ──
  if (phase === "splash") {
    return (
      <div className="fixed inset-0 z-[60] bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/40"
          >
            <BookOpen size={52} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-white mb-2">KataPlay</h1>
          <p className="text-violet-200/70 text-base">Belajar membaca jadi seru!</p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="h-1 bg-violet-400/50 rounded-full mx-auto mt-8"
          />
        </motion.div>
      </div>
    )
  }

  // ── Level Select ──
  if (phase === "levels") {
    return (
      <div className="min-h-screen bg-[#0D0A1F] flex flex-col">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white">KataPlay</h1>
              <p className="text-sm text-[#7C7A9E] mt-0.5">Pilih tingkat belajar</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-amber-400">{progress.xp}</span>
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7C7A9E" }}>Tingkat</div>

          <div className="grid grid-cols-2 gap-3">
            {kataPlayLevels.map((level, i) => {
              const unlocked = isLevelUnlocked(level)
              const color = levelColors[i % levelColors.length]
              const done = level.lessons.every((l) => progress.completedLessons.includes(l.id))
              return (
                <motion.button
                  key={level.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => unlocked && handleLevelSelect(level)}
                  disabled={!unlocked}
                  className={`relative overflow-hidden p-4 rounded-[20px] border text-left transition-all active:scale-[0.96] ${
                    unlocked ? "hover:-translate-y-0.5 hover:shadow-xl" : ""
                  }`}
                  style={{
                    background: unlocked ? "#16122A" : "#0D0A1F",
                    borderColor: unlocked ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                    opacity: unlocked ? 1 : 0.4,
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: done ? "#10B981" : `linear-gradient(90deg, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center mb-2.5 text-lg`}>
                    {level.icon}
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.card} ${color.text}`}>Level {level.levelNumber}</span>
                    {done && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Selesai</span>}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{level.title}</h4>
                  <p className="text-[10px] leading-relaxed" style={{ color: "#7C7A9E" }}>{level.description}</p>
                  {!unlocked && <Lock size={14} className="absolute top-3 right-3" style={{ color: "#7C7A9E" }} />}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Lesson Select ──
  if (phase === "lessons" && selectedLevel) {
    const color = levelColors[(selectedLevel.levelNumber - 1) % levelColors.length]
    return (
      <div className="min-h-screen bg-[#0D0A1F] flex flex-col">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setPhase("levels"); setSelectedLevel(null) }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <ChevronRight size={16} className="text-white rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-white">{selectedLevel.title}</h2>
              <p className="text-xs" style={{ color: "#7C7A9E" }}>{selectedLevel.description}</p>
            </div>
          </div>

          <button
            onClick={() => handleLevelPlayAll(selectedLevel)}
            className="w-full mb-5 p-4 rounded-[20px] border text-left transition-all active:scale-[0.98] hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", borderColor: "rgba(124,58,237,0.4)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Main Semua</h4>
                <p className="text-[10px] text-white/60">{TotalRounds} soal campuran dari semua pelajaran</p>
              </div>
            </div>
          </button>

          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7C7A9E" }}>Pilih Pelajaran</div>

          <div className="space-y-2.5">
            {levelLessons.map((lesson, i) => {
              const done = progress.completedLessons.includes(lesson.id)
              return (
                <motion.button
                  key={lesson.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleLessonSelect(lesson)}
                  className="w-full p-4 rounded-[20px] border text-left transition-all active:scale-[0.98]"
                  style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.15)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center text-lg`}>
                      {characterIcons[lesson.character] || "🤖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                        {done && <span className="text-[10px] text-emerald-400">✓</span>}
                      </div>
                      <p className="text-[11px]" style={{ color: "#7C7A9E" }}>{lesson.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                        <Star size={9} className="inline mr-0.5" />{lesson.xpReward}
                      </span>
                      <ChevronRight size={14} style={{ color: "#7C7A9E" }} />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ──
  if (phase === "playing") {
    const q = questions[currentQ]
    if (!q) return null
    const color = selectedLevel ? levelColors[(selectedLevel.levelNumber - 1) % levelColors.length] : levelColors[0]

    return (
      <div className="min-h-screen bg-[#0D0A1F] flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "#7C7A9E" }}>{currentQ + 1} / {questions.length}</span>
            <div className="flex items-center gap-3">
              {streak > 1 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-full">
                  <Zap size={12} className="text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">{streak}</span>
                </motion.div>
              )}
              <div className="flex items-center gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={16} className={i < lives ? "text-red-400 fill-red-400" : "text-gray-600"} />
                ))}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #7C3AED, #A855F7)` }}
              initial={{ width: 0 }}
              animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 px-5 pt-4 flex flex-col">
          {/* Image/Hint area */}
          {(q.imageText || q.hint) && (
            <div className="text-center mb-5">
              {q.imageText && q.imageText.length <= 4 && !/^[🐱🐔🐄🐦🪨🍎🍌✏️🍽️😴🚿👦🔵🏡🎮🦘🎈❓📖✍️📚🐍🐟⚽🪑]/.test(q.imageText) ? (
                <div className="w-24 h-24 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
                  <span className="text-5xl font-black text-white">{q.imageText}</span>
                </div>
              ) : (
                <span className="text-6xl">{q.imageText || ""}</span>
              )}
              {q.hint && (
                <p className="text-xs mt-2" style={{ color: "#7C7A9E" }}>
                  <Volume2 size={12} className="inline mr-1" />{q.hint}
                </p>
              )}
            </div>
          )}

          {/* Sentence for readSentence type */}
          {q.sentence && (
            <div className="mb-5 p-4 rounded-2xl border text-center" style={{ background: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.15)" }}>
              <p className="text-lg font-bold text-white leading-relaxed">{q.sentence}</p>
            </div>
          )}

          {/* Match left for matching type */}
          {q.matchLeft && (
            <div className="text-center mb-4">
              <span className="text-4xl">{q.matchLeft}</span>
              <p className="text-xs mt-1" style={{ color: "#7C7A9E" }}>Cocokkan dengan jawaban di bawah</p>
            </div>
          )}

          <p className="text-base font-bold text-white mb-5 leading-relaxed">{q.instruction}</p>

          {/* Options */}
          <div className="space-y-3 flex-1">
            {q.options.map((opt, i) => {
              const isSelected = selected === i
              const isCorrectOpt = opt === q.correctAnswer || i === parseInt(q.correctAnswer)
              let btnStyle: React.CSSProperties = {
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "#E2E8F0",
              }

              if (feedback) {
                if (isCorrectOpt) btnStyle = { background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)", color: "#34D399" }
                else if (isSelected) btnStyle = { background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)", color: "#F87171" }
                else btnStyle = { background: "transparent", borderColor: "transparent", color: "rgba(255,255,255,0.2)" }
              } else if (isSelected) {
                btnStyle = { background: "rgba(124,58,237,0.15)", borderColor: "rgba(124,58,237,0.4)", color: "#C084FC" }
              }

              return (
                <motion.button
                  key={i}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleAnswer(i)}
                  disabled={feedback !== null}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${shakeInput && isSelected ? "animate-shake" : ""}`}
                  style={btnStyle}
                >
                  <span className={`text-sm font-semibold ${feedback && isCorrectOpt ? "text-emerald-400" : isSelected && feedback && !isCorrectOpt ? "text-red-400" : feedback ? "text-white/20" : "text-white"}`}>
                    {opt}
                  </span>
                </motion.button>
              )
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className={`mt-4 p-3.5 rounded-2xl text-center border ${
                  feedback.correct
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <p className={`text-base font-bold ${feedback.correct ? "text-emerald-400" : "text-red-400"}`}>
                  {feedback.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom spacer */}
          <div className="h-6" />
        </div>
      </div>
    )
  }

  // ── Result ──
  const totalXp = score + correct * XpRewardBonus
  return (
    <div className="min-h-screen bg-[#0D0A1F] flex items-center justify-center px-5">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm w-full">
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 1 }}
          className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-500/30"
        >
          <Trophy size={48} className="text-white" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-white mb-1">Selesai!</h2>
        <p className="text-sm mb-5" style={{ color: "#7C7A9E" }}>Skor kamu</p>
        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500 mb-6">{score}</p>

        <div className="rounded-2xl p-5 mb-6 border text-left space-y-3" style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.15)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#7C7A9E" }}>Benar</span>
            <span className="font-bold text-emerald-400">{correct}</span>
          </div>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#7C7A9E" }}>Salah</span>
            <span className="font-bold text-red-400">{wrong}</span>
          </div>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#7C7A9E" }}>Rentetan Terbaik</span>
            <span className="font-bold text-orange-400">{bestStreak}</span>
          </div>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-sm" style={{ color: "#7C7A9E" }}>XP Didapat</span>
            </div>
            <span className="font-bold text-amber-400">+{totalXp}</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button onClick={restart} className="w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
            <RefreshCw size={18} className="inline mr-2" /> Main Lagi
          </button>
          <button onClick={() => { setPhase("levels"); setSelectedLevel(null) }} className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.06)", color: "#7C7A9E", border: "1px solid rgba(255,255,255,0.08)" }}>
            Kembali ke Tingkat
          </button>
        </div>
      </motion.div>
    </div>
  )
}
