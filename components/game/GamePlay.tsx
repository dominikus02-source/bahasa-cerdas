"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { gameSocket } from "@/lib/game/socket";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame, Trophy, Clock, Star, Crown, Swords, Heart } from "lucide-react";

interface GamePlayProps {
  roomCode: string;
  onFinish: () => void;
}

interface PlayerScore {
  playerId: string;
  playerName?: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  hearts?: number;
  eliminated?: boolean;
}

interface Question {
  index: number;
  total: number;
  gameMode: string;
  id: string;
  text: string;
  audioUrl?: string;
  imageUrl?: string;
  passage?: string;
  type: string;
  options: string[];
  correctAnswer?: string;
  difficulty?: string;
  timePerQuestion: number;
}

const MODE_STYLES: Record<string, { name: string; icon: any; gradient: string; accent: string }> = {
  KUIS_BATTLE: { name: "Adu Cerdas", icon: Zap, gradient: "from-violet-600 to-purple-700", accent: "violet" },
  GOLD_RUSH: { name: "Rebut Emas", icon: Trophy, gradient: "from-amber-500 to-orange-600", accent: "amber" },
  SPEED_BATTLE: { name: "Cepat Tepat", icon: Swords, gradient: "from-red-500 to-rose-600", accent: "red" },
  SURVIVAL: { name: "Tak Terkalahkan", icon: Heart, gradient: "from-pink-500 to-rose-600", accent: "pink" },
  TIMED_TRIAL: { name: "Lawan Waktu", icon: Clock, gradient: "from-cyan-500 to-blue-600", accent: "cyan" },
};

