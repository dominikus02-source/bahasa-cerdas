"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import {
  Check, X, Zap, Flame, Trophy, Timer, RotateCcw, Loader2,
  Sparkles, Volume2, VolumeX, Lock, Star, ChevronRight, Play, Heart
} from "lucide-react";
import Burst from "@/components/game/Burst";
import ComboFlash from "@/components/game/ComboFlash";
import { sfx, haptic, isSoundOn, toggleSound, startBGM, stopBGM } from "@/lib/game/sound";

interface Q {
  id: string;
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan: string;
}

type Screen = "start" | "levels" | "playing" | "result";

/* ---------- LEVELS ---------- */
type Level = {
  id: number;
  name: string;
  count: number;
  time: number;
  color: string;
  topic: string;
};

const LEVELS: Level[] = [
  { id: 1, name: "Pemula", count: 8, time: 60, color: "#FF6B6B", topic: "Dasar" },
  { id: 2, name: "Siaga", count: 10, time: 55, color: "#F59E0B", topic: "Dasar" },
  { id: 3, name: "Petarung", count: 12, time: 55, color: "#10B981", topic: "Menengah" },
  { id: 4, name: "Jawara", count: 14, time: 50, color: "#38BDF8", topic: "Menengah" },
  { id: 5, name: "Pahlawan", count: 15, time: 50, color: "#8B5CF6", topic: "Sulit" },
  { id: 6, name: "Legenda", count: 18, time: 45, color: "#EC4899", topic: "Sulit" },
  { id: 7, name: "Dewa", count: 20, time: 45, color: "#F43F5E", topic: "Expert" },
  { id: 8, name: "Naga", count: 22, time: 40, color: "#14B8A6", topic: "Expert" },
  { id: 9, name: "Maha Guru", count: 25, time: 40, color: "#6366F1", topic: "Master" },
];

/* ---------- SAVE SYSTEM ---------- */
type Saved = {
  unlocked: number[];
  best: Record<number, number>;
  stars: Record<number, number>;
};

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem("benar-salah-progress");
    if (raw) {
      const d = JSON.parse(raw);
      return {
        unlocked: d.unlocked || [1],
        best: d.best || {},
        stars: d.stars || {},
      };
    }
  } catch { /* abaikan */ }
  return { unlocked: [1], best: {}, stars: {} };
}

function saveSaved(s: Saved) {
  try {
    localStorage.setItem("benar-salah-progress", JSON.stringify(s));
  } catch { /* abaikan */ }
}

function starsFor(acc: number, gameOver: boolean): number {
  if (gameOver) return 0;
  if (acc >= 90) return 3;
  if (acc >= 70) return 2;
  if (acc >= 40) return 1;
  return 0;
}

