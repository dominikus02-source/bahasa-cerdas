"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Timer, Star, Flame, Trophy, X, RotateCcw, Sparkles,
  Volume2, VolumeX, Loader2, Play, Check,
} from "lucide-react";
import { sfx, haptic, isSoundOn, toggleSound, startBGM, stopBGM } from "@/lib/game/sound";

interface Question {
  text: string;
  options: string[];
  correct: number;
  type: string;
}

const TYPE_LABEL: Record<string, string> = {
  sinonim: "Sinonim", antonim: "Antonim", kata_baku: "Kata Baku", imbuhan: "Imbuhan",
  kalimat: "Melengkapi Kalimat", ejaan: "Ejaan", peribahasa: "Peribahasa", majas: "Majas",
  sastra: "Sastra", HOTS: "HOTS", kalimat_efektif: "Kalimat Efektif", tata_bahasa: "Tata Bahasa",
  kosakata: "Kosakata", teks: "Teks",
};

export default function LariKataGame({ hideBackButton, backHref = "/arena/game" }: { hideBackButton?: boolean; backHref?: string }) {
  const [screen, setScreen] = useState<"start" | "playing" | "result">("start");
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseIdRef = useRef("");
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const maxStreakRef = useRef(0);
  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "playing")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correct; }, [correct]);
  useEffect(() => { wrongRef.current = wrong; }, [wrong]);
  useEffect(() => { maxStreakRef.current = maxStreak; }, [maxStreak]);

  useEffect(() => {
    const stored = localStorage.getItem("bc-user");
    if (stored) { try { supabaseIdRef.current = JSON.parse(stored).state?.supabaseId || ""; } catch { /* abaikan */ } }
    try { setSoundOn(isSoundOn()); } catch { /* abaikan */ }
  }, []);
  useEffect(() => () => stopBGM(), []);

  const startGame = useCallback(async () => {
    sfx.start(); setSoundOn(isSoundOn()); startBGM();
    setLoading(true);
    try {
      const res = await fetch("/api/katastra/questions?count=20");
      const data = await res.json();
      setQuestions(data.questions || []);
      setScreen("playing");
      setCurrentQ(0);
      setScore(0);
      setCorrect(0);
      setWrong(0);
      setStreak(0);
      setMaxStreak(0);
      setTimeLeft(60);
      setSelected(null);
      setFeedback(null);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const endGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopBGM();
    if (correctRef.current > 0) { sfx.win(); haptic([40, 40, 80]); } else { sfx.gameover(); }
    setScreen("result");
    setSubmitting(true);
    try {
      const res = await fetch("/api/katastra/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scoreRef.current, correct: correctRef.current, wrong: wrongRef.current, maxStreak: maxStreakRef.current, mode: "dash", supabaseId: supabaseIdRef.current }),
      });
      const data = await res.json();
      setResult(data);
    } catch { /* abaikan */ } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    if (screen !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 6 && t > 0) sfx.tick();
        if (t <= 1) { clearInterval(timerRef.current!); endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, endGame]);

  const handleAnswer = (idx: number) => {
    if (selected !== null || feedback !== null) return;
    const q = questions[currentQ];
    const isCorrect = idx === q.correct;
    setSelected(idx);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) { sfx.climb(streak + 1); haptic(25); } else { sfx.wrong(); haptic([60, 40, 60]); }

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft / 6);
      const streakBonus = Math.min(streak, 10) * 10;
      const points = 100 + timeBonus + streakBonus;
      setScore((s) => s + points);
      setCorrect((c) => c + 1);
      setStreak((s) => { const ns = s + 1; setMaxStreak((m) => Math.max(m, ns)); return ns; });
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
    }

    feedbackTimer.current = setTimeout(() => {
      setSelected(null);
      setFeedback(null);
      if (currentQ < questions.length - 1) setCurrentQ((c) => c + 1);
      else endGame();
    }, 750);
  };

  const chunky = "border-4 border-[#161B3A] shadow-[6px_6px_0_#EA580C]";
  const btnBase = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;
  const q = questions[currentQ];
  const timePct = (timeLeft / 60) * 100;

  /* ---------- START ---------- */
  if (screen === "start") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#150C06] dark:to-[#201008] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`@keyframes lk-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes lk-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes lk-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .lk-screen{animation:lk-fade .35s ease}
        .lk-logo{animation:lk-pulse 1.4s ease-in-out infinite}`}</style>
        <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#F59E0B] border-4 border-[#161B3A] rounded-3xl" style={{ animation: "lk-float1 9s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#FF6B6B] border-4 border-[#161B3A] rounded-full" style={{ animation: "lk-float2 10s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#38BDF8] border-4 border-[#161B3A] rounded-2xl" style={{ animation: "lk-float1 11s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#4ADE80] border-4 border-[#161B3A] rounded-[30%_70%_70%_30%]" style={{ animation: "lk-float2 8s ease-in-out infinite" }} />

        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`lk-logo w-11 h-11 bg-[#F59E0B] rounded-2xl ${chunky} !shadow-[4px_4px_0_#EA580C] flex items-center justify-center`}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-xl leading-none">Lari Kata</div>
                <div className="text-[11px] font-semibold opacity-60 mt-0.5">Sprint 60 detik, kejar skor tertinggi</div>
              </div>
            </div>
            <button onClick={() => setSoundOn((m) => { toggleSound(); return !m; })} className={`${btnBase} w-11 h-11 bg-white/90 dark:bg-white/15 border-2 dark:border-white/20 hover:bg-white dark:hover:bg-white/25`} aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <div className="lk-screen bg-white dark:bg-gradient-to-br dark:from-[#221810] dark:to-[#2E2218] rounded-3xl p-6 text-center flex-1 flex flex-col items-center justify-center">
            <span className="inline-block px-4 py-1.5 bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-full font-extrabold text-xs shadow-[3px_3px_0_#EA580C] mb-4">20 Soal • 60 Detik</span>
            <h1 className="font-extrabold text-4xl mb-2">Lari <span className="text-[#F59E0B]">Kata!</span></h1>
            <p className="opacity-70 text-sm max-w-sm mb-1">Jawab soal secepat mungkin dalam 60 detik. Soal makin menantang seiring tingkatmu naik!</p>
            <p className="text-xs opacity-50 mb-6">Bonus waktu + rentetan bikin skormu melesat.</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 w-full max-w-xs">
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#EA580C]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Benar</div>
                <div className="font-extrabold text-lg">+100</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#EA580C]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="font-extrabold text-lg">Bonus</div>
              </div>
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#EA580C]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Sisa Waktu</div>
                <div className="font-extrabold text-lg">Bonus</div>
              </div>
            </div>

            <button onClick={startGame} disabled={loading} className={`${btnBase} px-8 py-3.5 bg-[#F59E0B] text-white text-lg disabled:opacity-70`}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan…</> : <><Play className="w-5 h-5" /> Mulai!</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- PLAYING ---------- */
  if (screen === "playing" && q) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#150C06] dark:to-[#201008] text-[#161B3A] dark:text-[#F1EDFF]">
        <div className="relative max-w-lg mx-auto px-5 pt-4 pb-8 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            {!hideBackButton && (
              <button className={`${btnBase} w-12 h-12 bg-white/90 dark:bg-white/20 border-2 dark:border-white/20 hover:bg-white dark:hover:bg-white/25`} onClick={() => { stopBGM(); setScreen("start"); }} aria-label="Keluar">
                <X className="w-5 h-5 text-[#161B3A] dark:text-white" />
              </button>
            )}
            <div className={`flex items-center gap-2 ${hideBackButton ? "ml-auto" : ""}`}>
              {streak > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span className="text-orange-700 dark:text-orange-300 font-bold text-xs">{streak}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#221810] border-2 border-[#161B3A]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold">{score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold opacity-50">{currentQ + 1} / {questions.length}</span>
            <div className="flex items-center gap-1.5">
              <Timer className={`w-3.5 h-3.5 ${timeLeft <= 10 ? "text-rose-500" : "opacity-50"}`} />
              <span className={`text-xs font-bold tabular-nums ${timeLeft <= 10 ? "text-rose-600" : "opacity-70"}`}>{timeLeft}dtk</span>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-white dark:bg-[#221810] border-2 border-[#161B3A] overflow-hidden mb-5">
            <motion.div className={`h-full rounded-full ${timeLeft <= 10 ? "bg-rose-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`} animate={{ width: `${timePct}%` }} transition={{ ease: "linear", duration: 1 }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#221810] rounded-2xl p-5 mb-5 border-4 border-[#161B3A] shadow-[5px_5px_0_#EA580C]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F59E0B] mb-2 block">{TYPE_LABEL[q.type] || "Soal"}</span>
              <p className="text-lg font-bold leading-relaxed">{q.text}</p>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-2.5 flex-1">
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrectOpt = i === q.correct;
              let style = "bg-white dark:bg-[#2E2015] text-[#161B3A] dark:text-[#F1EDFF]";
              if (feedback) {
                if (isCorrectOpt) style = "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200";
                else if (isSelected) style = "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200";
                else style = "bg-white/50 dark:bg-white/5 text-[#161B3A]/30 dark:text-[#F1EDFF]/30";
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-[3px] border-[#161B3A] font-semibold transition-all active:scale-[0.98] shadow-[3px_3px_0_#EA580C] flex items-center justify-between ${style}`}>
                  <span>{opt}</span>
                  {feedback && isCorrectOpt && <Check className="w-4 h-4 shrink-0" />}
                  {feedback && isSelected && !isCorrectOpt && <X className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- RESULT ---------- */
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#150C06] dark:to-[#201008] text-[#161B3A] dark:text-[#F1EDFF]">
      <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }}
          className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-2xl mb-5 border-4 border-[#161B3A]">
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>
        <h1 className="text-2xl font-extrabold mb-1">Sprint Selesai!</h1>
        <p className="text-sm opacity-60 mb-6">Bagus! Terus tingkatkan kecepatanmu!</p>

        <div className="bg-white dark:bg-[#221810] rounded-2xl p-5 mb-4 border-4 border-[#161B3A] shadow-[5px_5px_0_#EA580C] w-full max-w-sm">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#EA580C]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Benar</div>
              <div className="font-extrabold text-lg">{correct}</div>
            </div>
            <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#EA580C]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Salah</div>
              <div className="font-extrabold text-lg">{wrong}</div>
            </div>
            <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[2px_2px_0_#EA580C]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Rentetan</div>
              <div className="font-extrabold text-lg">{maxStreak}</div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-extrabold uppercase opacity-50">Skor Akhir</p>
            <p className="text-4xl font-extrabold">{score.toLocaleString()}</p>
          </div>
        </div>

        {submitting ? (
          <div className="mb-4 flex items-center gap-2 text-sm opacity-60"><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan hasil…</div>
        ) : result && result.xpEarned != null && (
          <div className="bg-emerald-100 dark:bg-emerald-500/15 border-4 border-[#161B3A] rounded-2xl p-4 mb-4 shadow-[4px_4px_0_#EA580C] w-full max-w-sm">
            <div className="flex items-center gap-2 justify-center mb-1">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">+{result.xpEarned} XP</span>
            </div>
            {result.levelUp && (
              <div className="bg-amber-300 text-amber-900 px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 mt-1">
                <Sparkles className="w-3.5 h-3.5" /> Naik Tingkat!
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={startGame} className={`${btnBase} flex-1 py-3.5 bg-[#F59E0B] text-white`}>
            <RotateCcw className="w-4 h-4" /> Main Lagi
          </button>
          {!hideBackButton && (
            <a href={backHref} className={`${btnBase} flex-1 py-3.5 bg-white/80 dark:bg-white/20 dark:border-white/20 text-center`}>
              Menu
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