export default function GamePlay({ roomCode, onFinish }: GamePlayProps) {
  const [phase, setPhase] = useState<"countdown" | "question" | "result">("countdown");
  const [count, setCount] = useState(3);
  const [question, setQuestion] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [totalQ, setTotalQ] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [myId, setMyId] = useState<string>("");
  const [showScorePop, setShowScorePop] = useState<{ value: number; x: number; y: number } | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [gameMode, setGameMode] = useState("KUIS_BATTLE");
  const [hearts, setHearts] = useState(3);
  const [eliminated, setEliminated] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const userId = useRef("");

  useEffect(() => {
    const stored = localStorage.getItem("bc-user");
    if (stored) {
      try { userId.current = JSON.parse(stored).state?.supabaseId || ""; } catch {}
    }
  }, []);

  useEffect(() => {
    gameSocket.connect();

    const unsub1 = gameSocket.onShowQuestion((data: any) => {
      setQuestion(data);
      setQIndex(data.index || 0);
      setTotalQ(data.total || 10);
      setSelected(null);
      setIsCorrect(null);
      setTimeLeft(data.timePerQuestion || 20);
      setGameMode(data.gameMode || "KUIS_BATTLE");
      setPhase("question");
      startTimer(data.timePerQuestion || 20);
    });

    const unsub2 = gameSocket.onScoreUpdate((data: { playerId: string; playerName?: string; score: number; correct: number; wrong: number; streak: number; hearts?: number; eliminated?: boolean }) => {
      setLeaderboard((prev) => {
        const existing = prev.find((p) => p.playerId === data.playerId);
        if (existing) {
          return prev.map((p) =>
            p.playerId === data.playerId ? { ...p, ...data } : p
          );
        }
        return [...prev, { playerId: data.playerId, playerName: "", score: data.score, correct: data.correct, wrong: data.wrong, streak: data.streak }];
      });
      if (data.playerId === userId.current) {
        setScore(data.score);
        setStreak(data.streak);
        setCorrect(data.correct);
        setWrong(data.wrong);
        if (data.hearts !== undefined) { setHearts(data.hearts); setEliminated(!!data.eliminated); }
      }
    });

    const unsub3 = gameSocket.onAnswerResult((data: { playerId: string; isCorrect: boolean }) => {
      if (data.playerId === userId.current) {
        setIsCorrect(data.isCorrect);
        if (data.isCorrect) {
          const popValue = 100 + streak * 10;
          setShowScorePop({ value: popValue, x: Math.random() * 200 + 100, y: 150 });
          setTimeout(() => setShowScorePop(null), 1000);
        }
      }
    });

    const unsub4 = gameSocket.onGameFinished((data: { results: any[] }) => {
      setResults(data.results || []);
      setPhase("result");
    });

    const unsub5 = gameSocket.onPlayerList((data: any[]) => {
      setLeaderboard(data.map((p) => ({
        playerId: p.id,
        playerName: p.playerName,
        avatarUrl: p.avatarUrl,
        score: p.score || 0,
        correct: p.correct || 0,
        wrong: p.wrong || 0,
        streak: p.streak || 0,
      })));
    });

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = useCallback(() => {
    if (selected || eliminated) return;
    setIsCorrect(false);
    setWrong((w) => w + 1);
    setStreak(0);
    gameSocket.emit("submit-answer", {
      roomCode,
      questionIndex: qIndex,
      answer: -1,
      timeRemaining: 0,
    });
  }, [selected, qIndex, roomCode]);

  const handleAnswer = (index: number) => {
    if (selected !== null || eliminated) return;
    setSelected(String(index));
    if (timerRef.current) clearInterval(timerRef.current);

    gameSocket.emit("submit-answer", {
      roomCode,
      questionIndex: qIndex,
      answer: index,
      timeRemaining: timeLeft,
    });
  };

  const modeStyle = MODE_STYLES[gameMode] || MODE_STYLES.KUIS_BATTLE;
  const ModeIcon = modeStyle.icon;

  if (phase === "countdown") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${modeStyle.gradient} flex items-center justify-center overflow-hidden`}>
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {count > 0 ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-8xl mb-6"
              >
                <ModeIcon size={80} className="text-white mx-auto" />
              </motion.div>
              <p className="text-white/60 text-lg mb-4">{modeStyle.name}</p>
              <p className="text-white text-9xl font-black">{count}</p>
            </>
          ) : (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                <p className="text-white text-9xl font-black">MULAI!</p>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (phase === "result") {
    const sorted = [...results].sort((a, b) => a.rank - b.rank);
    const top3 = sorted.slice(0, 3);
    const myResult = sorted.find((r) => r.playerId === userId.current);

    return (
      <div className={`min-h-screen bg-gradient-to-br ${modeStyle.gradient} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center mb-8">
            <Trophy size={64} className="text-yellow-400 mx-auto mb-2" />
            <h2 className="text-3xl font-black text-white">Game Selesai!</h2>
            <p className="text-white/60">{modeStyle.name} • {totalQ} soal</p>
          </motion.div>

          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-4 mb-8">
              {top3[1] && (
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-2xl mx-auto mb-1 shadow-lg border-2 border-gray-200">
                    🥈
                  </div>
                  <p className="text-white text-sm font-bold">{top3[1].playerName}</p>
                  <p className="text-white/60 text-xs">{top3[1].score} poin</p>
                </motion.div>
              )}
              {top3[0] && (
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.1 }} className="text-center -mt-8">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl mx-auto mb-1 shadow-xl border-2 border-yellow-300">
                    🥇
                  </motion.div>
                  <p className="text-white text-lg font-bold">{top3[0].playerName}</p>
                  <p className="text-yellow-300 text-sm font-bold">{top3[0].score} poin</p>
                </motion.div>
              )}
              {top3[2] && (
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.2 }} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-2xl mx-auto mb-1 shadow-lg border-2 border-amber-500">
                    🥉
                  </div>
                  <p className="text-white text-sm font-bold">{top3[2].playerName}</p>
                  <p className="text-white/60 text-xs">{top3[2].score} poin</p>
                </motion.div>
              )}
            </div>
          )}

          {myResult && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center text-white">
                <div>
                  <p className="text-2xl font-bold">{myResult.score}</p>
                  <p className="text-xs text-white/60">Skor</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{myResult.correct}</p>
                  <p className="text-xs text-white/60">Benar</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{myResult.wrong}</p>
                  <p className="text-xs text-white/60">Salah</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <p className="text-white/60 text-sm">XP Didapatkan</p>
                <p className="text-3xl font-bold text-yellow-400">+{myResult.xpEarned || Math.floor(myResult.score / 10)}</p>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3">
            <button onClick={onFinish} className="flex-1 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-2xl py-3 font-semibold hover:bg-white/20 transition-all">
              Kembali ke Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${modeStyle.gradient} flex flex-col`}>
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-black/10">
        <div className="flex items-center gap-2">
          <ModeIcon size={16} className="text-white/80" />
          <span className="text-white/80 text-sm font-medium">{modeStyle.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {gameMode === "SURVIVAL" && (
            <div className="flex items-center gap-0.5 mr-2">
              {[1, 2, 3].map((h) => (
                <Heart key={h} size={16} className={h <= hearts ? "text-red-400 fill-red-400" : "text-white/20"} />
              ))}
            </div>
          )}
          <span className="flex items-center gap-1 text-white/80 text-xs">
            <Flame size={14} className="text-orange-300" />
            <span className={streak >= 3 ? "text-orange-300 font-bold" : ""}>{streak}</span>
          </span>
          <span className="text-white font-bold">{score}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-black/10">
        <motion.div
          className="h-full bg-white"
          initial={{ width: "0%" }}
          animate={{ width: `${((qIndex + 1) / totalQ) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Timer */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-white/60 text-xs">Soal {qIndex + 1}/{totalQ}</span>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className={timeLeft <= 5 ? "text-red-400" : timeLeft <= 10 ? "text-yellow-400" : "text-white/60"} />
          <span className={`text-sm font-mono font-bold ${
            timeLeft <= 5 ? "text-red-400" : timeLeft <= 10 ? "text-yellow-400" : "text-white/80"
          }`}>{timeLeft}s</span>
        </div>
      </div>
      <div className="px-4 pb-2">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-green-400"
            }`}
            animate={{ width: `${(timeLeft / 20) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Score popup */}
      <AnimatePresence>
        {showScorePop && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -80, scale: 1.5 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 text-3xl font-black text-yellow-400 pointer-events-none z-50"
            style={{ left: showScorePop.x, top: showScorePop.y }}
          >
            +{showScorePop.value}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question */}
      <div className="flex-1 flex flex-col px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {/* Question card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 mb-4 mt-2">
              <p className="text-white text-lg font-semibold leading-relaxed">{question?.text}</p>
              {question?.difficulty && (
                <span className="inline-block mt-3 text-[10px] px-2 py-0.5 bg-white/10 text-white/60 rounded-full">
                  {question.difficulty === "EASY" ? "Mudah" : question.difficulty === "HARD" ? "Sulit" : "Sedang"}
                </span>
              )}
            </div>

            {/* Options */}
            {eliminated ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Heart size={48} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-lg font-semibold">Kamu sudah tersingkir!</p>
                  <p className="text-white/30 text-sm mt-1">Tetap saksikan sisa pertandingan</p>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 gap-3 flex-1">
              {question?.options.map((opt, i) => {
                const labels = ["A", "B", "C", "D"];
                let btnClass = "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 active:scale-[0.98] text-white";
                
                if (selected !== null) {
                  if (String(i) === question.correctAnswer) {
                    btnClass = "bg-green-500/80 border-green-400 text-white scale-[1.02] shadow-lg shadow-green-500/30";
                  } else if (String(i) === selected && !isCorrect) {
                    btnClass = "bg-red-500/80 border-red-400 text-white";
                  } else {
                    btnClass = "bg-white/5 border-white/10 text-white/40";
                  }
                }

                return (
                  <motion.button
                    key={i}
                    whileTap={selected === null ? { scale: 0.97 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className={`rounded-2xl p-4 flex items-center gap-4 border-2 transition-all duration-300 ${btnClass}`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selected !== null && String(i) === question?.correctAnswer
                        ? "bg-green-600 text-white"
                        : selected !== null && String(i) === selected
                        ? "bg-red-600 text-white"
                        : "bg-white/10 text-white/80"
                    }`}>
                      {selected !== null && String(i) === question?.correctAnswer ? "✓" : 
                       selected !== null && String(i) === selected && !isCorrect ? "✗" : labels[i]}
                    </span>
                    <span className="flex-1 text-left font-medium">{opt}</span>
                  </motion.button>
                );
              })}
            </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Live leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-4 bg-black/10 rounded-2xl p-3 border border-white/5">
            <p className="text-white/50 text-[10px] font-semibold uppercase mb-2">Peringkat Langsung</p>
            <div className="flex items-center justify-around">
              {[...leaderboard].sort((a, b) => b.score - a.score).slice(0, 5).map((p, i) => (
                <div key={p.playerId} className={`text-center ${p.playerId === userId.current ? "scale-110" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-gray-300 text-gray-700" :
                    i === 2 ? "bg-amber-600 text-amber-100" :
                    "bg-white/10 text-white"
                  }`}>
                    {p.playerName?.slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                  <p className="text-white/80 text-[10px] font-bold mt-0.5">{p.score}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
