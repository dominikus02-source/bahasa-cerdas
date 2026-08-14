"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { setQuiet } from "@/lib/notif-quiet"
import { motion, AnimatePresence } from "framer-motion"
import GameBackground from "@/components/game/GameBackground"
import { sfx, haptic, startBGM, stopBGM } from "@/lib/game/sound"
import {
  Heart, Star, Trophy, RefreshCw, Crown, BookOpen,
  ChevronRight, Lock, Sparkles, Bot, Cat,
  ArrowLeft, Package, Flame, Lightbulb, Zap, Split,
  Check, X,
} from "lucide-react"
import { kataPlayLevels, KataPlayLevel, KataPlayQuestion, KataPlayLesson } from "./kataplay-content"
import { createGameEngine, KataPlayAgentRuntime } from "./agents"

const TotalRounds = 10

// Skor XP KataPlay dihitung dari jawaban benar, SAMA dengan gim solo lain
// (mis. Kuis Tempur: benar × 10 + bonus combo). Dulu klien mengirim skor
// akumulasi (+25 per benar) dan menampilkan "XP" yang jauh lebih besar dari
// yang disetujui server — anak melihat levelnya "naik" padahal server hanya
// mencairkan sebagian kecil. Skor = benar × 18 (≤ 600, di bawah cap 1100 di
// server) supaya angka di layar hasil sesuai dengan XP yang benar-benar cair.
const XP_PER_BENAR = 18
let agentEngine: KataPlayAgentRuntime | null = null

function getEngine(): KataPlayAgentRuntime {
  if (!agentEngine) agentEngine = createGameEngine()
  return agentEngine
}

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

function CharacterIcon({ name, size = 28, className = "" }: { name: string; size?: number; className?: string }) {
  const props = { size, className }
  switch (name) {
    case 'zelby': return <Bot {...props} />
    case 'hazel': return <Cat {...props} />
    case 'alby': return <Sparkles {...props} />
    default: return <Bot {...props} />
  }
}

