"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, ChevronRight, Heart, Lock, Sparkles, Star, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"
import { setQuiet } from "@/lib/notif-quiet"
import { haptic, isSoundOn, sfx, startBGM, stopBGM } from "@/lib/game/sound"

type Unit = {
  id: string; title: string; subtitle: string | null; emoji: string | null
  order: number; xpReward: number; coinReward: number; completed: boolean; score: number
}
type Level = {
  id: string; level: number; title: string; subtitle: string | null
  description: string | null; emoji: string | null; units: Unit[]
}
type RawQuestion = { id: string; tipe?: string; soal: string; opsi?: string[] }
type Question = { id: string; soal: string; options: string[] }
type Phase = "levels" | "playing" | "result"

const MAX_HEARTS = 3
const ROUNDS = 8

function normalize(q: RawQuestion): Question | null {
  const type = String(q.tipe || "PILIHAN_GANDA").toUpperCase()
  if (type === "BENAR_SALAH") return { id: q.id, soal: q.soal, options: ["Benar", "Salah"] }
  if (type === "ISI_BLANK" || type === "ISIAN") return null
  if (!Array.isArray(q.opsi) || q.opsi.length < 2) return null
  return { id: q.id, soal: q.soal, options: q.opsi.slice(0, 4) }
}

function shuffle<T>(items: T[]) {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

export default function KataPlayGame({ hideBackButton = false }: { hideBackButton?: boolean }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("levels")
  const [levels, setLevels] = useState<Level[]>([])
  const [level, setLevel] = useState<Level | null>(null)
  const [unit, setUnit] = useState<Unit | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [current, setCurrent] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [hearts, setHearts] = useState(MAX_HEARTS)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null)
  const [result, setResult] = useState<{ score: number; earnedXp: number; nextUnitId: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setQuiet(phase === "playing")
    return () => setQuiet(false)
  }, [phase])

  useEffect(() => {
    if (phase === "playing") startBGM(); else stopBGM()
    return () => stopBGM()
  }, [phase])

  const loadLevels = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/game/kata-play", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat Jalur Kata")
      const data = await res.json()
      setLevels(data.levels || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat gim")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadLevels(); isSoundOn() }, [loadLevels])

  const completedUnits = useMemo(
    () => new Set(levels.flatMap(l => l.units.filter(u => u.completed).map(u => u.id))),
    [levels]
  )

  const levelUnlocked = (lv: Level) => {
    if (lv.level === 1) return true
    const prev = levels.find(x => x.level === lv.level - 1)
    return !!prev && prev.units.length > 0 && prev.units.every(u => completedUnits.has(u.id))
  }

  const unitUnlocked = (lv: Level, u: Unit) => {
    if (!levelUnlocked(lv)) return false
    if (u.order === 1) return true
    return !!lv.units.find(x => x.order === u.order - 1)?.completed
  }

  const startUnit = async (lv: Level, u: Unit) => {
    if (!unitUnlocked(lv, u) || busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch("/api/jalur-cerdas/" + u.id, { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat tantangan")
      const data = await res.json()
      const pool = (data.questions || []).map(normalize).filter(Boolean) as Question[]
      const picked = shuffle(pool).slice(0, Math.min(ROUNDS, pool.length))
      if (picked.length < 3) throw new Error("Unit ini belum memiliki cukup soal pilihan")
      setLevel(lv); setUnit(u); setQuestions(picked); setAnswers({})
      setCurrent(0); setCorrect(0); setHearts(MAX_HEARTS)
      setSelected(null); setFeedback(null); setResult(null); setPhase("playing")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulai unit")
    } finally { setBusy(false) }
  }

  const answer = async (choice: number) => {
    if (busy || selected !== null || !unit) return
    const q = questions[current]
    setSelected(choice); setBusy(true)
    try {
      const res = await fetch("/api/jalur-cerdas/" + unit.id + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answer: choice }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Jawaban gagal dikirim")

      const ok = !!data.correct
      const nextAnswers = Object.assign({}, answers, { [q.id]: choice })
      setAnswers(nextAnswers)
      if (ok) { sfx.climb(current + 1); haptic(20); setCorrect(v => v + 1); setFeedback("correct") }
      else { sfx.wrong(); haptic([50, 30, 50]); setHearts(v => Math.max(0, v - 1)); setFeedback("wrong") }

      window.setTimeout(async () => {
        setSelected(null); setFeedback(null)
        const next = current + 1
        const nextHearts = ok ? hearts : Math.max(0, hearts - 1)
        const gameOver = nextHearts <= 0
        if (next < questions.length && !gameOver) {
          setCurrent(next); setBusy(false); return
        }

        // Server tetap menghitung skor dari kunci/evidence. Bila 3 hati habis,
        // sesi berhenti di sini; anak tidak dipaksa menghabiskan soal setelah
        // gagal, dan unit belum dianggap selesai bila skor < 70%.
        const progressRes = await fetch("/api/jalur-cerdas/" + unit.id + "/progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: nextAnswers }),
        })
        const progressData = await progressRes.json().catch(() => ({}))
        if (!progressRes.ok) throw new Error(progressData.error || "Gagal menyimpan progres")
        setResult({
          score: Number(progressData.progress?.score ?? 0),
          earnedXp: Number(progressData.earnedXp ?? 0),
          nextUnitId: progressData.nextUnitId || null,
        })
        setBusy(false); setPhase("result"); await loadLevels()
      }, 650)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Jawaban gagal diproses")
      setSelected(null); setFeedback(null); setBusy(false)
    }
  }

  const exitGame = () => {
    stopBGM(); setPhase("levels"); setLevel(null); setUnit(null); setQuestions([])
  }

  if (loading && phase === "levels") {
    return <div className="game-env game-env-kataplay game-env-bg min-h-screen flex items-center justify-center font-bold">Memuat Jalur Kata…</div>
  }

  if (phase === "levels") {
    const total = levels.reduce((n, l) => n + l.units.length, 0)
    const done = completedUnits.size
    return (
      <div className="game-env game-env-kataplay game-env-bg min-h-screen px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {!hideBackButton && <button onClick={() => router.push("/arena/game")} className="mb-4 p-2 rounded-xl bg-white border-2 border-black"><ArrowLeft size={20} /></button>}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white font-black text-sm"><Sparkles size={16} /> KATAPLAY · JALUR CERDAS</div>
            <h1 className="text-3xl font-black mt-3">Jalur Kata</h1>
            <p className="text-sm text-black/60 mt-1">Satu permainan. Satu mekanik. Perjalanan belajar mengikuti Jalur Cerdas.</p>
          </div>
          <div className="bg-white border-2 border-black rounded-3xl p-4 mb-5">
            <div className="flex justify-between text-sm font-black"><span>Perjalananmu</span><span>{done}/{total} unit</span></div>
            <div className="h-3 bg-black/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-black rounded-full" style={{ width: (total ? (done / total) * 100 : 0) + "%" }} /></div>
          </div>
          <div className="space-y-5">
            {levels.map(lv => {
              const unlocked = levelUnlocked(lv)
              const finished = lv.units.filter(u => u.completed).length
              return (
                <section key={lv.id} className="bg-white border-2 border-black rounded-3xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-black">{lv.level}</div>
                    <div className="flex-1"><h2 className="font-black text-lg">{lv.title}</h2><p className="text-xs text-black/55">{lv.subtitle}</p></div>
                    <span className="text-xs font-black">{finished}/{lv.units.length}</span>
                  </div>
                  <div className="relative pl-3">
                    <div className="absolute left-7 top-4 bottom-4 w-1 bg-black/10 rounded-full" />
                    <div className="space-y-2 relative">
                      {lv.units.map(u => {
                        const open = unitUnlocked(lv, u)
                        const cls = u.completed ? "bg-black text-white" : open ? "bg-[#FFF8E8] hover:-translate-y-0.5" : "bg-black/5 text-black/35"
                        return (
                          <button key={u.id} disabled={!open || busy} onClick={() => startUnit(lv, u)}
                            className={"w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-black text-left transition-transform " + cls}>
                            <span className="relative z-10 w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center text-lg">{u.completed ? <Check size={18} /> : u.emoji || "✦"}</span>
                            <span className="flex-1"><span className="block font-extrabold text-sm">{u.title}</span>{u.subtitle && <span className="block text-xs opacity-60 mt-0.5">{u.subtitle}</span>}</span>
                            {open ? <ChevronRight size={18} /> : <Lock size={16} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (phase === "playing" && unit && level) {
    const q = questions[current]
    return (
      <div className="game-env game-env-kataplay game-env-bg min-h-screen px-4 py-5">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={exitGame} className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center"><ArrowLeft size={18} /></button>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-black"><span>LEVEL {level.level} · {unit.title}</span><span>{current + 1}/{questions.length}</span></div>
              <div className="h-2 bg-black/10 rounded-full mt-1 overflow-hidden"><div className="h-full bg-black rounded-full" style={{ width: ((current + 1) / questions.length) * 100 + "%" }} /></div>
            </div>
            <div className="px-2.5 py-1.5 rounded-full bg-black text-white text-xs font-black flex items-center gap-1"><Heart size={13} fill="currentColor" /> {hearts}</div>
          </div>
          <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[5px_5px_0_#111] mb-4">
            <div className="flex items-center gap-2 mb-4"><span className="text-3xl">{unit.emoji || "📚"}</span><div><div className="text-[11px] font-black uppercase tracking-wide text-black/45">Tantangan Jalur Kata</div><div className="font-black text-lg">{unit.title}</div></div></div>
            <p className="text-xl sm:text-2xl font-black leading-snug">{q.soal}</p>
          </div>
          <div className="grid gap-3">
            {q.options.map((option, idx) => {
              const active = selected === idx
              const good = active && feedback === "correct"
              const bad = active && feedback === "wrong"
              return <button key={idx} onClick={() => answer(idx)} disabled={busy}
                className={"w-full text-left p-4 rounded-2xl border-2 border-black font-extrabold text-base sm:text-lg transition-all " + (good ? "bg-black text-white" : bad ? "bg-white opacity-50" : "bg-white hover:-translate-y-0.5")}>
                <span className="inline-flex w-9 h-9 rounded-xl border-2 border-black items-center justify-center mr-3 bg-[#FFF8E8]">{String.fromCharCode(65 + idx)}</span>{option}
              </button>
            })}
          </div>
          {error && <div className="mt-3 p-3 rounded-xl border-2 border-black bg-white text-sm font-bold">{error}</div>}
          <p className="text-center text-xs font-bold text-black/45 mt-4">Satu aturan: pilih jawaban yang tepat agar Zelby terus maju.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-env game-env-kataplay game-env-bg min-h-screen px-4 py-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-white text-black mx-auto flex items-center justify-center text-3xl"><Trophy /></div>
        <h2 className="text-3xl font-black mt-4">{(result?.score ?? 0) >= 70 ? "Unit selesai!" : "Belum lulus"}</h2>
        <p className="mt-2 text-white/70">Skor: {result?.score || 0}%</p>
        <div className="flex justify-center gap-2 mt-4 text-amber-300">{[1,2,3].map(n => <Star key={n} fill={n <= Math.round((result?.score ?? 0) / 34) ? "currentColor" : "none"} />)}</div>
        <p className="mt-4 font-bold">{result?.earnedXp ? `+${result.earnedXp} XP` : "Belum mendapat XP — capai minimal 70% untuk menyelesaikan unit."}</p>
        <div className="flex gap-3 justify-center mt-7">
          <button onClick={() => { setPhase("levels"); setLevel(null); setUnit(null) }} className="px-5 py-3 rounded-2xl bg-white text-black font-black">Lanjut Jalur</button>
          <button onClick={() => router.push("/arena/game")} className="px-5 py-3 rounded-2xl border-2 border-white font-black">Keluar</button>
        </div>
      </div>
    </div>
  )
}
