'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store';
import { gameSocket } from '@/lib/game/socket';
import { Users, Play, Copy, CheckCircle2, LogOut, QrCode, Crown } from 'lucide-react';

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

interface Props {
  roomCode?: string;
  isHost?: boolean;
  onStart?: () => void;
}

export default function GameLobby({ roomCode: initialRoomCode, isHost: initialIsHost, onStart }: Props) {
  const user = useUserStore();
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [joinedCode, setJoinedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(initialIsHost || false);
  const [showModal, setShowModal] = useState<'create' | 'join' | null>(null);
  const [gameMode, setGameMode] = useState('KUIS_BATTLE');

  useEffect(() => {
    if (!user.id) return;
    gameSocket.connect(user.id, user.fullName || 'Guru', user.avatar || undefined);

    gameSocket.onRoomCreated((data) => {
      setCurrentRoom(data.code);
      setIsHost(true);
      setPlayers([data.player]);
    });

    gameSocket.onRoomJoined((data) => {
      setCurrentRoom(data.code);
      setIsHost(false);
      setPlayers([data.player]);
    });

    gameSocket.onPlayerList((list) => {
      setPlayers(list);
    });

    gameSocket.onHostChanged((data) => {
      if (data.newHostId === user.id) setIsHost(true);
    });

    return () => {
      if (currentRoom) {
        gameSocket.leaveRoom({ code: currentRoom, userId: user.id || '' });
      }
    };
  }, [user.id]);

  const handleCreate = (mode: string) => {
    setGameMode(mode);
    const code = generateCode();
    setRoomCode(code);
    gameSocket.createRoom({
      hostId: user.id || '',
      hostName: user.fullName || 'Guru',
      hostAvatar: user.avatar || undefined,
      name: `Kuis Bahasa Indonesia - ${code}`,
      gameType: mode,
      questionCount: 10,
      timePerQuestion: 20,
    });
    setShowModal(null);
  };

  const handleJoin = () => {
    if (joinedCode.length === 6) {
      gameSocket.joinRoom({
        code: joinedCode.toUpperCase(),
        userId: user.id || '',
        playerName: user.fullName || 'Siswa',
        avatarUrl: user.avatar || undefined,
      });
    }
  };

  const handleStart = () => {
    if (currentRoom) {
      gameSocket.startGame({ code: currentRoom });
      onStart?.();
    }
  };

  const handleLeave = () => {
    if (currentRoom) {
      gameSocket.leaveRoom({ code: currentRoom, userId: user.id || '' });
      setCurrentRoom(null);
      setPlayers([]);
      setIsHost(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/murid/game/lobby?code=${currentRoom}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 p-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <h2 className="text-white text-2xl font-bold mb-2">Room Aktif</h2>
              <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-4 inline-block">
                <p className="text-emerald-300 text-sm mb-1">Kode Room</p>
                <p className="text-white text-5xl font-black tracking-widest">{currentRoom}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center mb-6">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium transition"
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? 'Tersalin!' : 'Salin Link'}
              </button>
              <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium transition">
                <QrCode size={18} /> QR
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users size={18} /> Pemain ({players.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {players.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-white/10 rounded-xl p-3 text-center ${p.isHost ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 mx-auto flex items-center justify-center text-white font-bold text-lg mb-2">
                      {p.playerName.charAt(0)}
                    </div>
                    <p className="text-white text-sm font-medium truncate">{p.playerName}</p>
                    {p.isHost && <span className="text-yellow-400 text-xs">Host</span>}
                  </motion.div>
                ))}
                {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white/5 rounded-xl p-3 text-center border-2 border-dashed border-white/10">
                    <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-2">
                      <Users size={20} className="text-white/20" />
                    </div>
                    <p className="text-white/30 text-sm">Menunggu...</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-medium transition"
              >
                <LogOut size={18} /> Keluar
              </button>
              {isHost && (
                <button
                  onClick={handleStart}
                  disabled={players.length < 1}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={18} /> Mulai Game
                </button>
              )}
              {!isHost && (
                <div className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white/60 px-6 py-3 rounded-xl">
                  Menunggu host memulai...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center py-8">
          <h1 className="text-white text-3xl font-black mb-2">🎮 Game Edukasi</h1>
          <p className="text-white/60">Pilih mode untuk memulai</p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20"
        >
          <h3 className="text-white font-bold mb-4">Buat Room Kuis</h3>
          <div className="space-y-3">
            {[
              { id: 'KUIS_BATTLE', name: 'Kuis Battle', desc: 'Jawab pilihan ganda secepat mungkin', icon: '🎯', color: 'from-blue-500 to-cyan-500' },
              { id: 'TEBAC_KATA', name: 'Tebak Kata', desc: 'Tebak kata dari petunjuk', icon: '💬', color: 'from-purple-500 to-pink-500' },
              { id: 'KATA_SERU', name: 'Kata Seru', desc: 'Kumpulkan kata sebanyak-banyaknya', icon: '🎲', color: 'from-orange-500 to-red-500' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleCreate(mode.id)}
                className={`w-full flex items-center gap-4 bg-gradient-to-r ${mode.color} p-4 rounded-2xl text-white hover:opacity-90 transition`}
              >
                <span className="text-4xl">{mode.icon}</span>
                <div className="text-left">
                  <p className="font-bold">{mode.name}</p>
                  <p className="text-sm opacity-80">{mode.desc}</p>
                </div>
                <Play size={20} className="ml-auto" />
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20"
        >
          <h3 className="text-white font-bold mb-4">Masuk Room</h3>
          <div className="flex gap-3">
            <input
              value={joinedCode}
              onChange={(e) => setJoinedCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="KODE ROOM"
              className="flex-1 text-center text-2xl font-bold tracking-widest bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 placeholder:text-white/30"
            />
            <button
              onClick={handleJoin}
              disabled={joinedCode.length !== 6}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition disabled:opacity-50"
            >
              Gabung
            </button>
          </div>
        </motion.div>

        <div className="text-center pt-4">
          <p className="text-white/40 text-sm">
            Murid bisa masuk melalui link atau kode room
          </p>
        </div>
      </div>
    </div>
  );
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}