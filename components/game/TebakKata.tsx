"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, Trophy, Zap, Lightbulb, Check, X, RefreshCw, Crown, Sparkles } from "lucide-react";

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
  { word: "FABEL", clues: ["Cerita tentang hewan berkarakter manusia", "Kancil dan Buaya", "Pesan moral di dalamnya"], category: "Sastra" },
  { word: "LEGENDA", clues: ["Cerita asal-usul tempat", "Danau Toba, Tangkuban Perahu", "Dianggap benar terjadi"], category: "Sastra" },
  { word: "MITOS", clues: ["Cerita tentang dewa-dewi", "Nyai Roro Kidul", "Kepercayaan masyarakat"], category: "Sastra" },
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
    const available = WORDS_DB.filter((w) => !used.has(w.word));
    if (available.length === 0) {
      setUsedWords(new Set());
      const pool = [...WORDS_DB];
      const word = pool[Math.floor(Math.random() * pool.length)];
      setCurrentWord(word);
      setUsedWords(new Set([word.word]));
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
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);

      if (newLives <= 0) {
        setFeedback({ correct: false, message: currentWord.word });
        setTimeout(() => setGameState("result"), 2000);
      } else {
        setFeedback({ correct: false, message: `${newLives} nyawa tersisa` });
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
    const masked = currentWord.word.split("").map((l: string, i: number) => (i === 0 || i === currentWord.word.length - 1 ? l : "_")).join(" ");
    setGuess(masked.replace(/ /g, ""));
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
                <motion.div key={i} animate={i >= lives ? { scale: [1, 0.8, 1] } : {}}>
                  <Heart size={18} className={i < lives ? "text-red-500 fill-red-500" : "text-gray-300"} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      {gameState === "menu" && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center max-w-sm w-full">
            <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
              <Lightbulb size={52} className="text-white" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Tebak Kata</h1>
            <p className="text-gray-500 mb-8 text-base">Tebak kata Bahasa Indonesia dari petunjuk</p>

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
                    <Zap size={16} className="text-violet-500" />
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
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 0.8 }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center">{Math.floor(xp)} / {levelInfo.next} XP</p>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <Zap size={20} /> Mulai Bermain
            </button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {gameState === "playing" && currentWord && (
        <div className="flex-1 flex flex-col px-6 py-6 max-w-lg mx-auto w-full">
          {/* Round & Streak */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-400">{round + 1} / {totalRounds}</span>
            {streak > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full">
                <Zap size={14} className="text-orange-500 fill-orange-500" />
                <span className="text-orange-700 font-bold text-sm">{streak}</span>
              </motion.div>
            )}
          </div>

          {/* Category Badge */}
          <div className="flex justify-center mb-6">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-4 py-1.5 rounded-full">{currentWord.category}</span>
          </div>

          {/* Word Length */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {currentWord.word.split("").map((_: string, i: number) => (
              <div key={i} className="w-9 h-11 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                <span className="text-gray-300 text-sm font-medium">{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Clues Card */}
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Petunjuk</p>
            <AnimatePresence mode="wait">
              <motion.div key={currentClue} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-2.5">
                {currentWord.clues.slice(0, currentClue + 1).map((clue: string, i: number) => (
                  <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`text-sm leading-relaxed ${i === currentClue ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                    <span className="mr-2">{i === currentClue ? "💡" : "✓"}</span>{clue}
                  </motion.p>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="mb-4">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
              placeholder="Ketik jawaban..."
              className={`w-full bg-white border-2 ${shakeInput ? "border-red-400" : "border-gray-200 focus:border-violet-500"} rounded-2xl px-5 py-4 text-center text-xl font-bold tracking-widest placeholder-gray-300 focus:outline-none transition-all shadow-sm`}
              maxLength={currentWord.word.length + 5}
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={useHint} disabled={hintUsed} className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-30 flex items-center justify-center gap-2 shadow-sm">
              <Lightbulb size={18} /> Petunjuk
            </button>
            <button onClick={checkAnswer} disabled={!guess.trim()} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Check size={18} /> Tebak
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
            <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 1 }} className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
              <Trophy size={52} className="text-white" />
            </motion.div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Selesai!</h2>
            <p className="text-gray-500 mb-6">Skor kamu</p>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600 mb-8">{score}</p>

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
                <span className="font-bold text-violet-600">{levelInfo.level}</span>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
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
