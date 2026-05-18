"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Zap, Clock, Star, Flame, Trophy, ArrowLeft, RefreshCw, Home, Sparkles } from "lucide-react";

interface Question {
  text: string;
  options: string[];
  correct: number;
  type: string;
}

export default function WordDashPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"start" | "playing" | "result">("start");
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
  const [ready, setReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(async () => {
    const res = await fetch("/api/katastra/questions?count=20");
    const data = await res.json();
    setQuestions(data.questions || []);
    setPhase("playing");
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
  }, []);

  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            endGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const endGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("result");
    setSubmitting(true);
    try {
      const res = await fetch("/api/katastra/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, correct, wrong, maxStreak, mode: "dash" }),
      });
      const data = await res.json();
      setResult(data);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null || feedback !== null) return;
    const q = questions[currentQ];
    const isCorrect = idx === q.correct;
    setSelected(idx);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft / 6);
      const streakBonus = Math.min(streak, 10) * 10;
      const points = 100 + timeBonus + streakBonus;
      setScore((s) => s + points);
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const newStreak = s + 1;
        setMaxStreak((m) => Math.max(m, newStreak));
        return newStreak;
      });
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
    }

    feedbackTimer.current = setTimeout(() => {
      setSelected(null);
      setFeedback(null);
      if (currentQ < questions.length - 1) {
        setCurrentQ((q) => q + 1);
      } else {
        endGame();
      }
    }, 800);
  };

  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;
  const q = questions[currentQ];

  if (phase === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Zap size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Word Dash</h1>
          <p className="text-sm text-violet-200/70 mb-6">
            Jawab 20 soal secepat mungkin dalam 60 detik!<br />
            Makin cepat + streak makin tinggi = makin banyak XP!
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left text-sm space-y-2">
            <div className="flex items-center gap-2 text-violet-200">
              <Clock size={14} className="text-violet-400" /> 60 detik — kejar waktu!
            </div>
            <div className="flex items-center gap-2 text-violet-200">
              <Star size={14} className="text-yellow-400" /> Bonus waktu + streak
            </div>
            <div className="flex items-center gap-2 text-violet-200">
              <Flame size={14} className="text-orange-400" /> Jawab benar berturut-turut = streak!
            </div>
          </div>
          <button onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:scale-105 transition-all active:scale-95 shadow-lg">
            <Zap size={20} className="inline mr-2" /> Mulai!
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
            <Trophy size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold mb-1">Pertandingan Selesai!</h1>
          <p className="text-sm text-violet-200/60 mb-6">Bagus! Terus tingkatkan!</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400">{correct}</p>
                <p className="text-[10px] text-violet-200/50">Benar</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{wrong}</p>
                <p className="text-[10px] text-violet-200/50">Salah</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{maxStreak}</p>
                <p className="text-[10px] text-violet-200/50">Streak</p>
              </div>
            </div>
            <div className="text-center mb-3">
              <p className="text-xs text-violet-200/50">Skor Akhir</p>
              <p className="text-3xl font-extrabold text-white">{score.toLocaleString()}</p>
            </div>
          </div>

          {result && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Sparkles size={18} className="text-green-400" />
                <span className="font-bold text-green-400">+{result.xpEarned} XP</span>
              </div>
              {result.levelUp && (
                <div className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-bold animate-pulse inline-block">
                  🎉 Level Up! Level {result.newLevel}!
                </div>
              )}
              <div className="flex justify-center gap-4 mt-2 text-xs text-violet-200/60">
                <span>Streak: {result.streak}🔥</span>
                <span>{result.league}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={startGame}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <RefreshCw size={16} /> Main Lagi
            </button>
            <button onClick={() => router.push("/murid/katastra")}
              className="flex-1 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              <Home size={16} /> Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => router.push("/murid/katastra")} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className={streak > 0 ? "text-orange-400" : "text-white/30"} />
              <span className="font-bold text-sm">{streak}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={16} className="text-yellow-400" />
              <span className="font-bold text-sm">{score.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft > 30 ? "bg-gradient-to-r from-violet-500 to-purple-500"
                : timeLeft > 15 ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                : "bg-gradient-to-r from-red-500 to-pink-500"
            }`}
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-violet-200/50 mt-1">
          <span>{currentQ + 1}/{questions.length}</span>
          <div className="flex items-center gap-1">
            <Clock size={10} /> {timeLeft}s
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 pt-4 flex flex-col">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold mb-2 block">
            {q.type === "sinonim" ? "Sinonim" : q.type === "antonim" ? "Antonim" : q.type === "kata_baku" ? "Kata Baku"
              : q.type === "imbuhan" ? "Imbuhan" : q.type === "kalimat" ? "Melengkapi Kalimat"
              : q.type === "ejaan" ? "Ejaan" : q.type === "peribahasa" ? "Peribahasa"
              : q.type === "majas" ? "Majas" : q.type === "sastra" ? "Sastra"
              : q.type === "HOTS" ? "HOTS" : q.type === "kalimat_efektif" ? "Kalimat Efektif"
              : q.type === "tata_bahasa" ? "Tata Bahasa" : q.type === "kosakata" ? "Kosakata"
              : "Soal"}
          </span>
          <p className="text-lg font-bold leading-relaxed">{q.text}</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5 flex-1">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrectOpt = i === q.correct;
            let btnClass = "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-400/50";

            if (feedback) {
              if (isCorrectOpt) btnClass = "bg-green-500/20 border-green-500 text-green-300";
              else if (isSelected) btnClass = "bg-red-500/20 border-red-500 text-red-300";
              else btnClass = "bg-white/5 border-white/10 opacity-40";
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={feedback !== null}
                className={`w-full text-left p-4 rounded-xl border transition-all ${btnClass}`}
              >
                <span className="text-sm font-medium">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
