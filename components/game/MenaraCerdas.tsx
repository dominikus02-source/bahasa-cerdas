"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Heart, Flame, Trophy, RotateCcw, Mountain, Check, X, Loader2, Sparkles, Zap, Volume2, VolumeX } from "lucide-react";
import Burst from "@/components/game/Burst";
import { sfx, haptic, isSoundOn, toggleSound } from "@/lib/game/sound";

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
  const [floor, setFloor] = useState(0); // correct answers = floors climbed
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [xpResult, setXpResult] = useState<{ xpEarned: number; leveledUp: boolean } | null>(null);
  const [burst, setBurst] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const controls = useAnimationControls();

  const total = questions.length;
  const current = questions[idx];

  const start = useCallback(async () => {
    sfx.start(); setSoundOn(isSoundOn());
    setPhase("loading");
    setIdx(0); setFloor(0); setHearts(MAX_HEARTS); setCombo(0); setBest(0); setPicked(null); setXpResult(null);
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
  }, []);

  const finish = useCallback(async (finalFloor: number) => {
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
    } catch {
      /* keep local result */
    }
  }, [total]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === current.jawaban;

    if (correct) {
      sfx.climb(combo + 1); haptic(25); setBurst((b) => b + 1);
      controls.start({ y: [0, -6, 0], transition: { duration: 0.3 } });
    } else {
      sfx.wrong(); haptic([60, 40, 60]);
      controls.start({ x: [0, -10, 10, -7, 7, 0], transition: { duration: 0.4 } });
    }

    setTimeout(() => {
      if (correct) {
        const nf = floor + 1;
        setFloor(nf);
        setCombo((c) => { const nc = c + 1; setBest((b) => Math.max(b, nc)); return nc; });
        if (idx + 1 >= total) {
          finish(nf);
        } else {
          setIdx(idx + 1); setPicked(null);
        }
      } else {
        setCombo(0);
        const nh = hearts - 1;
        setHearts(nh);
        if (nh <= 0) {
          finish(floor);
        } else if (idx + 1 >= total) {
          finish(floor);
        } else {
          setIdx(idx + 1); setPicked(null);
        }
      }
    }, correct ? 650 : 1400);
  };

  // ---------- START ----------
  if (phase === "start" || phase === "loading") {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}
            className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-purple-500/40 mb-6">
            <Mountain className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Menara Cerdas</h1>
          <p className="text-sm text-white/60 max-w-xs mb-1">Panjat menara dengan menjawab soal dari pelajaranmu!</p>
          <p className="text-xs text-white/40 max-w-xs mb-8">Setiap jawaban benar = naik 1 lantai. Salah = kehilangan ❤️. Bertahanlah setinggi mungkin!</p>

          <div className="flex items-center gap-3 mb-8">
            <Badge icon={<Heart className="w-4 h-4 text-rose-400" />} label="3 Nyawa" />
            <Badge icon={<Flame className="w-4 h-4 text-orange-400" />} label="Combo Bonus" />
            <Badge icon={<Zap className="w-4 h-4 text-amber-400" />} label="+XP" />
          </div>

          <button onClick={start} disabled={phase === "loading"}
            className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-bold text-lg shadow-xl shadow-purple-600/40 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
            {phase === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan…</> : <><Mountain className="w-5 h-5" /> Mulai Memanjat</>}
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- GAME OVER ----------
  if (phase === "gameover") {
    const cleared = floor >= total && total > 0;
    return (
      <Shell>
        <Burst trigger={burst} x={50} y={38} count={28} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }}
            className={`w-24 h-24 rounded-[28px] flex items-center justify-center shadow-2xl mb-5 ${cleared ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/40" : "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/40"}`}>
            {cleared ? <Trophy className="w-12 h-12 text-white" /> : <Mountain className="w-12 h-12 text-white" />}
          </motion.div>
          <h1 className="text-2xl font-extrabold text-white mb-1">{cleared ? "Puncak Ditaklukkan! 🎉" : "Permainan Selesai"}</h1>
          <p className="text-sm text-white/60 mb-6">Kamu memanjat <span className="text-white font-bold">{floor} lantai</span></p>

          <div className="w-full max-w-xs grid grid-cols-3 gap-2 mb-6">
            <Stat big={`${floor}`} label="Lantai" tone="violet" />
            <Stat big={`${best}🔥`} label="Combo" tone="orange" />
            <Stat big={xpResult ? `+${xpResult.xpEarned}` : "…"} label="XP" tone="amber" />
          </div>

          {xpResult?.leveledUp && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Naik Level!
            </motion.div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <button onClick={start} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
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
  return (
    <Shell controls={controls}>
      <Burst trigger={burst} x={16} y={48} />
      {/* HUD */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <Heart key={i} className={`w-6 h-6 transition-all ${i < hearts ? "text-rose-500 fill-rose-500" : "text-white/15"}`} />
          ))}
        </div>
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm font-extrabold">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400" /> {combo}x
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10">
            <Mountain className="w-4 h-4 text-violet-300" />
            <span className="text-sm font-bold text-white">Lt. {floor}</span>
          </div>
          <MuteButton on={soundOn} onToggle={() => setSoundOn(toggleSound())} />
        </div>
      </div>

      {/* tower + question */}
      <div className="flex-1 flex gap-3 px-4 pb-5 min-h-0">
        <Tower floor={floor} total={total} />

        <div className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={current?.id ?? idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
              className="flex-1 flex flex-col">
              <div className="rounded-3xl bg-white/[0.07] border border-white/10 p-5 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300/80">Soal {idx + 1} / {total}</span>
                <h2 className="text-lg font-bold text-white mt-2 leading-snug">{current?.soal}</h2>
              </div>

              <div className="grid gap-2.5 mt-1">
                {current?.opsi.map((opt, i) => {
                  const isPicked = picked === i;
                  const isCorrect = i === current.jawaban;
                  const reveal = picked !== null;
                  let cls = "bg-white/[0.06] border-white/10 text-white hover:bg-white/[0.1]";
                  if (reveal && isCorrect) cls = "bg-emerald-500/20 border-emerald-400 text-emerald-100";
                  else if (reveal && isPicked && !isCorrect) cls = "bg-rose-500/20 border-rose-400 text-rose-100";
                  else if (reveal) cls = "bg-white/[0.04] border-white/10 text-white/40";
                  return (
                    <button key={i} onClick={() => choose(i)} disabled={reveal}
                      className={`relative w-full text-left px-4 py-3.5 rounded-2xl border font-medium transition-all active:scale-[0.98] ${cls}`}>
                      <span className="pr-7">{opt}</span>
                      {reveal && isCorrect && <Check className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-300" />}
                      {reveal && isPicked && !isCorrect && <X className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-300" />}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {picked !== null && picked !== current.jawaban && current?.penjelasan && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/20">
                    <p className="text-xs text-amber-200/90 leading-relaxed"><span className="font-bold">💡 </span>{current.penjelasan}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Shell>
  );
}

// Live tower that fills up as the player climbs floors, with a climber rising.
function Tower({ floor, total }: { floor: number; total: number }) {
  const pct = total ? Math.min(100, (floor / total) * 100) : 0;
  const cleared = floor >= total && total > 0;
  return (
    <div className="w-16 shrink-0 flex flex-col items-center">
      {/* summit flag */}
      <motion.div animate={{ y: cleared ? [0, -4, 0] : 0 }} transition={{ repeat: cleared ? Infinity : 0, duration: 1 }} className="mb-1 text-base">
        {cleared ? "🚩" : "⛰️"}
      </motion.div>

      <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
        {/* rising fill = climbed floors */}
        <motion.div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-700 via-violet-500 to-fuchsia-500"
          animate={{ height: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 16 }} />

        {/* floor dividers + windows for a tower look */}
        <div className="absolute inset-0 flex flex-col-reverse">
          {Array.from({ length: total || 1 }).map((_, i) => (
            <div key={i} className="flex-1 border-t border-white/10 flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-[2px] ${i < floor ? "bg-amber-200/90" : "bg-white/10"}`} />
              <span className={`w-1.5 h-1.5 rounded-[2px] ${i < floor ? "bg-amber-200/90" : "bg-white/10"}`} />
            </div>
          ))}
        </div>

        {/* climber rising with the fill */}
        <motion.div className="absolute left-1/2 -translate-x-1/2 text-lg drop-shadow-lg z-10"
          animate={{ bottom: `calc(${pct}% - 2px)` }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>
          🧗
        </motion.div>
      </div>

      <span className="mt-1 text-[10px] font-bold text-white/50">{floor}/{total}</span>
    </div>
  );
}

function Shell({ children, controls }: { children: React.ReactNode; controls?: ReturnType<typeof useAnimationControls> }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #2E1065 0%, #1A0B3B 45%, #0B0718 100%)" }}>
      {/* decorative stars */}
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 70% 20%, #fff, transparent), radial-gradient(1px 1px at 40% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 50%, #fff, transparent), radial-gradient(1px 1px at 15% 80%, #fff, transparent)" }} />
      <motion.div animate={controls} className="relative z-10 flex-1 flex flex-col max-w-md w-full mx-auto">{children}</motion.div>
    </div>
  );
}

function MuteButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-label={on ? "Matikan suara" : "Nyalakan suara"}
      className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 active:scale-90 transition-all">
      {on ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10">
      {icon}<span className="text-xs font-semibold text-white/80">{label}</span>
    </div>
  );
}

function Stat({ big, label, tone }: { big: string; label: string; tone: "violet" | "orange" | "amber" }) {
  const tones = { violet: "text-violet-300", orange: "text-orange-300", amber: "text-amber-300" };
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 py-3 px-1 text-center">
      <p className={`text-xl font-extrabold ${tones[tone]}`}>{big}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mt-0.5">{label}</p>
    </div>
  );
}