function LevelIcon({ name, size = 22, className = "" }: { name: string; size?: number; className?: string }) {
  const props = { size, className }
  switch (name) {
    case 'BookOpen': return <BookOpen {...props} />
    case 'Split': return <Split {...props} />
    case 'Package': return <Package {...props} />
    case 'Zap': return <Zap {...props} />
    default: return <BookOpen {...props} />
  }
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

// Acak urutan opsi jawaban per ronde supaya kunci tidak selalu di posisi yang
// sama. Kunci dipertahankan sebagai TEKS opsi (di-normalisasi bila ternyata
// tertulis sebagai indeks) sehingga handleAnswer tidak perlu diubah.
function shuffleKataPlayQuestion(q: KataPlayQuestion): KataPlayQuestion {
  const asText = q.options.includes(q.correctAnswer)
    ? q.correctAnswer
    : (q.options[parseInt(q.correctAnswer)] ?? q.correctAnswer)
  const idx = q.options.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return { ...q, correctAnswer: asText, options: idx.map((i) => q.options[i]) }
}

type XpServerResult = {
  xpEarned: number
  boosted: boolean
  kuotaHabis: boolean
  levelUp: boolean
  newLevel: number
  totalXp: number
}

export default function KataPlayGame({ hideBackButton }: { hideBackButton?: boolean }) {
  const [phase, setPhase] = useState<Phase>("splash")
  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(phase === "playing")
    return () => setQuiet(false)
  }, [phase]);

  useEffect(() => { if (phase === "playing") startBGM(); else stopBGM(); return () => stopBGM() }, [phase])
  const [progress, setProgress] = useState<ProgressData>({ completedLessons: [], xp: 0 })
  const [selectedLevel, setSelectedLevel] = useState<KataPlayLevel | null>(null)
  const [levelLessons, setLevelLessons] = useState<KataPlayLesson[]>([])
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
  const [agentSummary, setAgentSummary] = useState<Record<string, string | number> | null>(null)
  const [xpResult, setXpResult] = useState<XpServerResult | null>(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  const streakRef = useRef(0)
  const currentLessonIdRef = useRef<string | null>(null)
  const supabaseIdRef = useRef("")

  useEffect(() => {
    const stored = localStorage.getItem("bc-user")
    if (stored) {
      try { supabaseIdRef.current = JSON.parse(stored).state?.supabaseId || "" } catch {}
    }
  }, [])

  async function saveXpToServer(): Promise<XpServerResult | null> {
    try {
      const res = await fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: correctRef.current * XP_PER_BENAR,
          correct: correctRef.current,
          wrong: wrongRef.current,
          maxStreak: bestStreak,
          gameType: "KATAPLAY",
          supabaseId: supabaseIdRef.current,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const hasil: XpServerResult = {
          xpEarned: Number(data.xpEarned) || 0,
          boosted: Boolean(data.boosted),
          kuotaHabis: Boolean(data.kuotaHabis),
          levelUp: Boolean(data.levelUp),
          newLevel: Number(data.newLevel) || 0,
          totalXp: Number(data.totalXp) || 0,
        }
        setXpResult(hasil)
        return hasil
      }
    } catch (e) {
      console.error("Failed to save KataPlay XP:", e)
    }
    return null
  }

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
    const engine = getEngine()
    engine.startSession(selectedLevel!, lesson, false)
    const pool = lesson.questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(TotalRounds, shuffled.length))
    setQuestions(selected.map(shuffleKataPlayQuestion))
    setCurrentQ(0)
    setLives(engine.getContext().difficulty.livesGranted)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setWrong(0)
    setSelected(null)
    setFeedback(null)
    scoreRef.current = 0
    correctRef.current = 0
    wrongRef.current = 0
    streakRef.current = 0
    currentLessonIdRef.current = lesson.id
    setPhase("playing")
  }

  function handleLevelPlayAll(level: KataPlayLevel) {
    const engine = getEngine()
    engine.startSession(level, null, true)
    const picked = pickQuestions(level, TotalRounds)
    setQuestions(picked.map(shuffleKataPlayQuestion))
    setCurrentQ(0)
    setLives(engine.getContext().difficulty.livesGranted)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setWrong(0)
    setSelected(null)
    setFeedback(null)
    scoreRef.current = 0
    correctRef.current = 0
    wrongRef.current = 0
    streakRef.current = 0
    currentLessonIdRef.current = null
    setPhase("playing")
  }

  function handleAnswer(idx: number) {
    if (selected !== null || feedback !== null) return
    const q = questions[currentQ]
    const isCorrect = q.options[idx] === q.correctAnswer || idx.toString() === q.correctAnswer || idx === parseInt(q.correctAnswer)
    const engine = getEngine()
    const context = engine.getContext()
    const diff = context.difficulty
    setSelected(idx)
    if (isCorrect) { sfx.climb(streak + 1); haptic(25) } else { sfx.wrong(); haptic([60, 40, 60]) }

    const eventType = isCorrect ? "answer_correct" : "answer_wrong"
    const gameEvent = {
      type: eventType as any,
      question: q,
      answeredOption: q.options[idx]!,
      timeToAnswerMs: 0,
      currentStreak: isCorrect ? streak + 1 : 0,
      livesRemaining: isCorrect ? lives : lives - 1,
      sessionQuestionIndex: currentQ,
      sessionTotalQuestions: questions.length,
    }

    const decisions = engine.fireEvent(gameEvent)
    const newDiff = decisions.difficultyChange

    if (isCorrect) {
      const points = 50 + streak * 10
      const newStreak = streak + 1
      scoreRef.current = score + points
      correctRef.current = correct + 1
      streakRef.current = newStreak
      setScore((s) => s + points)
      setStreak(newStreak)
      setBestStreak((b) => Math.max(b, newStreak))
      setCorrect((c) => c + 1)
      const agentMsg = decisions.feedbackMessage
      setFeedback({ correct: true, message: agentMsg || `+${points}✨` })

      if (gameEvent.currentStreak >= 5) {
        engine.fireEvent({ ...gameEvent, type: "streak_milestone" } as any)
        setLives((l) => Math.min(5, l + 1))
      }
    } else {
      const newLives = lives - 1
      setLives(newLives)
      setStreak(0)
      streakRef.current = 0
      wrongRef.current = wrong + 1
      setWrong((w) => w + 1)
      setShakeInput(true)
      setTimeout(() => setShakeInput(false), 500)
      const agentMsg = decisions.feedbackMessage
      if (newLives <= 0) {
        engine.fireEvent({ ...gameEvent, type: "game_over" } as any)
        setFeedback({ correct: false, message: agentMsg || `Jawaban: ${q.correctAnswer}` })
        setTimeout(() => {
          const earned = correctRef.current * XP_PER_BENAR
          const endResult = engine.endSession(earned)
          if (endResult.sessionSummary) setAgentSummary(endResult.sessionSummary)
          updateProgress(earned, currentLessonIdRef.current ?? undefined)
          saveXpToServer()
          setPhase("result")
        }, 2000)
        return
      }
      setFeedback({ correct: false, message: agentMsg || `Jawaban: ${q.correctAnswer}` })
    }

    setLives((prev) => Math.max(prev, newDiff.livesGranted))

    setTimeout(() => {
      setSelected(null)
      setFeedback(null)
      if (currentQ < questions.length - 1) {
        setCurrentQ((c) => c + 1)
      } else {
        const earned = correctRef.current * XP_PER_BENAR
        const endResult = engine.endSession(earned)
        if (endResult.sessionSummary) setAgentSummary(endResult.sessionSummary)
        updateProgress(earned, currentLessonIdRef.current ?? undefined)
        saveXpToServer()
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
    setAgentSummary(null)
    setXpResult(null)
  }

  // ── Splash ──
  if (phase === "splash") {
    return (
      <div className="fixed inset-0 z-[60] isolate flex items-center justify-center">
        <GameBackground theme="violet" />
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
          <h1 className="text-4xl font-extrabold text-white mb-2 font-game-display">KataPlay</h1>
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
      <div className="relative isolate min-h-screen flex flex-col">
        <GameBackground theme="night" />
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

          <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#7C7A9E]">Tingkat</div>

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
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center mb-2.5`}>
                    <LevelIcon name={level.icon} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.card} ${color.text}`}>Level {level.levelNumber}</span>
                    {done && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Selesai</span>}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{level.title}</h4>
                  <p className="text-[10px] leading-relaxed text-[#7C7A9E]">{level.description}</p>
                  {!unlocked && <Lock size={14} className="absolute top-3 right-3 text-[#7C7A9E]" />}
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
      <div className="relative isolate min-h-screen flex flex-col">
        <GameBackground theme="night" />
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl"
            style={{ background: `radial-gradient(circle, #7C3AED 0%, transparent 70%)` }} />
        </div>
        <div className="relative z-10 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setPhase("levels"); setSelectedLevel(null) }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <ArrowLeft size={16} className="text-white" />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-white">{selectedLevel.title}</h2>
              <p className="text-xs text-[#7C7A9E]">{selectedLevel.description}</p>
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

          <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#7C7A9E]">Pilih Pelajaran</div>

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
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center`}>
                      <CharacterIcon name={lesson.character} size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                        {done && <Check size={14} className="text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#7C7A9E]">{lesson.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                        <Star size={9} className="inline mr-0.5" />{lesson.xpReward}
                      </span>
                      <ChevronRight size={14} className="text-[#7C7A9E]" />
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
      <div className="relative isolate min-h-screen flex flex-col">
        <GameBackground theme="night" />
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl"
            style={{ background: `radial-gradient(circle, #7C3AED 0%, transparent 70%)` }} />
        </div>

        {/* Header */}
        <div className="relative z-10 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#7C7A9E]">
              {currentQ + 1} / {questions.length}
            </span>
            <div className="flex items-center gap-3">
              {streak > 1 && (
                <motion.div
                  key={streak}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1.5 bg-orange-500/15 px-3 py-1 rounded-full border border-orange-500/25"
                >
                  <Flame size={13} className="text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">{streak}</span>
                </motion.div>
              )}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={i === lives ? { scale: 1.4 } : { scale: 1 }}
                    animate={i === lives ? { scale: 1 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart
                      size={18}
                      className={i < lives ? "text-red-400 fill-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.4)]" : "text-gray-700"}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #7C3AED, #A855F7)" }}
              initial={{ width: `${(currentQ / questions.length) * 100}%` }}
              animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Question area */}
        <div className="relative z-10 flex-1 px-5 pb-6 flex flex-col">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            {/* Image/Text display */}
            {q.imageText && (
              <div className="mb-6">
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.08)", border: "2px solid rgba(124,58,237,0.12)" }}
                >
                  <span className="text-6xl font-black text-white tracking-wider">{q.imageText}</span>
                </div>
              </div>
            )}

            {/* Sentence */}
            {q.sentence && (
              <div className="w-full mb-5 p-4 rounded-2xl text-center"
                style={{ background: "rgba(124,58,237,0.05)" }}
              >
                <p className="text-xl font-bold text-white leading-relaxed">{q.sentence}</p>
              </div>
            )}

            {/* Match left */}
            {q.matchLeft && (
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl"
                  style={{ background: "rgba(124,58,237,0.1)", border: "2px solid rgba(124,58,237,0.2)" }}
                >
                  <span className="text-xl font-bold text-white">{q.matchLeft}</span>
                </div>
                <p className="text-xs mt-2 text-[#7C7A9E]">Cocokkan dengan jawaban</p>
              </div>
            )}

            {/* Instruction */}
            <p className="text-lg font-bold text-white text-center leading-relaxed">{q.instruction}</p>

            {/* Hint */}
            {q.hint && (
              <div className="flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.12)" }}
              >
                <Lightbulb size={12} className="text-amber-400/60" />
                <span className="text-xs text-amber-400/60">{q.hint}</span>
              </div>
            )}
          </motion.div>

          {/* Feedback banner */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`mb-3 py-3 px-4 rounded-2xl text-center border-2 ${
                  feedback.correct
                    ? "bg-emerald-500/10 border-emerald-500/25"
                    : "bg-red-500/10 border-red-500/25"
                }`}
              >
                <p className={`text-sm font-bold ${feedback.correct ? "text-emerald-400" : "text-red-400"}`}>
                  {feedback.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-3 mt-auto">
            {q.options.map((opt, i) => {
              const isSelected = selected === i
              const isCorrectOpt = opt === q.correctAnswer || i === parseInt(q.correctAnswer)

              let btnBg = "rgba(255,255,255,0.04)"
              let btnBorder = "rgba(255,255,255,0.08)"
              let textColor = "#E2E8F0"

              if (feedback) {
                if (isCorrectOpt) {
                  btnBg = "rgba(16,185,129,0.15)"; btnBorder = "rgba(16,185,129,0.4)"; textColor = "#34D399"
                } else if (isSelected) {
                  btnBg = "rgba(239,68,68,0.15)"; btnBorder = "rgba(239,68,68,0.4)"; textColor = "#F87171"
                } else {
                  btnBg = "transparent"; btnBorder = "transparent"; textColor = "rgba(255,255,255,0.12)"
                }
              } else if (isSelected) {
                btnBg = "rgba(124,58,237,0.12)"; btnBorder = "rgba(124,58,237,0.3)"; textColor = "#C084FC"
              }

              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 + 0.15, type: "spring", stiffness: 200, damping: 20 }}
                  onClick={() => handleAnswer(i)}
                  disabled={feedback !== null}
                  className={`w-full py-4 px-5 rounded-2xl border-2 text-center font-bold text-base transition-all active:scale-[0.97] ${shakeInput && isSelected ? "animate-shake" : ""} ${!feedback && !isSelected ? "hover:border-violet-500/30 hover:bg-violet-500/5" : ""}`}
                  style={{ background: btnBg, borderColor: btnBorder, color: textColor }}
                >
                  <span>{opt}</span>
                  {feedback && isCorrectOpt && <Check size={18} className="inline ml-2 -mt-0.5 text-emerald-400" />}
                  {feedback && isSelected && !isCorrectOpt && <X size={18} className="inline ml-2 -mt-0.5 text-red-400" />}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Result ──
  const staticGrade = correct >= 9 ? "Luar Biasa!" : correct >= 7 ? "Bagus!" : correct >= 5 ? "Cukup!" : "Ayo coba lagi!"
  const grade = (agentSummary?.grade as string) || (agentSummary?.recommendation as string) || staticGrade
  const gradeColors = ["from-amber-400 to-orange-500", "from-violet-400 to-purple-500", "from-blue-400 to-cyan-500", "from-gray-400 to-gray-500"]

  return (
    <div className="relative isolate min-h-screen flex items-center justify-center px-5">
      <GameBackground theme="night" />
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06] blur-3xl"
          style={{ background: `radial-gradient(circle, #7C3AED 0%, transparent 70%)` }} />
      </div>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-sm w-full relative z-10"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ duration: 1.2 }}
          className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-500/25"
        >
          <Trophy size={48} className="text-white" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-white mb-1">Selesai!</h2>
        <p className="text-sm mb-1 text-[#7C7A9E]">Skor kamu</p>
        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500 mb-1">{score}</p>
        <p className={`text-sm font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r ${gradeColors[correct >= 9 ? 0 : correct >= 7 ? 1 : correct >= 5 ? 2 : 3]}`}>
          {grade}
        </p>

        <div className="rounded-2xl p-5 mb-6 border text-left space-y-3" style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.12)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#7C7A9E]">Benar</span>
            <span className="font-bold text-emerald-400">{correct}</span>
          </div>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#7C7A9E]">Salah</span>
            <span className="font-bold text-red-400">{wrong}</span>
          </div>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#7C7A9E]">Rentetan Terbaik</span>
            <span className="font-bold text-orange-400">{bestStreak}x</span>
          </div>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-sm text-[#7C7A9E]">XP Didapat</span>
            </div>
            <div className="flex items-center gap-2">
              {xpResult?.levelUp && (
                <span className="bg-amber-300 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                  <Sparkles size={10} /> Naik ke Level {xpResult.newLevel}!
                </span>
              )}
              <span className="font-bold text-amber-400">
                +{xpResult ? xpResult.xpEarned : correct * XP_PER_BENAR}
              </span>
            </div>
          </div>
          {xpResult?.kuotaHabis && (
            <p className="text-[11px] text-amber-400/80">Kuota XP harian sudah habis, XP ditahan sampai besok.</p>
          )}
          {agentSummary && (
            <>
              <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="pt-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={12} className="text-violet-400" />
                  <span className="text-xs font-semibold text-violet-400">Analisis Agen</span>
                </div>
                {agentSummary.accuracy && (
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#7C7A9E]">Akurasi</span>
                    <span className="font-semibold text-white">{agentSummary.accuracy}</span>
                  </div>
                )}
                {agentSummary.avgSpeed && (
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#7C7A9E]">Kecepatan Rata-rata</span>
                    <span className="font-semibold text-white">{agentSummary.avgSpeed}</span>
                  </div>
                )}
                {agentSummary.grade && (
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#7C7A9E]">Kata Agen</span>
                    <span className="font-semibold text-violet-300 text-right max-w-[160px]">{agentSummary.grade}</span>
                  </div>
                )}
                {agentSummary.weakArea && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7C7A9E]">Area Perlu Latihan</span>
                    <span className="font-semibold text-amber-400">{agentSummary.weakArea}</span>
                  </div>
                )}
                {agentSummary.recommendation && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-[#7C7A9E]">Rekomendasi</span>
                    <span className="font-semibold text-emerald-400">{agentSummary.recommendation}</span>
                  </div>
                )}
                {agentSummary.nextLesson && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-[#7C7A9E]">Pelajaran Selanjutnya</span>
                    <span className="font-semibold text-blue-400">{agentSummary.nextLesson}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-2.5">
          <button onClick={restart} className="w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
            <RefreshCw size={18} className="inline mr-2" /> Main Lagi
          </button>
          <button onClick={() => { setPhase("levels"); setSelectedLevel(null) }} className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.06)", color: "#7C7A9E", border: "1px solid rgba(255,255,255,0.06)" }}>
            Kembali ke Tingkat
          </button>
        </div>
      </motion.div>
    </div>
  )
}
