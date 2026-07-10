"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Flame, Trophy, Zap, Star, RotateCcw, Mountain, Check, X, Loader2, Sparkles } from "lucide-react";

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

  const total = questions.length;
  const current = questions[idx];

  const start = useCallback(async () => {
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
  const progressPct = total ? (idx / total) * 100 : 0;
  return (
    <Shell>
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10">
          <Mountain className="w-4 h-4 text-violet-300" />
          <span className="text-sm font-bold text-white">Lt. {floor}</span>
        </div>
      </div>

      {/* progress rail */}
      <div className="px-5 mb-3">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500" animate={{ width: `${progressPct}%` }} transition={{ type: "spring", stiffness: 120 }} />
        </div>
      </div>

      {/* question */}
      <div className="flex-1 flex flex-col px-5 pb-6">
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #2E1065 0%, #1A0B3B 45%, #0B0718 100%)" }}>
      {/* decorative stars */}
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 70% 20%, #fff, transparent), radial-gradient(1px 1px at 40% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 50%, #fff, transparent), radial-gradient(1px 1px at 15% 80%, #fff, transparent)" }} />
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

function Stat({ big, label, tone }: { big: string; label: string; tone: "violet" | "orange" | "amber" }) {
  const tones = { violet: "text-violet-300", orange: "text-orange-300", amber: "text-amber-300" };
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 py-3 px-1 text-center">
      <p className={`text-xl font-extrabold ${tones[tone]}`}>{big}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mt-0.5">{label}</p>
    </div>
  );
}
