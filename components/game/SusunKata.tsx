"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, Trophy, Zap, RefreshCw, Crown, Shuffle, Check, X, Timer, Sparkles } from "lucide-react";

const SCRAMBLE_WORDS = [
  { word: "BAHASA", meaning: "Sistem lambang bunyi yang arbitrer" },
  { word: "KATA", meaning: "Unsur bahasa yang diucapkan atau ditulis" },
  { word: "KALIMAT", meaning: "Satuan bahasa yang relatif berdiri sendiri" },
  { word: "HURUF", meaning: "Tanda aksara dalam sistem tulisan" },
  { word: "BACA", meaning: "Melihat serta memahami isi dari apa yang tertulis" },
  { word: "TULIS", meaning: "Membuat huruf (angka dan sebagainya) dengan pena" },
  { word: "BUNYI", meaning: "Sesuatu yang didengar atau ditangkap oleh telinga" },
  { word: "MAKNA", meaning: "Pengertian yang diberikan pada suatu bentuk bahasa" },
  { word: "KARANG", meaning: "Menggubah (mengarang) cerita, buku, dan sebagainya" },
  { word: "PUISI", meaning: "Ragam sastra yang bahasanya terikat oleh irama" },
  { word: "PROSA", meaning: "Karangan bebas yang tidak terikat oleh kaidah yang ada" },
  { word: "NOVEL", meaning: "Karangan prosa yang panjang mengandung rangkaian cerita" },
  { word: "CERPEN", meaning: "Cerita pendek yang habis dibaca dalam sekali duduk" },
  { word: "DONGENG", meaning: "Cerita yang tidak benar-benar terjadi" },
  { word: "LEGENDA", meaning: "Cerita rakyat yang dianggap benar-benar terjadi" },
  { word: "FABEL", meaning: "Cerita yang menggambarkan watak dan perilaku manusia" },
  { word: "MITOS", meaning: "Cerita rakyat yang berhubungan dengan terjadinya tempat" },
  { word: "SASTRA", meaning: "Karya tulis yang memiliki nilai estetika" },
  { word: "FONEM", meaning: "Satuan bunyi bahasa yang terkecil yang membedakan kata" },
  { word: "MORFEM", meaning: "Satuan bahasa terkecil yang mempunyai makna" },
  { word: "KAMUS", meaning: "Buku yang memuat kata dan maknanya" },
  { word: "EJAAN", meaning: "Aturan penulisan kata dalam bahasa" },
  { word: "DIKSI", meaning: "Pilihan kata yang tepat dan selaras" },
  { word: "RIMA", meaning: "Persamaan bunyi dalam puisi" },
  { word: "IRAMA", meaning: "Alunan yang teratur dan berirama" },
  { word: "ALUR", meaning: "Rangkaian peristiwa dalam cerita" },
  { word: "LATAR", meaning: "Tempat, waktu, dan suasana dalam cerita" },
  { word: "TOKOH", meaning: "Pelaku dalam cerita" },
  { word: "AMANAT", meaning: "Pesan yang ingin disampaikan pengarang" },
  { word: "TEMA", meaning: "Gagasan pokok yang mendasari suatu cerita" },
  { word: "PLOT", meaning: "Rangkaian peristiwa dalam karya fiksi" },
  { word: "KONFLIK", meaning: "Pertentangan dalam cerita" },
  { word: "DIALOG", meaning: "Percakapan antara dua tokoh atau lebih" },
  { word: "NARATOR", meaning: "Pencerita dalam karya sastra" },
  { word: "GAYA", meaning: "Cara pengarang mengungkapkan gagasan" },
  { word: "SIMBOL", meaning: "Lambang yang mewakili sesuatu" },
  { word: "IRONI", meaning: "Makna yang berlawanan dengan yang diucapkan" },
  { word: "SATIRE", meaning: "Sindiran terhadap kebiasaan atau keadaan" },
  { word: "PARODI", meaning: "Tiruan lucu dari karya serius" },
  { word: "HIPERBOLA", meaning: "Majas yang melebih-lebihkan" },
];

const LEVEL_THRESHOLDS = [0, 80, 200, 400, 700, 1100, 1600, 2200, 2900, 3700, 4600, 5600, 6700, 7900, 9200, 10600, 12100, 13700, 15400, 17200, 19100, 21100, 23200, 25400, 27700, 30100, 32600, 35200, 37900, 40700, 43600, 46600, 49700, 52900, 56200, 59600, 63100, 66700, 70400, 74200, 78100, 82100, 86200, 90400, 94700, 99100, 103600, 108200, 112900, 117700];

