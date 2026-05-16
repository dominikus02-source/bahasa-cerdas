"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, Trophy, Zap, Lightbulb, Volume2, Check, X, RefreshCw, Crown } from "lucide-react";

const WORDS_DB = [
  { word: "BUDAYA", clues: ["Kebiasaan turun-temurun", "Warisan leluhur", "Identitas bangsa"], category: "Sosial" },
  { word: "SASTRA", clues: ["Karya tulis bernilai seni", "Novel dan puisi masuk di sini", "Cerminan kehidupan lewat kata"], category: "Seni" },
  { word: "EJAAN", clues: ["Aturan menulis yang benar", "KBBI jadi acuannya", "Tanda baca dan huruf kapital"], category: "Bahasa" },
  { word: "KALIMAT", clues: ["Kumpulan kata bermakna", "Ada subjek dan predikat", "Satuan bahasa terkecil yang utuh"], category: "Bahasa" },
  { word: "PARAGRAF", clues: ["Kumpulan kalimat terkait", "Diawali masuk ke dalam", "Ada ide pokok di dalamnya"], category: "Bahasa" },
  { word: "SINONIM", clues: ["Persamaan kata", "Lawan dari antonim", "Besar = besar sekali"], category: "Bahasa" },
  { word: "ANTONIM", clues: ["Lawan kata", "Besar lawan kecil", "Panas lawan dingin"], category: "Bahasa" },
  { word: "AFIKSASI", clues: ["Proses menambah imbuhan", "Prefiks, sufiks, konfiks", "Me-kan, di-i, ber-an"], category: "Bahasa" },
  { word: "KONJUNGSI", clues: ["Kata penghubung", "Dan, tetapi, karena", "Menyambung dua klausa"], category: "Bahasa" },
  { word: "PREPOSISI", clues: ["Kata depan", "Di, ke, dari, pada", "Menunjukkan tempat atau arah"], category: "Bahasa" },
  { word: "NARASI", clues: ["Karangan berupa cerita", "Alur dan tokoh di dalamnya", "Bisa fiksi atau nonfiksi"], category: "Sastra" },
  { word: "DESKRIPSI", clues: ["Karangan yang menggambarkan", "Melibatkan panca indera", "Pembaca seolah melihat langsung"], category: "Bahasa" },
  { word: "ARGUMENTASI", clues: ["Karangan berisi pendapat", "Ada data dan fakta pendukung", "Tujuannya meyakinkan pembaca"], category: "Bahasa" },
  { word: "PERSUASI", clues: ["Mengajak atau membujuk", "Iklan menggunakan ini", "Tujuannya mempengaruhi orang"], category: "Bahasa" },
  { word: "EKSEMPLIFIKASI", clues: ["Memberikan contoh", "Ilustrasi konkret", "Memperjelas dengan perumpamaan"], category: "Bahasa" },
  { word: "ANALOGI", clues: ["Perbandingan dua hal", "Seperti, bagaikan, laksana", "Mencari kesamaan pola"], category: "Bahasa" },
  { word: "METAFORA", clues: ["Kiasan langsung tanpa pembanding", "Dia bintang kelas", "Raja siang terbit di timur"], category: "Sastra" },
  { word: "HOMONIM", clues: ["Kata sama tulisan beda arti", "Bisa (mampu) dan bisa (racun)", "Tergantung konteks kalimat"], category: "Bahasa" },
  { word: "HOMOFON", clues: ["Lafal sama tulisan beda", "Massa dan masa", "Sama bunyi, beda makna"], category: "Bahasa" },
  { word: "HOMOGRAF", clues: ["Tulisan sama lafal beda", "Apel (buah) dan apel (upacara)", "Ejaan identik, cara baca beda"], category: "Bahasa" },
  { word: "IDIOM", clues: ["Makna tidak bisa ditebak dari kata", "Kambing hitam, angkat kaki", "Ungkapan khas suatu bahasa"], category: "Bahasa" },
  { word: "SIMILE", clues: ["Perbandingan pakai kata pembanding", "Bagai air dengan minyak", "Seperti, bak, laksana"], category: "Sastra" },
  { word: "HIPERBOLA", clues: ["Melebih-lebihkan", "Suaranya menggelegar membelah langit", "Tidak literal, sangat berlebihan"], category: "Sastra" },
  { word: "EUFEMISME", clues: ["Kata halus pengganti kasar", "Meninggal dunia bukan mati", "Agar lebih sopan"], category: "Bahasa" },
  { word: "PLEONASME", clues: ["Kata berlebihan yang sebenarnya tidak perlu", "Naik ke atas, turun ke bawah", "Redudansi dalam kalimat"], category: "Bahasa" },
  { word: "KONJUNGSI", clues: ["Kata penghubung", "Dan, tetapi, karena, sehingga", "Menyambung dua klausa atau kalimat"], category: "Bahasa" },
  { word: "KATA KERJA", clues: ["Menunjukkan tindakan", "Makan, lari, membaca", "Predikat dalam kalimat"], category: "Bahasa" },
  { word: "KATA SIFAT", clues: ["Menjelaskan keadaan", "Indah, besar, cepat", "Bisa didahului sangat atau agak"], category: "Bahasa" },
  { word: "KATA BENDA", clues: ["Menyatakan nama orang, tempat, benda", "Meja, Jakarta, Budi", "Bisa diawali kata si atau sang"], category: "Bahasa" },
  { word: "KATA GANTI", clues: ["Menggantikan kata benda", "Saya, kamu, mereka", "Pronomina dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA SERU", clues: ["Menyatakan emosi spontan", "Wah, aduh, astaga", "Biasanya diakhiri tanda seru"], category: "Bahasa" },
  { word: "KATA SANDANG", clues: ["Artikel dalam bahasa Indonesia", "Si, sang, para, kaum", "Menyertai kata benda"], category: "Bahasa" },
  { word: "KATA BILANGAN", clues: ["Menyatakan jumlah atau urutan", "Satu, kedua, beberapa", "Numeralia dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA DEPAN", clues: ["Letaknya sebelum kata lain", "Di, ke, dari, pada, dalam", "Menunjukkan hubungan spasial"], category: "Bahasa" },
  { word: "KATA SAMBUNG", clues: ["Menghubungkan klausa atau kalimat", "Karena, sehingga, apabila", "Konjungsi dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA TANYA", clues: ["Untuk membuat pertanyaan", "Apa, siapa, di mana, mengapa", "Interogativa dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PERINTAH", clues: ["Menyuruh melakukan sesuatu", "Tutup pintu! Diam!", "Imperatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA LARANGAN", clues: ["Melarang melakukan sesuatu", "Jangan, dilarang, tidak boleh", "Prohibitif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA AJAKAN", clues: ["Mengajak melakukan sesuatu", "Mari, ayo, yuk", "Invitatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA HARAPAN", clues: ["Menyatakan keinginan", "Semoga, mudah-mudahan, berharap", "Optatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENGUAT", clues: ["Menguatkan makna kata lain", "Sangat, amat, benar-benar", "Intensifier dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PELEMAH", clues: ["Melemahkan makna kata lain", "Agak, sedikit, lumayan", "Mitigator dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENEGAS", clues: ["Menegaskan pernyataan", "Memang, sesungguhnya, pasti", "Asertif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYANGKAL", clues: ["Menyangkal pernyataan", "Tidak, bukan, jangan", "Negatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENUNJUK", clues: ["Menunjukkan sesuatu", "Ini, itu, sini, sana", "Demonstratif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENANYA", clues: ["Bertanya tentang sesuatu", "Apa, siapa, mana, mengapa", "Interogatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYERTA", clues: ["Menyertai kata lain", "Bersama, beserta, dengan", "Komitatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYEBAB", clues: ["Menyatakan sebab", "Karena, sebab, gara-gara", "Kausal dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYATA", clues: ["Menyatakan akibat", "Sehingga, sampai-sampai, akibatnya", "Konsekutif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PERBANDINGAN", clues: ["Membandingkan dua hal", "Seperti, bagaikan, laksana, bak", "Komparatif dalam tata bahasa"], category: "Bahasa" },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300, 19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800, 43700, 46700, 49800, 53000, 56300, 59700, 63200, 66800, 70500, 74300, 78200, 82200, 86300, 90500, 94800, 99200, 103700, 108300, 113000, 117800];

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

function getWordsForLevel(level: number) {
  const start = Math.min((level - 1) * 5, WORDS_DB.length - 5);
  const end = Math.min(start + 5, WORDS_DB.length);
  return WORDS_DB.slice(start, end);
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function TebakKataGame() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "result">("menu");
  const [xp, setXp] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [currentClue, setCurrentClue] = useState(0);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("tebak-kata-progress");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setXp(data.xp || 0);
        setBestStreak(data.bestStreak || 0);
      } catch {}
    }
  }, []);

  const saveProgress = useCallback((newXp: number, newBestStreak: number) => {
    localStorage.setItem("tebak-kata-progress", JSON.stringify({ xp: newXp, bestStreak: newBestStreak }));
  }, []);

  const startGame = () => {
    setGameState("playing");
    setLives(3);
    setScore(0);
    setStreak(0);
    setRound(0);
    setUsedWords(new Set());
    setHintUsed(false);
    nextWord(new Set());
  };

  const nextWord = (used: Set<string>) => {
    const level = getLevel(xp);
    const available = WORDS_DB.filter((w) => !used.has(w.word));
    if (available.length === 0) {
      setUsedWords(new Set());
      const pool = shuffleArray(WORDS_DB);
      setCurrentWord(pool[0]);
      setUsedWords(new Set([pool[0].word]));
    } else {
      const word = available[Math.floor(Math.random() * available.length)];
      setCurrentWord(word);
      setUsedWords(new Set([...used, word.word]));
    }
    setCurrentClue(0);
    setGuess("");
    setFeedback(null);
    setHintUsed(false);
  };

  const checkAnswer = () => {
    if (!currentWord || !guess.trim()) return;
    const isCorrect = guess.trim().toUpperCase() === currentWord.word;

    if (isCorrect) {
      const basePoints = 100;
      const clueBonus = currentClue === 0 ? 50 : currentClue === 1 ? 25 : 0;
      const streakBonus = streak * 10;
      const totalPoints = basePoints + clueBonus + streakBonus;
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
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);

      if (newLives <= 0) {
        setFeedback({ correct: false, message: `Jawaban: ${currentWord.word}` });
        setTimeout(() => setGameState("result"), 2000);
      } else {
        setFeedback({ correct: false, message: `Salah! Sisa nyawa: ${newLives}` });
        if (currentClue < currentWord.clues.length - 1) {
          setCurrentClue((c) => c + 1);
        }
        setGuess("");
      }
    }
  };

  const useHint = () => {
    if (!currentWord || hintUsed) return;
    setHintUsed(true);
    const firstLetter = currentWord.word[0];
    const masked = currentWord.word.split("").map((l: string, i: number) => (i === 0 || i === currentWord.word.length - 1 ? l : "_")).join(" ");
    setGuess(masked.replace(/ /g, ""));
  };

  const levelInfo = getLevelProgress(xp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col">
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
        {/* XP Bar */}
        <div className="max-w-lg mx-auto mt-2">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span className="flex items-center gap-1"><Crown size={12} className="text-yellow-400" /> Level {levelInfo.level}</span>
            <span>{Math.floor(xp)} / {levelInfo.next} XP</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500" style={{ width: `${levelInfo.progress}%` }} />
          </div>
        </div>
      </div>

      {/* Menu */}
      {gameState === "menu" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center max-w-sm">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Lightbulb size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Tebak Kata</h1>
            <p className="text-white/60 mb-6">Tebak kata Bahasa Indonesia dari petunjuk yang diberikan</p>

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

            <button onClick={startGame} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-2xl text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
              <Zap size={20} /> Mulai Bermain
            </button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {gameState === "playing" && currentWord && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={currentWord.word} className="max-w-lg w-full text-center">
            {/* Round indicator */}
            <div className="flex items-center justify-between text-sm text-white/50 mb-6">
              <span>Ronde {round + 1} / {totalRounds}</span>
              {streak > 0 && <span className="text-orange-400 font-bold flex items-center gap-1"><Zap size={14} /> Streak {streak}</span>}
            </div>

            {/* Category */}
            <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/70 mb-4">
              {currentWord.category}
            </div>

            {/* Word length hint */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {currentWord.word.split("").map((_, i) => (
                <div key={i} className="w-8 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                  <span className="text-white/30 text-sm">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Clues */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/10">
              <p className="text-sm text-white/50 mb-3">Petunjuk:</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentClue}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-2"
                >
                  {currentWord.clues.slice(0, currentClue + 1).map((clue: string, i: number) => (
                    <p key={i} className={`text-sm ${i === currentClue ? "text-white font-medium" : "text-white/40"}`}>
                      {i === currentClue ? "💡" : "✓"} {clue}
                    </p>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="flex gap-3 mb-4">
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                placeholder="Ketik jawaban..."
                className={`flex-1 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl px-4 py-3 text-white text-center text-lg font-bold tracking-wider placeholder-white/30 focus:outline-none focus:border-indigo-400 transition-all ${shakeInput ? "animate-pulse border-red-400" : ""}`}
                maxLength={currentWord.word.length + 5}
                autoFocus
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={useHint} disabled={hintUsed} className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 font-semibold py-3 rounded-xl hover:bg-white/20 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                <Lightbulb size={16} /> Petunjuk
              </button>
              <button onClick={checkAnswer} disabled={!guess.trim()} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Check size={16} /> Tebak
              </button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className={`mt-4 p-3 rounded-xl text-sm font-medium ${feedback.correct ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
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

            <button onClick={startGame} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
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
