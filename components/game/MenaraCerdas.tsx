"use client";

import { useState, useCallback, useEffect } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Heart, Flame, Trophy, RotateCcw, Mountain, Check, X, Loader2, Sparkles, Zap, Volume2, VolumeX, Play, Lightbulb } from "lucide-react";
import Burst from "@/components/game/Burst";
import ComboFlash from "@/components/game/ComboFlash";
import ConfettiBurst from "@/components/game/ConfettiBurst";
import { usePowerUps } from "@/hooks/usePowerUps";
import { pilihOpsiSalah } from "@/lib/power-up-hint";
import { sfx, haptic, isSoundOn, toggleSound, startBGM, stopBGM } from "@/lib/game/sound";
import GameBackButton from "@/components/game/GameBackButton";

interface Q {
  id: string;
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan: string;
}

type Phase = "start" | "loading" | "playing" | "gameover";
const MAX_HEARTS = 3;

export default function MenaraCerdas({ backHref = "/arena/game" }: { backHref?: string }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [floor, setFloor] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [xpResult, setXpResult] = useState<{ xpEarned: number; leveledUp: boolean } | null>(null);
  const [burst, setBurst] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const controls = useAnimationControls();

  // Item bantuan Toko Koin. Tanpa Hint Token tombolnya tidak dirender sama
  // sekali, dan permainan berjalan persis seperti sebelumnya.
  const { hintCount, confettiAktif, consume, error: powerUpError, clearError } = usePowerUps();
  const [opsiDicoret, setOpsiDicoret] = useState<Record<string, number>>({});
  const [hintProses, setHintProses] = useState(false);
  const [confetti, setConfetti] = useState(0);

  const total = questions.length;
  const current = questions[idx];

  useEffect(() => () => stopBGM(), []);
  useEffect(() => {
    setQuiet(phase === "playing")
    return () => setQuiet(false)
  }, [phase])

  useEffect(() => { try { setSoundOn(isSoundOn()); } catch { /* abaikan */ } }, []);

  const start = useCallback(async () => {
    sfx.start(); setSoundOn(isSoundOn()); startBGM();
    setPhase("loading");
    setIdx(0); setFloor(0); setHearts(MAX_HEARTS); setCombo(0); setBest(0); setPicked(null); setXpResult(null);
    setOpsiDicoret({}); clearError();
    try {
      const res = await fetch("/api/game/menara?count=12", { cache: "no-store" });
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
  }, [clearError]);

  const finish = useCallback(async (finalFloor: number) => {
    stopBGM();
    const cleared = finalFloor >= total && total > 0;
    if (cleared) { sfx.win(); haptic([40, 40, 80]); setBurst((b) => b + 1); }
    else { sfx.gameover(); haptic(120); }
    setPhase("gameover");
    try {
      const res = await fetch("/api/game/menara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct: finalFloor, total }),
      });
      const data = await res.json();
      if (res.ok) setXpResult({ xpEarned: data.xpEarned ?? 0, leveledUp: !!data.leveledUp });
    } catch { /* keep local result */ }
  }, [total]);

  const dicoret = current ? opsiDicoret[current.id] : undefined;
  const bolehPakaiHint = !!current && picked === null && dicoret === undefined && hintCount > 0;

  /** Hint Token: coret satu opsi salah. Efeknya hanya jalan kalau server sukses. */
  const pakaiHint = async () => {
    if (!current || !bolehPakaiHint || hintProses) return;
    const target = pilihOpsiSalah(current.id, current.opsi.length, current.jawaban);
    if (target === null) return;
    setHintProses(true);
    const berhasil = await consume("HINT_TOKEN");
    setHintProses(false);
    if (!berhasil) return;
    setOpsiDicoret((prev) => (prev[current.id] !== undefined ? prev : { ...prev, [current.id]: target }));
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    if (dicoret === i) return;
    setPicked(i);
    const isCorrect = i === current.jawaban;

    if (isCorrect) {
      sfx.climb(combo + 1); haptic(25); setBurst((b) => b + 1);
      if (confettiAktif) setConfetti((c) => c + 1);
      controls.start({ y: [0, -6, 0], transition: { duration: 0.3 } });
    } else {
      sfx.wrong(); haptic([60, 40, 60]);
      controls.start({ x: [0, -10, 10, -7, 7, 0], transition: { duration: 0.4 } });
    }

    setTimeout(() => {
      if (isCorrect) {
        const nf = floor + 1;
        setFloor(nf);
        setCombo((c) => { const nc = c + 1; setBest((b) => Math.max(b, nc)); return nc; });
        if (idx + 1 >= total) finish(nf);
        else { setIdx(idx + 1); setPicked(null); }
      } else {
        setCombo(0);
        const nh = hearts - 1;
        setHearts(nh);
        if (nh <= 0) finish(floor);
        else if (idx + 1 >= total) finish(floor);
        else { setIdx(idx + 1); setPicked(null); }
      }
    }, isCorrect ? 650 : 1400);
  };

  const chunky = "border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#CA8A04]";
  const btnBase = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  /* ---------- START ---------- */
  if (phase === "start" || phase === "loading") {
    return (
      <div className="game-env game-env-menara fixed inset-0 z-[60] overflow-y-auto game-env-bg bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#16120A] dark:via-[#1A1510] dark:to-[#201A0C] dark:text-[#F5EDD6]">
        <style>{`@keyframes mc-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes mc-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes mc-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mc-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .mc-screen{animation:mc-fade .35s ease}
        .mc-logo{animation:mc-pulse 1.4s ease-in-out infinite}`}</style>
        <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#8B5CF6] border-4 border-[#161B3A] dark:border-white/25 rounded-3xl" style={{ animation: "mc-float1 9s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#38BDF8] border-4 border-[#161B3A] dark:border-white/25 rounded-full" style={{ animation: "mc-float2 10s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#FBBF24] border-4 border-[#161B3A] dark:border-white/25 rounded-2xl" style={{ animation: "mc-float1 11s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#EC4899] border-4 border-[#161B3A] dark:border-white/25 rounded-[30%_70%_70%_30%]" style={{ animation: "mc-float2 8s ease-in-out infinite" }} />

        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <GameBackButton href="/arena/game" label="Kembali ke Arena" title="Kembali ke Arena" />
              <div className={`mc-logo w-11 h-11 bg-[#8B5CF6] rounded-2xl ${chunky} !shadow-[4px_4px_0_#CA8A04] flex items-center justify-center`}>
                <Mountain className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-xl leading-none dark:text-[#F5C542]">Menara Cerdas</div>
                <div className="text-[11px] font-semibold dark:text-[#B89830] mt-0.5">Panjat setinggi mungkin</div>
              </div>
            </div>
            <button onClick={() => setSoundOn((m) => { toggleSound(); return !m; })} className={`${btnBase} game-sound-btn w-11 h-11 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700`} aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <div className="mc-screen bg-white game-env-card dark:bg-gradient-to-br dark:from-[#221E18] dark:via-[#1E1A12] dark:to-[#1A1610] dark:border-amber-600/30 rounded-3xl p-6 text-center flex-1 flex flex-col items-center justify-center">
            <span className="inline-block px-4 py-1.5 bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-full font-extrabold text-xs shadow-[3px_3px_0_#CA8A04] mb-4">Soal dari Pelajaranmu</span>
            <h1 className="font-extrabold text-4xl mb-2">Menara <span className="dark:text-[#D4A843]">Cerdas!</span></h1>
            <p className="dark:text-[#D4C8A0] text-sm max-w-sm mb-1">Panjat menara dengan menjawab soal dari pelajaranmu. Setiap jawaban benar = naik 1 lantai!</p>
            <p className="text-xs dark:text-[#8A7A40] mb-6">Jaga 3 nyawamu, bertahanlah setinggi mungkin.</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 w-full max-w-xs">
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#CA8A04]">
                <div className="text-[10px] font-extrabold uppercase opacity-80">Nyawa</div>
                <div className="font-extrabold text-lg">3 ❤️</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#CA8A04]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="font-extrabold text-lg">Bonus</div>
              </div>
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#CA8A04]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Naik</div>
                <div className="font-extrabold text-lg">+XP</div>
              </div>
            </div>

            <button onClick={start} disabled={phase === "loading"} className={`${btnBase} px-8 py-3.5 bg-[#8B5CF6] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-white dark:shadow-[0_0_16px_rgba(245,197,66,0.3)] text-lg disabled:opacity-70`}>
              {phase === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan…</> : <><Play className="w-5 h-5" /> Mulai Memanjat</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- GAME OVER ---------- */
  if (phase === "gameover") {
    const cleared = floor >= total && total > 0;
    return (
      <div className="game-env game-env-menara fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#16120A] dark:via-[#1A1510] dark:to-[#201A0C] dark:text-[#F5EDD6]">
        <Burst trigger={burst} x={50} y={38} count={28} />
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }}
            className={`w-24 h-24 rounded-[28px] flex items-center justify-center shadow-2xl mb-5 border-4 border-[#161B3A] dark:border-white/25 ${cleared ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-violet-500 to-purple-600"}`}>
            {cleared ? <Trophy className="w-12 h-12 text-white" /> : <Mountain className="w-12 h-12 text-white" />}
          </motion.div>
          <h1 className="text-2xl font-extrabold dark:text-[#F5C542] mb-1">{cleared ? "Puncak Ditaklukkan!" : "Permainan Selesai"}</h1>
          <p className="text-sm dark:text-[#D4C8A0] opacity-60 mb-6">Kamu memanjat <span className="font-extrabold">{floor} lantai</span></p>

          <div className="grid grid-cols-3 gap-2.5 mb-5 w-full max-w-xs">
            <div className="bg-[#8B5CF6] text-white border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#CA8A04]">
              <div className="text-[9px] font-extrabold uppercase opacity-80">Lantai</div>
              <div className="font-extrabold text-lg">{floor}</div>
            </div>
            <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#CA8A04]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">Rentetan</div>
              <div className="font-extrabold text-lg">{best}🔥</div>
            </div>
            <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#CA8A04]">
              <div className="text-[9px] font-extrabold uppercase opacity-70">XP</div>
              <div className="font-extrabold text-lg">{xpResult ? `+${xpResult.xpEarned}` : "…"}</div>
            </div>
          </div>

          {xpResult?.leveledUp && (
            <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 dark:bg-amber-400/25 dark:text-amber-300 text-amber-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Naik Tingkat!
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <button onClick={start} className={`${btnBase} w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 dark:from-amber-500 dark:to-amber-600 text-white dark:shadow-[0_0_16px_rgba(245,197,66,0.25)]`}>
              <RotateCcw className="w-4 h-4" /> Main Lagi
            </button>
            <Link href={backHref} className={`${btnBase} w-full py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700 text-center`}>
              Kembali ke Arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- PLAYING ---------- */
  return (
    <div className="game-env game-env-menara fixed inset-0 z-[60] flex flex-col overflow-hidden bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#16120A] dark:via-[#1A1510] dark:to-[#201A0C] dark:text-[#F5EDD6]">
      <Burst trigger={burst} x={16} y={48} />
      {confettiAktif && <ConfettiBurst trigger={confetti} />}
      <ComboFlash combo={combo} />
      <motion.div animate={controls} className="relative z-10 flex-1 flex flex-col max-w-md w-full mx-auto px-4 pt-4 pb-5 min-h-0">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3">
           <GameBackButton href="/arena/game" label="Kembali ke Arena" title="Kembali ke Arena" />
          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white dark:bg-gradient-to-r dark:from-[#201C14] dark:to-[#262018] dark:border-amber-700/30 dark:shadow-[0_0_10px_rgba(202,138,4,0.15)] border-2 border-[#161B3A] dark:border-white/25">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <Heart key={i} className={`w-4 h-4 ${i < hearts ? "text-rose-500 fill-rose-500" : "text-gray-300 dark:text-amber-800/40"}`} />
            ))}
          </div>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30">
                <Flame className="w-4 h-4 fill-orange-500 text-orange-500" /> <span className="text-orange-700 dark:text-orange-300 font-extrabold text-sm">{combo}x</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8B5CF6] text-white border-2 border-[#161B3A] dark:border-white/25">
            <Mountain className="w-4 h-4" />
            <span className="text-sm font-bold">Lt. {floor}</span>
          </div>
        </div>

        {/* tower + question */}
        <div className="flex-1 flex gap-3 min-h-0">
          <Tower floor={floor} total={total} />

          <div className="flex-1 flex flex-col min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={current?.id ?? idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
                className="flex-1 flex flex-col">
                <div className="rounded-3xl bg-white dark:bg-gradient-to-br dark:from-[#221E18] dark:via-[#1E1A12] dark:to-[#1A1610] border-2 dark:border-amber-600/40 shadow-[5px_5px_0_#CA8A04] dark:shadow-[5px_5px_0_#CA8A04,0_0_20px_rgba(202,138,4,0.15)] p-5 mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider dark:text-[#D4A843]">Soal {idx + 1} / {total}</span>
                  <h2 className="text-lg font-bold mt-2 leading-snug dark:text-[#F5EDD6]">{current?.soal}</h2>
                </div>

                {/* Item bantuan — hanya dirender kalau murid punya Hint Token */}
                {(bolehPakaiHint || dicoret !== undefined) && (
                  <div className="mt-1 mb-1 flex items-center gap-2">
                    {dicoret !== undefined ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/15 border-2 border-[#161B3A] dark:border-white/25 text-[11px] font-extrabold">
                        <Lightbulb className="w-3.5 h-3.5" /> Petunjuk terpakai
                      </span>
                    ) : (
                      <button onClick={pakaiHint} disabled={hintProses}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FBBF24] border-2 border-[#161B3A] dark:border-white/25 shadow-[3px_3px_0_#CA8A04] text-[11px] font-extrabold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60">
                        <Lightbulb className="w-3.5 h-3.5" />
                        {hintProses ? "Memakai…" : `Coret 1 opsi salah (${hintCount})`}
                      </button>
                    )}
                  </div>
                )}

                {powerUpError && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">{powerUpError}</p>
                )}

                <div className="grid gap-2.5 mt-1">
                  {current?.opsi.map((opt, i) => {
                    const isPicked = picked === i;
                    const isCorrect = i === current.jawaban;
                    const reveal = picked !== null;
                    const isDicoret = dicoret === i;
                    let cls = "bg-white dark:bg-[#1C1A14] dark:border-amber-800/30 border-[#161B3A] dark:border-white/25";
                    if (!reveal && isDicoret) cls = "bg-gray-100 dark:bg-[#1A1610]/60 dark:border-amber-800/10 border-[#161B3A] dark:border-white/25/20 opacity-50 line-through";
                    if (reveal && isCorrect) cls = "bg-emerald-100 dark:bg-emerald-500/25 border-emerald-600 dark:border-emerald-400 dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]";
                    else if (reveal && isPicked && !isCorrect) cls = "bg-rose-100 dark:bg-rose-500/25 border-rose-600 dark:border-rose-400 dark:shadow-[0_0_12px_rgba(251,113,133,0.25)]";
                    else if (reveal) cls = "bg-white/50 dark:bg-[#1E1A14]/60 dark:border-amber-800/10 border-[#161B3A] dark:border-white/25/20 opacity-50";
                    return (
                      <button key={i} onClick={() => choose(i)} disabled={reveal || isDicoret}
                        className={`relative w-full text-left px-4 py-3.5 rounded-2xl border-[3px] font-semibold transition-all active:scale-[0.98] shadow-[3px_3px_0_#CA8A04] ${cls}`}>
                        <span className="pr-7">{opt}</span>
                        {reveal && isCorrect && <Check className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />}
                        {reveal && isPicked && !isCorrect && <X className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {picked !== null && picked !== current.jawaban && current?.penjelasan && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border-[3px] border-[#161B3A] dark:border-white/25 shadow-[3px_3px_0_#CA8A04]">
                      <p className="text-xs dark:text-[#D4C8A0] leading-relaxed"><span className="font-extrabold dark:text-[#D4A843]">Penjelasan: </span>{current.penjelasan}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* Live tower that fills up as the player climbs floors, with a climber rising. */
function Tower({ floor, total }: { floor: number; total: number }) {
  const pct = total ? Math.min(100, (floor / total) * 100) : 0;
  const cleared = floor >= total && total > 0;
  return (
    <div className="w-16 shrink-0 flex flex-col items-center">
      <motion.div animate={{ y: cleared ? [0, -4, 0] : 0 }} transition={{ repeat: cleared ? Infinity : 0, duration: 1 }} className="mb-1 text-base">
        {cleared ? "🚩" : "⛰️"}
      </motion.div>

      <div className="relative flex-1 w-full rounded-2xl overflow-hidden border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-gradient-to-b dark:from-[#201C14] dark:to-[#1A1610] dark:border-amber-700/30 dark:shadow-[3px_3px_0_#CA8A04,0_0_12px_rgba(202,138,4,0.2)]">
        <motion.div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 dark:from-amber-600 dark:via-amber-400 dark:to-yellow-300 dark:shadow-[0_0_8px_rgba(245,197,66,0.3)]"
          animate={{ height: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 16 }} />

        <div className="absolute inset-0 flex flex-col-reverse">
          {Array.from({ length: total || 1 }).map((_, i) => (
            <div key={i} className="flex-1 border-t-2 border-[#161B3A] dark:border-white/25/10 dark:border-amber-800/15 flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-[2px] ${i < floor ? "bg-amber-400 dark:bg-amber-300" : "bg-[#161B3A]/10 dark:bg-amber-800/20"}`} />
              <span className={`w-1.5 h-1.5 rounded-[2px] ${i < floor ? "bg-amber-400 dark:bg-amber-300" : "bg-[#161B3A]/10 dark:bg-amber-800/20"}`} />
            </div>
          ))}
        </div>

        <motion.div className="absolute left-1/2 -translate-x-1/2 text-lg z-10"
          animate={{ bottom: `calc(${pct}% - 2px)` }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>
          🧗
        </motion.div>
      </div>

      <span className="mt-1 text-[10px] font-extrabold dark:text-[#D4A843] opacity-60">{floor}/{total}</span>
    </div>
  );
}
