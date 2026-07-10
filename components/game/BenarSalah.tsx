"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Zap, Flame, Trophy, Timer, RotateCcw, Loader2, Sparkles } from "lucide-react";

interface Q {
  id: string;
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan: string;
}

type Phase = "start" | "loading" | "playing" | "gameover";
const ROUND_SECONDS = 60;

export default function BenarSalah({ backHref = "/arena/game" }: { backHref?: string }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [flash, setFlash] = useState<null | "ok" | "no">(null);
  const [xpResult, setXpResult] = useState<{ xpEarned: number; leveledUp: boolean } | null>(null);
  const lockRef = useRef(false);

  const current = questions[idx];

  // The candidate answer shown: 50% the correct option, 50% a wrong one.
  const candidateIdx = useMemo(() => {
    if (!current) return 0;
    if (Math.random() < 0.5) return current.jawaban;
    const wrong = current.opsi.map((_, i) => i).filter((i) => i !== current.jawaban);
    return wrong[Math.floor(Math.random() * wrong.length)] ?? current.jawaban;
  }, [idx, current]);

  const start = useCallback(async () => {
    setPhase("loading");
    setIdx(0); setScore(0); setCombo(0); setBest(0); setAnswered(0);
    setTimeLeft(ROUND_SECONDS); setFlash(null); setXpResult(null); lockRef.current = false;
    try {
      const res = await fetch("/api/game/menara?count=20", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        setPhase("start");
        return;
      }
      setQuestions(data.questions);
      setPhase("playing");
    } catch {
      setPhase("start");
    }
  }, []);

  const finish = useCallback(async (finalScore: number, finalAnswered: number) => {
    setPhase("gameover");
    try {
      const res = await fetch("/api/game/menara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct: finalScore, total: finalAnswered }),
      });
      const data = await res.json();
      if (res.ok) setXpResult({ xpEarned: data.xpEarned ?? 0, leveledUp: !!data.leveledUp });
    } catch {
      /* keep local result */
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      finish(score, answered);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, score, answered, finish]);

  const answer = (saidBenar: boolean) => {
    if (lockRef.current || phase !== "playing") return;
    lockRef.current = true;

    const correct = (candidateIdx === current.jawaban) === saidBenar;
    setAnswered((a) => a + 1);
    if (correct) {
      setScore((s) => s + 1);
      setCombo((c) => { const nc = c + 1; setBest((b) => Math.max(b, nc)); return nc; });
      setFlash("ok");
    } else {
      setCombo(0);
      setFlash("no");
    }

    setTimeout(() => {
      setFlash(null);
      lockRef.current = false;
      setIdx((i) => {
        const next = i + 1;
        if (next >= questions.length) {
          // Out of questions before time — end the round.
          finish(correct ? score + 1 : score, answered + 1);
          return i;
        }
        return next;
      });
    }, correct ? 320 : 620);
  };

  // ---------- START ----------
  if (phase === "start" || phase === "loading") {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}
            className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-teal-500/40 mb-6">
            <Zap className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Benar atau Salah</h1>
          <p className="text-sm text-white/60 max-w-xs mb-1">Baca soal + jawaban yang muncul, lalu tentukan: benar atau salah?</p>
          <p className="text-xs text-white/40 max-w-xs mb-8">60 detik. Jawab sebanyak & secepat mungkin. Combo beruntun = skor melejit!</p>

          <div className="flex items-center gap-3 mb-8">
            <Badge icon={<Timer className="w-4 h-4 text-cyan-300" />} label="60 detik" />
            <Badge icon={<Flame className="w-4 h-4 text-orange-400" />} label="Combo" />
            <Badge icon={<Zap className="w-4 h-4 text-amber-400" />} label="+XP" />
          </div>

          <button onClick={start} disabled={phase === "loading"}
            className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 text-white font-bold text-lg shadow-xl shadow-teal-600/40 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
            {phase === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan…</> : <><Zap className="w-5 h-5" /> Mulai</>}
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- GAME OVER ----------
  if (phase === "gameover") {
    const accuracy = answered ? Math.round((score / answered) * 100) : 0;
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }}
            className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/40 mb-5">
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Waktu Habis! ⏱️</h1>
          <p className="text-sm text-white/60 mb-6"><span className="text-white font-bold">{score}</span> jawaban benar dari {answered}</p>

          <div className="w-full max-w-xs grid grid-cols-3 gap-2 mb-6">
            <Stat big={`${score}`} label="Benar" tone="emerald" />
            <Stat big={`${best}🔥`} label="Combo" tone="orange" />
            <Stat big={`${accuracy}%`} label="Akurasi" tone="cyan" />
          </div>

          {xpResult && (
            <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> +{xpResult.xpEarned} XP{xpResult.leveledUp ? " · Naik Level!" : ""}
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <button onClick={start} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 text-white font-bold shadow-lg shadow-teal-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Main Lagi
            </button>
            <Link href={backHref} className="w-full py-3.5 rounded-2xl bg-white/10 text-white/80 font-semibold active:scale-95 transition-all text-center">
              Kembali ke Arena
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- PLAYING ----------
  const timePct = (timeLeft / ROUND_SECONDS) * 100;
  return (
    <Shell flash={flash}>
      {/* judgment stamp — thematic decoration */}
      <AnimatePresence>
        {flash && (
          <motion.div key={`${flash}-${idx}`} initial={{ scale: 2.2, opacity: 0, rotate: -28 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ type: "spring", stiffness: 320, damping: 15 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className={`w-28 h-28 rounded-full border-[6px] flex items-center justify-center backdrop-blur-sm ${flash === "ok" ? "border-emerald-400 text-emerald-300 bg-emerald-500/10" : "border-rose-400 text-rose-300 bg-rose-500/10"}`}>
              {flash === "ok" ? <Check className="w-16 h-16" strokeWidth={3} /> : <X className="w-16 h-16" strokeWidth={3} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10">
          <Check className="w-4 h-4 text-emerald-300" />
          <span className="text-sm font-bold text-white">{score}</span>
        </div>
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm font-extrabold">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400" /> {combo}x
            </motion.div>
          )}
        </AnimatePresence>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${timeLeft <= 10 ? "bg-rose-500/25 text-rose-200" : "bg-white/10 text-white"}`}>
          <Timer className="w-4 h-4" />
          <span className="text-sm font-bold tabular-nums">{timeLeft}s</span>
        </div>
      </div>

      {/* timer bar */}
      <div className="px-5 mb-5">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div className={`h-full rounded-full ${timeLeft <= 10 ? "bg-rose-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} animate={{ width: `${timePct}%` }} transition={{ ease: "linear", duration: 1 }} />
        </div>
      </div>

      {/* prompt */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-6">
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.18 }}
            className="rounded-3xl bg-white/[0.07] border border-white/10 p-6 text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/80 mb-3">Soal</p>
            <h2 className="text-lg font-bold text-white leading-snug mb-5">{current?.soal}</h2>
            <div className="inline-block px-5 py-3 rounded-2xl bg-white/10 border border-white/15">
              <span className="text-[11px] text-white/50 block mb-0.5">Jawabannya:</span>
              <span className="text-xl font-extrabold text-white">{current?.opsi[candidateIdx]}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => answer(true)}
            className="py-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-lg shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex flex-col items-center gap-1">
            <Check className="w-7 h-7" /> BENAR
          </button>
          <button onClick={() => answer(false)}
            className="py-5 rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-white font-extrabold text-lg shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex flex-col items-center gap-1">
            <X className="w-7 h-7" /> SALAH
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, flash }: { children: React.ReactNode; flash?: null | "ok" | "no" }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden transition-colors duration-200"
      style={{ background: flash === "ok" ? "radial-gradient(120% 80% at 50% 0%, #064E3B 0%, #06251C 60%, #04120E 100%)"
        : flash === "no" ? "radial-gradient(120% 80% at 50% 0%, #4C0519 0%, #2A0410 60%, #150207 100%)"
        : "radial-gradient(120% 80% at 50% 0%, #0F3D3A 0%, #0A2320 45%, #05100F 100%)" }}>
      <div className="relative z-10 flex-1 flex flex-col max-w-md w-full mx-auto">{children}</div>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10">
      {icon}<span className="text-xs font-semibold text-white/80">{label}</span>
    </div>
  );
}

function Stat({ big, label, tone }: { big: string; label: string; tone: "emerald" | "orange" | "cyan" }) {
  const tones = { emerald: "text-emerald-300", orange: "text-orange-300", cyan: "text-cyan-300" };
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 py-3 px-1 text-center">
      <p className={`text-xl font-extrabold ${tones[tone]}`}>{big}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mt-0.5">{label}</p>
    </div>
  );
}
