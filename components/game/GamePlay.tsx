'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { gameSocket } from '@/lib/game/socket';
import { useUserStore } from '@/store';

interface Player {
  id: string;
  playerName: string;
  avatarUrl?: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  maxStreak: number;
  ready: boolean;
  isHost: boolean;
}

interface Question {
  id: string;
  text: string;
  audioUrl?: string;
  imageUrl?: string;
  passage?: string;
  type: string;
  options: string[];
  correctAnswer?: string;
}

interface Props {
  roomCode: string;
  onFinish: () => void;
}

export default function GamePlay({ roomCode, onFinish }: Props) {
  const router = useRouter();
  const user = useUserStore();
  const [phase, setPhase] = useState<'countdown' | 'question' | 'result'>('countdown');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef<number>(0);

  useEffect(() => {
    gameSocket.connect(user.id || 'temp', user.fullName || 'Player', user.avatar || undefined);
    gameSocket.joinRoom({ code: roomCode, userId: user.id || 'temp', playerName: user.fullName || 'Player', avatarUrl: user.avatar || undefined });

    gameSocket.onGameStarting((data) => {
      setTotalQuestions(data.totalQuestions);
      setPhase('countdown');
      setCountdown(3);
    });

    gameSocket.onPlayerList((list) => {
      setPlayers(list);
    });

    gameSocket.onShowQuestion((data) => {
      setQuestion(data.question as Question);
      setCurrentQuestion(data.questionIndex);
      setTimeLeft(data.timeLimit);
      setSelectedAnswer(null);
      setShowResult(false);
      setPhase('question');
      questionStartRef.current = Date.now();

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
    });

    gameSocket.onTimeUp((data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setShowResult(true);
      setTimeout(() => {
        setPhase('question');
      }, 2000);
    });

    gameSocket.onAnswerResult((data) => {
      if (data.playerId === (user.id || 'temp')) {
        if (data.isCorrect) {
          setStreak((s) => s + 1);
          setCorrectCount((c) => c + 1);
        } else {
          setStreak(0);
        }
      }
    });

    gameSocket.onScoreUpdate((data) => {
      if (data.playerId === (user.id || 'temp')) {
        setMyScore(data.score);
      }
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, score: data.score } : p))
      );
    });

    gameSocket.onGameFinished((data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResults(data.results);
      setPhase('result');
      onFinish();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      gameSocket.leaveRoom({ code: roomCode, userId: user.id || 'temp' });
    };
  }, [roomCode, user.id, user.fullName, user.avatar]);

  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (phase === 'countdown' && countdown === 0) {
      setPhase('question');
    }
  }, [phase, countdown]);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || phase !== 'question') return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAnswer(index);
    setShowResult(true);

const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
      gameSocket.submitAnswer({
        code: roomCode,
        userId: user.id || 'temp',
        questionIndex: currentQuestion,
        answerIndex: index,
        timeSpent,
      });

    setTimeout(() => {
      setShowResult(false);
      setPhase('question');
    }, 2000);
  };

  const handleTimeUp = () => {
    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
      setPhase('question');
    }, 2000);
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: countdown > 0 ? Infinity : 0 }}
                className="text-9xl font-black text-white mb-8"
              >
                {countdown > 0 ? countdown : 'GO!'}
              </motion.div>
              <p className="text-2xl text-white/70">Persiapkan diri Anda!</p>
            </motion.div>
          )}

          {phase === 'question' && question && (
            <motion.div
              key={`q-${currentQuestion}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">
                    Soal {currentQuestion + 1} / {totalQuestions}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-black ${streak > 0 ? 'text-yellow-400' : 'text-white'}`}>
                      🔥 {streak}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      Skor: {myScore.toLocaleString()}
                    </div>
                  </div>
                </div>

                {timeLeft <= 5 && (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    className="bg-red-500 text-white text-center py-2 rounded-xl font-bold text-xl"
                  >
                    ⚠️ {timeLeft} detik
                  </motion.div>
                )}

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <p className="text-2xl font-bold text-white mb-6">{question.text}</p>

                  <div className="grid grid-cols-2 gap-4">
                    {question.options.map((option, index) => {
                      const correctIdx = question.correctAnswer ? parseInt(question.correctAnswer) : -1;
                      const letter = ['A', 'B', 'C', 'D'][index] || String.fromCharCode(65 + index);
                      let bgClass = 'bg-white/10 hover:bg-white/20';
                      if (selectedAnswer !== null) {
                        if (index === selectedAnswer) {
                          bgClass = index === correctIdx ? 'bg-green-500' : 'bg-red-500';
                        } else if (index === correctIdx) {
                          bgClass = 'bg-green-500/50';
                        }
                      }
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(index)}
                          disabled={selectedAnswer !== null}
                          className={`${bgClass} text-white p-4 rounded-xl font-semibold text-lg transition-all flex items-center gap-3`}
                        >
                          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                            {letter}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all"
                    style={{ width: `${(timeLeft / 20) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <h3 className="text-white font-bold mb-3">🏆 Papan Skor</h3>
                  <div className="space-y-2">
                    {sortedPlayers.slice(0, 5).map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-2 rounded-xl ${
                          index === 0 ? 'bg-yellow-500/30' : index === 1 ? 'bg-gray-400/20' : index === 2 ? 'bg-amber-600/20' : 'bg-white/5'
                        }`}
                      >
                        <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {player.playerName.charAt(0)}
                        </div>
                        <span className="flex-1 text-white text-sm font-medium truncate">
                          {player.playerName}
                        </span>
                        <span className="text-white font-bold">{player.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <h3 className="text-white font-bold mb-2">📊 Statistik Saya</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-green-500/20 p-2 rounded-lg text-center">
                      <p className="text-green-400">Benar</p>
                      <p className="text-white font-bold">{correctCount}</p>
                    </div>
                    <div className="bg-red-500/20 p-2 rounded-lg text-center">
                      <p className="text-red-400">Salah</p>
                      <p className="text-white font-bold">{currentQuestion - correctCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center py-8"
            >
              <h1 className="text-4xl font-black text-white mb-2">🎉 Game Selesai!</h1>
              <p className="text-white/70 mb-8">Hasil permainan {roomCode}</p>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto mb-8">
                <h3 className="text-yellow-400 text-2xl font-bold mb-4">Podium</h3>
                <div className="flex items-end justify-center gap-4 mb-8">
                  {results.slice(0, 3).map((result, index) => (
                    <motion.div
                      key={result.playerId}
                      initial={{ y: 50 }}
                      animate={{ y: 0 }}
                      transition={{ delay: index * 0.2 }}
                      className={`text-center ${
                        index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3'
                      }`}
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-2">
                        {result.playerName.charAt(0)}
                      </div>
                      <p className="text-white font-bold">{result.playerName}</p>
                      <p className="text-yellow-400 text-2xl font-black">{result.score}</p>
                      <p className="text-white/70 text-sm">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 max-w-2xl mx-auto">
                <h3 className="text-white font-bold mb-4">Skor Saya</h3>
                <p className="text-6xl font-black text-yellow-400">{myScore.toLocaleString()}</p>
                <p className="text-white/70 mt-2">+{Math.floor(myScore / 10)} XP</p>
              </div>

              <div className="flex gap-4 justify-center mt-8">
                <button
                  onClick={() => router.push('/murid/game')}
                  className="px-8 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={() => router.push(`/game/battle/${roomCode}`)}
                  className="px-8 py-3 bg-yellow-500 text-gray-900 rounded-xl font-bold hover:bg-yellow-400 transition"
                >
                  Main Lagi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}