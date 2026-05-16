"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, Trophy, Zap, RefreshCw, Crown, Shuffle, Check, X, Timer } from "lucide-react";

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
  { word: "GRAMATIK", meaning: "Ilmu tentang kaidah bahasa" },
  { word: "FONEM", meaning: "Satuan bunyi bahasa yang terkecil yang membedakan kata" },
  { word: "MORFEM", meaning: "Satuan bahasa terkecil yang mempunyai makna" },
  { word: "SILABUS", meaning: "Garis besar materi pelajaran" },
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
  { word: "RESOLUSI", meaning: "Penyelesaian konflik dalam cerita" },
  { word: "KLIMAKS", meaning: "Puncak ketegangan dalam cerita" },
  { word: "DIALOG", meaning: "Percakapan antara dua tokoh atau lebih" },
  { word: "MONOLOG", meaning: "Percakapan seorang diri" },
  { word: "NARATOR", meaning: "Pencerita dalam karya sastra" },
  { word: "SUDUT", meaning: "Pandangan pengarang dalam cerita" },
  { word: "GAYA", meaning: "Cara pengarang mengungkapkan gagasan" },
  { word: "SIMBOL", meaning: "Lambang yang mewakili sesuatu" },
  { word: "IRONI", meaning: "Makna yang berlawanan dengan yang diucapkan" },
  { word: "SATIRE", meaning: "Sindiran terhadap kebiasaan atau keadaan" },
  { word: "PARODI", meaning: "Tiruan lucu dari karya serius" },
  { word: "ALITERASI", meaning: "Pengulangan konsonan pada awal kata" },
  { word: "ASONANSI", meaning: "Pengulangan vokal dalam kata atau frase" },
  { word: "ONOMA", meaning: "Kata yang menirukan bunyi" },
  { word: "PERSONIFIKASI", meaning: "Benda mati diberi sifat seperti manusia" },
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
    setFeedback({ correct: false, message: `Waktu habis! Jawaban: ${currentWord?.word}` });
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
      setFeedback({ correct: true, message: `Benar! +${totalPoints} poin` });
      saveProgress(newXp, newBestStreak);

      setTimeout(() => {
        const newRound = round + 1;
        setRound(newRound);
        if (newRound >= totalRounds) {
          setGameState("result");
        } else {
          nextWord(usedWords);
        }
      }, 1500);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      setFeedback({ correct: false, message: `Salah! Sisa nyawa: ${newLives}` });

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => setGameState("menu")} className="text-white/70 hover:text-white p-2">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Star size={16} className="text-yellow-400" />
              <span className="text-white font-bold text-sm">{score}</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart key={i} size={18} className={i < lives ? "text-red-400 fill-red-400" : "text-white/20"} />
              ))}
            </div>
          </div>
        </div>
        {/* Timer & XP */}
        <div className="max-w-lg mx-auto mt-2 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Timer size={14} className={timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-white/60"} />
            <span className={`text-sm font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white/70"}`}>{timeLeft}s</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span className="flex items-center gap-1"><Crown size={12} className="text-yellow-400" /> Level {levelInfo.level}</span>
              <span>{Math.floor(xp)} / {levelInfo.next} XP</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500" style={{ width: `${levelInfo.progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      {gameState === "menu" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center max-w-sm">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Shuffle size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Susun Kata</h1>
            <p className="text-white/60 mb-6">Susun huruf acak menjadi kata Bahasa Indonesia yang benar</p>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/10">
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Level</span>
                <span className="font-bold text-yellow-400">{levelInfo.level}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/80 mt-2">
                <span>Total XP</span>
                <span className="font-bold">{Math.floor(xp)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/80 mt-2">
                <span>Best Streak</span>
                <span className="font-bold text-orange-400">{bestStreak}</span>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
              <Zap size={20} /> Mulai Bermain
            </button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {gameState === "playing" && currentWord && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={currentWord.word} className="max-w-lg w-full text-center">
            {/* Round */}
            <div className="flex items-center justify-between text-sm text-white/50 mb-6">
              <span>Ronde {round + 1} / {totalRounds}</span>
              {streak > 0 && <span className="text-orange-400 font-bold flex items-center gap-1"><Zap size={14} /> Streak {streak}</span>}
            </div>

            {/* Meaning hint */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 mb-6 inline-block">
              <p className="text-sm text-white/70">Arti: <span className="text-white font-medium">{currentWord.meaning}</span></p>
            </div>

            {/* Selected letters (answer area) */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4 border border-white/10 min-h-[80px]">
              <p className="text-xs text-white/40 mb-3">Jawaban kamu:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap min-h-[50px]">
                {selectedLetters.length === 0 ? (
                  <span className="text-white/20 text-lg">Klik huruf di bawah</span>
                ) : (
                  selectedLetters.map((letter, i) => (
                    <motion.button
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => deselectLetter(i)}
                      className="w-10 h-12 rounded-lg bg-emerald-500 text-white font-bold text-lg shadow-md hover:bg-emerald-600 transition-colors"
                    >
                      {letter}
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* Available letters */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
              {availableLetters.map((letter, i) => (
                <motion.button
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => selectLetter(i)}
                  className="w-10 h-12 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-colors"
                >
                  {letter}
                </motion.button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-4">
              <button onClick={clearSelection} className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 font-semibold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                <X size={16} /> Hapus
              </button>
              <button onClick={reshuffle} className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 font-semibold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                <Shuffle size={16} /> Acak
              </button>
              <button onClick={checkAnswer} disabled={selectedLetters.length === 0} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Check size={16} /> Cek
              </button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className={`p-3 rounded-xl text-sm font-medium ${feedback.correct ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
                  {feedback.message}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Result */}
      {gameState === "result" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Trophy size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Selesai!</h2>
            <p className="text-white/60 mb-6">Skor kamu: <span className="text-yellow-400 font-bold text-2xl">{score}</span></p>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>XP Didapat</span>
                <span className="font-bold text-green-400">+{score}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Best Streak</span>
                <span className="font-bold text-orange-400">{bestStreak}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Level Sekarang</span>
                <span className="font-bold text-yellow-400">{levelInfo.level}</span>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
              <RefreshCw size={20} /> Main Lagi
            </button>
            <button onClick={() => setGameState("menu")} className="w-full mt-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 font-semibold py-3 rounded-xl hover:bg-white/20 transition-all">
              Kembali ke Menu
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