function getLevel(xp: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getLevelProgress(xp: number) {
  const level = getLevel(xp);
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 10000;
  return { level, progress: ((xp - current) / (next - current)) * 100, current, next };
}

function scrambleWord(word: string): string {
  const letters = word.split("");
  let scrambled = [...letters];
  let attempts = 0;
  do {
    for (let i = scrambled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
    }
    attempts++;
  } while (scrambled.join("") === word && attempts < 20);
  return scrambled.join("");
}

export default function SusunKataGame() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "result">("menu");
  const [xp, setXp] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [scrambled, setScrambled] = useState("");
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("susun-kata-progress");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setXp(data.xp || 0);
        setBestStreak(data.bestStreak || 0);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTimerActive(false);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const saveProgress = useCallback((newXp: number, newBestStreak: number) => {
    localStorage.setItem("susun-kata-progress", JSON.stringify({ xp: newXp, bestStreak: newBestStreak }));
  }, []);

  const handleTimeUp = () => {
    const newLives = lives - 1;
    setLives(newLives);
    setStreak(0);
    setFeedback({ correct: false, message: currentWord?.word });
    if (newLives <= 0) {
      setTimeout(() => setGameState("result"), 2000);
    } else {
      setTimeout(() => nextWord(usedWords), 2000);
    }
  };

  const startGame = () => {
    setGameState("playing");
    setLives(3);
    setScore(0);
    setStreak(0);
    setRound(0);
    setUsedWords(new Set());
    nextWord(new Set());
  };

  const nextWord = (used: Set<string>) => {
    const available = SCRAMBLE_WORDS.filter((w) => !used.has(w.word));
    let word: any;
    if (available.length === 0) {
      setUsedWords(new Set());
      word = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
      setUsedWords(new Set([word.word]));
    } else {
      word = available[Math.floor(Math.random() * available.length)];
      setUsedWords(new Set([...used, word.word]));
    }

    const scrambled = scrambleWord(word.word);
    setCurrentWord(word);
    setScrambled(scrambled);
    setAvailableLetters(scrambled.split(""));
    setSelectedLetters([]);
    setFeedback(null);
    setTimeLeft(30);
    setTimerActive(true);
  };

  const selectLetter = (index: number) => {
    const letter = availableLetters[index];
    const newAvailable = [...availableLetters];
    newAvailable.splice(index, 1);
    setAvailableLetters(newAvailable);
    setSelectedLetters([...selectedLetters, letter]);
  };

  const deselectLetter = (index: number) => {
    const letter = selectedLetters[index];
    const newSelected = [...selectedLetters];
    newSelected.splice(index, 1);
    setSelectedLetters(newSelected);
    setAvailableLetters([...availableLetters, letter]);
  };

  const checkAnswer = () => {
    if (!currentWord || selectedLetters.length === 0) return;
    const answer = selectedLetters.join("");
    const isCorrect = answer === currentWord.word;

    setTimerActive(false);

    if (isCorrect) {
      const timeBonus = timeLeft * 5;
      const basePoints = 150;
      const streakBonus = streak * 15;
      const totalPoints = basePoints + timeBonus + streakBonus;
      const newStreak = streak + 1;
      const newBestStreak = Math.max(bestStreak, newStreak);
      const newXp = xp + totalPoints;

      setScore((s) => s + totalPoints);
      setStreak(newStreak);
      setBestStreak(newBestStreak);
      setXp(newXp);
      setFeedback({ correct: true, message: `+${totalPoints}` });
      saveProgress(newXp, newBestStreak);

      setTimeout(() => {
        const newRound = round + 1;
        setRound(newRound);
        if (newRound >= totalRounds) {
          setGameState("result");
        } else {
          nextWord(usedWords);
        }
      }, 1200);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      setFeedback({ correct: false, message: `${newLives} nyawa tersisa` });

      if (newLives <= 0) {
        setTimeout(() => setGameState("result"), 2000);
      } else {
        setTimeout(() => {
          setSelectedLetters([]);
          setAvailableLetters(scrambled.split(""));
          setFeedback(null);
        }, 1000);
      }
    }
  };

  const clearSelection = () => {
    setSelectedLetters([]);
    setAvailableLetters(scrambled.split(""));
  };

  const reshuffle = () => {
    setAvailableLetters((prev) => {
      const all = [...prev, ...selectedLetters];
      setSelectedLetters([]);
      const shuffled = [...all];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const levelInfo = getLevelProgress(xp);

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* iOS-style Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => setGameState("menu")} className="text-blue-500 font-medium text-sm flex items-center gap-0.5">
            <ArrowLeft size={20} /> Menu
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="text-amber-700 font-bold text-sm">{score}</span>
            </div>
            <div className="flex items-center gap-0.5">
              {[...Array(3)].map((_, i) => (
                <Heart key={i} size={18} className={i < lives ? "text-red-500 fill-red-500" : "text-gray-300"} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      {gameState === "menu" && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center max-w-sm w-full">
            <motion.div animate={{ rotate: [0, 10, -10, 10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
              <Shuffle size={52} className="text-white" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Susun Kata</h1>
            <p className="text-gray-500 mb-8 text-base">Susun huruf acak menjadi kata yang benar</p>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl p-5 mb-8 shadow-sm border border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Crown size={16} className="text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{levelInfo.level}</p>
                  <p className="text-xs text-gray-400">Level</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap size={16} className="text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{Math.floor(xp)}</p>
                  <p className="text-xs text-gray-400">XP</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Sparkles size={16} className="text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{bestStreak}</p>
                  <p className="text-xs text-gray-400">Streak</p>
                </div>
              </div>
              {/* XP Progress */}
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 0.8 }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center">{Math.floor(xp)} / {levelInfo.next} XP</p>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <Zap size={20} /> Mulai Bermain
            </button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {gameState === "playing" && currentWord && (
        <div className="flex-1 flex flex-col px-6 py-6 max-w-lg mx-auto w-full">
          {/* Round, Timer & Streak */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-400">{round + 1} / {totalRounds}</span>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full">
                  <Zap size={14} className="text-orange-500 fill-orange-500" />
                  <span className="text-orange-700 font-bold text-sm">{streak}</span>
                </motion.div>
              )}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${timeLeft <= 10 ? "bg-red-50" : "bg-gray-100"}`}>
                <Timer size={14} className={timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-500"} />
                <span className={`font-bold text-sm ${timeLeft <= 10 ? "text-red-600" : "text-gray-700"}`}>{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Meaning Hint */}
          <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Arti Kata</p>
            <p className="text-sm text-gray-700 leading-relaxed">{currentWord.meaning}</p>
          </div>

          {/* Answer Area */}
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100 min-h-[80px]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Jawaban</p>
            <div className="flex items-center justify-center gap-2 flex-wrap min-h-[50px]">
              {selectedLetters.length === 0 ? (
                <span className="text-gray-300 text-sm">Klik huruf di bawah</span>
              ) : (
                selectedLetters.map((letter, i) => (
                  <motion.button
                    key={i}
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    onClick={() => deselectLetter(i)}
                    className="w-10 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-md active:scale-95 transition-transform"
                  >
                    {letter}
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* Letter Tiles */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
            {availableLetters.map((letter, i) => (
              <motion.button
                key={i}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => selectLetter(i)}
                className="w-11 h-13 rounded-xl bg-white border-2 border-gray-200 text-gray-800 font-bold text-lg shadow-sm active:scale-95 transition-transform hover:border-emerald-300"
              >
                {letter}
              </motion.button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={clearSelection} className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm">
              <X size={18} /> Hapus
            </button>
            <button onClick={reshuffle} className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm">
              <Shuffle size={18} /> Acak
            </button>
            <button onClick={checkAnswer} disabled={selectedLetters.length === 0} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Check size={18} /> Cek
            </button>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className={`p-4 rounded-2xl text-center ${feedback.correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <p className={`text-lg font-bold ${feedback.correct ? "text-green-700" : "text-red-700"}`}>{feedback.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Result */}
      {gameState === "result" && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm w-full">
            <motion.div animate={{ rotate: [0, 10, -10, 10, 0] }} transition={{ duration: 1 }} className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
              <Trophy size={52} className="text-white" />
            </motion.div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Selesai!</h2>
            <p className="text-gray-500 mb-6">Skor kamu</p>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 mb-8">{score}</p>

            <div className="bg-white rounded-2xl p-5 mb-8 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">XP Didapat</span>
                <span className="font-bold text-green-600">+{score}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Best Streak</span>
                <span className="font-bold text-orange-600">{bestStreak}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Level</span>
                <span className="font-bold text-emerald-600">{levelInfo.level}</span>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <RefreshCw size={20} /> Main Lagi
            </button>
            <button onClick={() => setGameState("menu")} className="w-full mt-3 bg-white border border-gray-200 text-gray-700 font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform shadow-sm">
              Kembali ke Menu
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