/* ---------- COMPONENT ---------- */
export default function BenarSalah({ backHref = "/arena/game" }: { backHref?: string }) {
  const [screen, setScreen] = useState<Screen>("start");
  const [saved, setSaved] = useState<Saved>({ unlocked: [1], best: {}, stars: {} });
  const [levelId, setLevelId] = useState(1);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [lives, setLives] = useState(3);
  const [flash, setFlash] = useState<null | "ok" | "no">(null);
  const [result, setResult] = useState<null | {
    score: number; correct: number; wrong: number;
    accuracy: number; stars: number; maxCombo: number;
    gameOver: boolean; xpEarned: number;
  }>(null);
  const [burst, setBurst] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(false);

  const controls = useAnimationControls();
  const lockRef = useRef(false);
  const xpSentRef = useRef(false);

  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
  const current = questions[idx];

  const candidateIdx = useMemo(() => {
    if (!current) return 0;
    if (Math.random() < 0.5) return current.jawaban;
    const wrong = current.opsi.map((_, i) => i).filter((i) => i !== current.jawaban);
    return wrong[Math.floor(Math.random() * wrong.length)] ?? current.jawaban;
  }, [idx, current]);

  /* Init */
  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "playing")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => {
    setSaved(loadSaved());
    try { setSoundOn(isSoundOn()); } catch { /* abaikan */ }
  }, []);

  /* Reset on unmount */
  useEffect(() => () => stopBGM(), []);

  /* Timer */
  useEffect(() => {
    if (screen !== "playing") return;
    if (timeLeft <= 0) {
      finish(score, correctCount, wrongCount, bestCombo, false, true);
      return;
    }
    if (timeLeft <= 5) sfx.tick?.();
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft]);

  /* Keyboard */
  useEffect(() => {
    if (screen !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") answer(true);
      if (e.key === "ArrowRight") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, idx, questions, candidateIdx, score, combo, correctCount, wrongCount, lives, bestCombo]);

  const startLevel = useCallback(async (id: number) => {
    sfx.start();
    setSoundOn(isSoundOn());
    startBGM();
    setLoading(true);
    setLevelId(id);
    setIdx(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLives(3);
    setFlash(null);
    setResult(null);
    xpSentRef.current = false;
    lockRef.current = false;

    const lv = LEVELS.find((l) => l.id === id) || LEVELS[0];
    try {
      const res = await fetch(`/api/game/menara?count=${lv.count}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        setLoading(false);
        return;
      }
      setQuestions(data.questions);
      setTimeLeft(lv.time);
      setScreen("playing");
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const finish = useCallback((
    finalScore: number, finalCorrect: number, finalWrong: number,
    finalMaxCombo: number, gameOver: boolean, timeUp: boolean
  ) => {
    stopBGM();
    const total = finalCorrect + finalWrong;
    const accuracy = total === 0 ? 0 : Math.round((finalCorrect / total) * 100);
    const stars = starsFor(accuracy, gameOver);
    const xpEarned = Math.min(Math.floor(finalScore / 40), 60);

    if (!gameOver && finalScore > 0) {
      sfx.win();
      haptic([40, 40, 80]);
      setBurst((b) => b + 1);
    } else if (gameOver) {
      sfx.gameover?.();
      haptic(120);
    }

    setResult({ score: finalScore, correct: finalCorrect, wrong: finalWrong, accuracy, stars, maxCombo: finalMaxCombo, gameOver, xpEarned });
    setScreen("result");

    /* Save progress */
    setSaved((prev) => {
      const next = { ...prev, best: { ...prev.best }, stars: { ...prev.stars }, unlocked: [...prev.unlocked] };
      if (!gameOver) {
        if (!next.best[levelId] || finalScore > next.best[levelId]) next.best[levelId] = finalScore;
        if (!next.stars[levelId] || stars > next.stars[levelId]) next.stars[levelId] = stars;
        const nid = levelId + 1;
        if (nid <= LEVELS.length && !next.unlocked.includes(nid)) next.unlocked.push(nid);
      }
      saveSaved(next);
      return next;
    });

    /* XP */
    if (!xpSentRef.current && finalScore > 0) {
      xpSentRef.current = true;
      let supabaseId = "";
      try {
        supabaseId = JSON.parse(localStorage.getItem("bc-user") || "{}").state?.supabaseId || "";
      } catch { /* abaikan */ }
      fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: finalScore,
          correct: finalCorrect,
          wrong: finalWrong,
          maxStreak: finalMaxCombo,
          xpEarned,
          gameType: "BENAR_SALAH",
          supabaseId,
        }),
      }).catch(() => { /* abaikan */ });
    }
  }, [levelId]);

  const answer = (saidBenar: boolean) => {
    if (lockRef.current || screen !== "playing") return;
    lockRef.current = true;

    const isCorrect = (candidateIdx === current.jawaban) === saidBenar;
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    const newWrong = isCorrect ? wrongCount : wrongCount + 1;
    const newLives = isCorrect ? lives : lives - 1;

    if (isCorrect) {
      const newScore = score + 1;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setBestCombo((b) => Math.max(b, newCombo));
      setCorrectCount(newCorrect);
      if (newCombo >= 3) sfx.combo?.(newCombo);
      else sfx.correct?.();
      haptic(25);
      setBurst((b) => b + 1);
      setFlash("ok");
    } else {
      setCombo(0);
      setWrongCount(newWrong);
      setLives(newLives);
      sfx.wrong?.();
      haptic([60, 40, 60]);
      setFlash("no");
      controls.start({ x: [0, -10, 10, -7, 7, 0], transition: { duration: 0.4 } });
    }

    const delay = isCorrect ? 320 : 620;
    setTimeout(() => {
      setFlash(null);
      lockRef.current = false;

      if (newLives <= 0) {
        finish(score + (isCorrect ? 1 : 0), newCorrect, newWrong, bestCombo, true, false);
        return;
      }

      const next = idx + 1;
      if (next >= questions.length) {
        finish(score + (isCorrect ? 1 : 0), newCorrect, newWrong, Math.max(bestCombo, isCorrect ? combo + 1 : 0), false, false);
        return;
      }

      setIdx(next);
    }, delay);
  };

  /* ---------- RENDER HELPERS ---------- */
  const timePct = (timeLeft / level.time) * 100;
  const chunky = "border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]";
  const btnBase = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  /* ---------- START SCREEN ---------- */
  if (screen === "start") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#0F0D21] dark:to-[#181330] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`@keyframes bs-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes bs-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes bs-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes bs-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bs-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .bs-screen{animation:bs-fade .35s ease}
        .bs-star{animation:bs-pop .5s ease}
        .bs-logo{animation:bs-pulse 1.4s ease-in-out infinite}`}</style>
        {/* Dekorasi Melayang */}
        <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#FF6B6B] border-4 border-[#161B3A] rounded-3xl" style={{ animation: "bs-float1 9s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#38BDF8] border-4 border-[#161B3A] rounded-full" style={{ animation: "bs-float2 10s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#FBBF24] border-4 border-[#161B3A] rounded-2xl" style={{ animation: "bs-float1 11s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#4ADE80] border-4 border-[#161B3A] rounded-[30%_70%_70%_30%]" style={{ animation: "bs-float2 8s ease-in-out infinite" }} />

        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`bs-logo w-11 h-11 bg-[#10B981] rounded-2xl ${chunky} !shadow-[4px_4px_0_#161B3A] flex items-center justify-center`}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-xl leading-none">Benar Salah</div>
                <div className="text-[11px] font-semibold opacity-60 mt-0.5">Tes kecepatan & ketepatan</div>
              </div>
            </div>
            <button onClick={() => setSoundOn((m) => { toggleSound(); return !m; })} className={`${btnBase} w-11 h-11 bg-white dark:bg-[#16122A]`} aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <div className="bs-screen bg-white dark:bg-[#16122A] rounded-3xl p-6 text-center flex-1 flex flex-col items-center justify-center">
            <span className="inline-block px-4 py-1.5 bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-full font-extrabold text-xs shadow-[3px_3px_0_#161B3A] mb-4">9 Level • 3 Nyawa</span>
            <h1 className="font-extrabold text-4xl mb-2">Benar atau <span className="text-[#FF6B6B]">Salah?</span></h1>
            <p className="opacity-70 text-sm max-w-sm mb-1">Baca soal dan jawaban yang muncul. Tentukan: jawaban itu <b>benar</b> atau <b>salah</b>?</p>
            <p className="text-xs opacity-50 mb-6">Semakin cepat & tepat, rentetan makin tinggi!</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 w-full max-w-xs">
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Benar</div>
                <div className="font-extrabold text-lg">+1</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="font-extrabold text-lg">Bonus</div>
              </div>
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Salah</div>
                <div className="font-extrabold text-lg">-1 ❤️</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-2">
              <button className={`${btnBase} px-6 py-3.5 bg-[#FF6B6B] text-white text-lg`} onClick={() => setScreen("levels")}>
                <Play className="w-5 h-5" /> Pilih Tingkat
              </button>
              <button className={`${btnBase} px-5 py-3.5 bg-white dark:bg-[#16122A]`} onClick={() => startLevel(1)}>
                Langsung Level 1
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] opacity-50 mt-4 pb-4">Kumpulkan ⭐ di setiap level untuk buka level berikutnya!</p>
        </div>
      </div>
    );
  }

  /* ---------- LEVELS SCREEN ---------- */
  if (screen === "levels") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#0F0D21] dark:to-[#181330] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`.bs-screen{animation:bs-fade .35s ease}`}</style>
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#16122A] border-4 border-[#161B3A] rounded-2xl p-6 shadow-[6px_6px_0_#161B3A]">
              <Loader2 className="w-8 h-8 animate-spin text-[#161B3A] mx-auto mb-2" />
              <div className="font-bold text-sm">Memuat soal...</div>
            </div>
          </div>
        )}
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <button className={`${btnBase} w-11 h-11 bg-white dark:bg-[#16122A]`} onClick={() => setScreen("start")} aria-label="Kembali">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-extrabold text-2xl">Pilih Tingkat</h2>
            <div className="w-11" />
          </div>
          <div className="bs-screen bg-white dark:bg-[#16122A] rounded-3xl p-5 shadow-[6px_6px_0_#161B3A] border-4 border-[#161B3A]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LEVELS.map((lv) => {
                const unlocked = saved.unlocked.includes(lv.id);
                const best = saved.best[lv.id] || 0;
                const st = saved.stars[lv.id] || 0;
                return (
                  <button
                    key={lv.id}
                    disabled={!unlocked || loading}
                    onClick={() => unlocked && !loading && startLevel(lv.id)}
                    className={`text-left rounded-2xl border-4 border-[#161B3A] p-3.5 transition-transform ${
                      unlocked ? "shadow-[5px_5px_0_#161B3A] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-[5px_5px_0_#9CA3AF] dark:bg-slate-700/60 dark:text-slate-400"
                    }`}
                    style={unlocked ? { background: lv.color, color: ["#FBBF24", "#F59E0B", "#4ADE80", "#38BDF8"].includes(lv.color) ? "#161B3A" : "#fff" } : undefined}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-extrabold text-2xl leading-none">#{lv.id}</span>
                      {unlocked ? <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/15">{lv.topic}</span> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="font-extrabold text-sm leading-tight mb-0.5">{lv.name}</div>
                    <div className="text-[10px] font-semibold opacity-75 mb-1.5">{lv.count} soal • {lv.time} dtk</div>
                    {unlocked ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star key={i} className="w-4 h-4" fill={i <= st ? "currentColor" : "none"} style={{ opacity: i <= st ? 1 : 0.35 }} />
                        ))}
                        {best > 0 && <span className="text-[10px] font-extrabold ml-1.5 opacity-80">{best}</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold">Selesaikan tingkat sebelumnya</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- PLAYING SCREEN ---------- */
  if (screen === "playing") {
    return (
      <div className="fixed inset-0 z-[60] overflow-hidden bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#0F0D21] dark:to-[#181330] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`@keyframes bs-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
        <AnimatePresence>
          {flash && (
            <motion.div key={flash} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className={`w-28 h-28 rounded-full border-[6px] flex items-center justify-center backdrop-blur-sm ${flash === "ok" ? "border-emerald-400 text-emerald-300 bg-emerald-500/10" : "border-rose-400 text-rose-300 bg-rose-500/10"}`}>
                {flash === "ok" ? <Check className="w-16 h-16" strokeWidth={3} /> : <X className="w-16 h-16" strokeWidth={3} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Burst trigger={burst} x={50} y={38} count={28} />
        <ComboFlash combo={combo} />

        <motion.div animate={controls} className="relative z-10 flex flex-col h-full max-w-md mx-auto px-5 pt-4 pb-6">
          {/* HUD */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/10 border-2 border-[#161B3A]">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold">{score}</span>
            </div>
            <AnimatePresence>
              {combo >= 2 && (
                <motion.div key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-600 text-sm font-extrabold border border-orange-500/30">
                  <Flame className="w-4 h-4 fill-orange-500 text-orange-500" /> {combo}x
                </motion.div>
              )}
            </AnimatePresence>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/10 border-2 border-[#161B3A]">
              <Heart className="w-4 h-4 text-rose-500" fill="currentColor" />
              <span className="text-sm font-bold">{lives}</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 ${timeLeft <= 10 ? "bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-400" : "bg-white/80 dark:bg-white/10 border-[#161B3A]"}`}>
              <Timer className="w-4 h-4" />
              <span className="text-sm font-bold tabular-nums">{timeLeft}s</span>
            </div>
            <button onClick={() => { const on = toggleSound(); setSoundOn(on); }} className="w-9 h-9 rounded-xl bg-white/80 dark:bg-white/10 border-2 border-[#161B3A] flex items-center justify-center text-[#161B3A]/70 dark:text-[#F1EDFF]/70 active:scale-90 transition-all" aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Timer bar */}
          <div className="mb-5">
            <div className="h-2.5 rounded-full bg-white/60 border-2 border-[#161B3A] overflow-hidden">
              <motion.div className={`h-full rounded-full ${timeLeft <= 10 ? "bg-rose-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} animate={{ width: `${timePct}%` }} transition={{ ease: "linear", duration: 1 }} />
            </div>
          </div>

          {/* Question */}
          <div className="flex-1 flex flex-col justify-center pb-6">
            <AnimatePresence mode="wait">
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.18 }} className="rounded-3xl bg-white/[0.07] border border-white/10 p-6 text-center mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#161B3A]/60 mb-3">Soal {idx + 1} / {questions.length}</p>
                <h2 className="text-lg font-bold text-[#161B3A] leading-snug mb-5">{current?.soal}</h2>
                <div className="inline-block px-5 py-3 rounded-2xl bg-white/10 border border-white/15">
                  <span className="text-[11px] text-[#161B3A]/50 block mb-0.5">Jawabannya:</span>
                  <span className="text-xl font-extrabold text-[#161B3A]">{current?.opsi[candidateIdx]}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => answer(true)} className={`py-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-lg shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex flex-col items-center gap-1 border-4 border-[#161B3A]`}>
                <Check className="w-7 h-7" /> BENAR
              </button>
              <button onClick={() => answer(false)} className={`py-5 rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-white font-extrabold text-lg shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex flex-col items-center gap-1 border-4 border-[#161B3A]`}>
                <X className="w-7 h-7" /> SALAH
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button className={`${btnBase} w-11 h-11 bg-white dark:bg-[#16122A]`} onClick={() => { stopBGM(); setScreen("levels"); }} aria-label="Keluar">
              <X className="w-5 h-5" />
            </button>
            <div className="hidden md:block text-xs font-semibold opacity-60">Tombol keyboard: ← Benar • → Salah</div>
            <div className="w-11" />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------- RESULT SCREEN ---------- */
  if (screen === "result" && result) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#0F0D21] dark:to-[#181330] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`.bs-screen{animation:bs-fade .35s ease}`}</style>
        <Burst trigger={burst} x={50} y={38} count={28} />
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }} className={`w-24 h-24 rounded-[28px] bg-gradient-to-br ${result.gameOver ? "from-rose-400 to-red-600" : result.stars >= 2 ? "from-emerald-400 to-teal-600" : "from-amber-400 to-orange-600"} flex items-center justify-center shadow-2xl shadow-teal-500/40 mb-5`}>
            {result.gameOver ? <X className="w-12 h-12 text-white" /> : <Trophy className="w-12 h-12 text-white" />}
          </motion.div>
          <h1 className="text-2xl font-extrabold mb-1">
            {result.gameOver ? "Nyawa Habis! 😢" : result.stars === 3 ? "Sempurna! 🎉" : "Level Selesai!"}
          </h1>
          <p className="text-sm opacity-60 mb-6">
            {result.gameOver ? "Jangan menyerah, coba lagi!" : `Kamu menjawab ${result.correct} soal dengan benar!`}
          </p>

          <div className="flex justify-center gap-1.5 mb-4">
            {[1, 2, 3].map((i) => (
              <Star key={i} className={`w-12 h-12 ${i <= result.stars ? "bs-star" : ""}`} style={{ animationDelay: `${i * 0.15}s` }} fill={i <= result.stars ? "#FBBF24" : "none"} stroke={i <= result.stars ? "#F59E0B" : "#D1D5DB"} strokeWidth={2} />
            ))}
          </div>

          <div className="inline-block bg-[#161B3A] text-white rounded-2xl px-7 py-3 mb-4 shadow-[5px_5px_0_#FF6B6B]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Skor Akhir</div>
            <div className="font-extrabold text-4xl leading-none">{result.score}</div>
          </div>

          <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto mb-6 text-center">
            <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#161B3A]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Benar</div>
              <div className="font-extrabold text-lg">{result.correct}</div>
            </div>
            <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#161B3A]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Salah</div>
              <div className="font-extrabold text-lg">{result.wrong}</div>
            </div>
            <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#161B3A]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Akurasi</div>
              <div className="font-extrabold text-lg">{result.accuracy}%</div>
            </div>
            <div className="bg-white dark:bg-[#16122A] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#161B3A]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Rentetan</div>
              <div className="font-extrabold text-lg">{result.maxCombo}</div>
            </div>
          </div>

          {result.xpEarned > 0 && (
            <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> +{result.xpEarned} XP
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <button onClick={() => startLevel(levelId)} className={`${btnBase} w-full py-3.5 bg-gradient-to-r from-emerald-400 to-teal-600 text-white font-bold shadow-lg shadow-teal-600/30`}>
              <RotateCcw className="w-4 h-4" /> Ulangi Level
            </button>
            {!result.gameOver && levelId < LEVELS.length && (
              <button onClick={() => startLevel(levelId + 1)} className={`${btnBase} w-full py-3.5 bg-[#FF6B6B] text-white font-bold`}>
                Level Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setScreen("levels")} className={`${btnBase} w-full py-3.5 bg-[#FBBF24] font-bold`}>
              Pilih Tingkat
            </button>
            <Link href={backHref} className={`${btnBase} w-full py-3.5 bg-white/80 dark:bg-white/10 text-[#161B3A]/80 dark:text-[#F1EDFF]/80 font-semibold text-center`}>
              Kembali ke Arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Fallback / Loading */
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#0F0D21] dark:to-[#181330] text-[#161B3A] dark:text-[#F1EDFF]">
      <Loader2 className="w-10 h-10 animate-spin text-[#161B3A]" />
    </div>
  );
}
