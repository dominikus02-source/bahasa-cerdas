"use client";

import { useEffect, useState, useCallback } from "react";
import { gameSocket } from "@/lib/game/socket";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Swords, Copy, Check, Users, Sparkles, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const GAME_MODES = [
  {
    id: "KUIS_BATTLE",
    name: "Kuis Battle",
    desc: "Jawab cepat, kumpulkan poin, rebut peringkat teratas!",
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    lightColor: "bg-violet-50 border-violet-200",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    id: "GOLD_RUSH",
    name: "Gold Rush",
    desc: "Kumpulkan emas sebanyak-banyaknya, jawab benar untuk menambang!",
    icon: Trophy,
    color: "from-amber-500 to-orange-600",
    lightColor: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "SPEED_BATTLE",
    name: "Speed Battle",
    desc: "Kecepatan adalah segalanya! Jawab paling cepat dapat poin terbanyak!",
    icon: Swords,
    color: "from-red-500 to-rose-600",
    lightColor: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
];

interface GameLobbyProps {
  isHost?: boolean;
  roomCode?: string;
  onStart?: () => void;
}

export default function GameLobby({ isHost = false, roomCode: initialCode, onStart }: GameLobbyProps) {
  const [room, setRoom] = useState<any>(null);
  const [code, setCode] = useState(initialCode || "");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState("KUIS_BATTLE");
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("bc-user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserName(parsed.state?.fullName || "Player");
        setUserId(parsed.state?.supabaseId || "");
      } catch {}
    }
  }, []);

  useEffect(() => {
    gameSocket.connect();

    const unsub1 = gameSocket.onRoomCreated((data: any) => {
      setRoom(data);
      setCode(data.code);
    });

    const unsub2 = gameSocket.onRoomJoined((data: any) => {
      setRoom(data);
      setCode(data.code);
    });

    const unsub3 = gameSocket.onPlayerList((data: any[]) => {
      setPlayers(data);
    });

    const unsub4 = gameSocket.onNotification((data: { message: string }) => {});

    const unsub5 = gameSocket.onHostChanged((data: { newHostId: string }) => {});

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  const handleCreate = useCallback(() => {
    gameSocket.createRoom({
      hostId: userId,
      hostName: userName,
      name: `${userName}'s Game`,
      gameType: selectedMode,
      category: "BAHASA",
      difficulty: "MEDIUM",
      questionCount: 10,
      timePerQuestion: 20,
    });
  }, [userId, userName, selectedMode]);

  const handleJoin = useCallback(() => {
    if (joinCode.length !== 6) return;
    gameSocket.joinRoom({
      roomCode: joinCode.toUpperCase(),
      playerId: userId,
      playerName: userName,
    });
  }, [joinCode, userId, userName]);

  const handleStart = useCallback(() => {
    gameSocket.startGame({ roomCode: code });
  }, [code]);

  const handleLeave = useCallback(() => {
    gameSocket.leaveRoom({ roomCode: code, playerId: userId });
    setRoom(null);
    setCode("");
    setPlayers([]);
  }, [code, userId]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (room) {
    const modeInfo = GAME_MODES.find((m) => m.id === (room.gameType || selectedMode));
    const ModeIcon = modeInfo?.icon || Zap;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${modeInfo?.color || "from-violet-500 to-purple-600"} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <ModeIcon size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{modeInfo?.name || "Game Room"}</h2>
              <p className="text-sm text-slate-500 mt-1">Bagikan kode ini ke pemain lain</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 text-center mb-6 border-2 border-dashed border-slate-200">
              <p className="text-xs text-slate-400 mb-2">KODE RUANGAN</p>
              <p className="text-5xl font-black tracking-[0.3em] text-slate-900 mb-4">{code}</p>
              <button onClick={copyCode} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                {copied ? <><Check size={16} className="text-green-500" /> Tersalin</> : <><Copy size={16} /> Salin Kode</>}
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={16} /> Pemain ({players.length})
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => {
                  const player = players[i];
                  return (
                    <div key={i} className={`rounded-xl p-3 text-center ${player ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-dashed border-slate-200"}`}>
                      {player ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm mx-auto mb-1">
                            {player.playerName.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-[11px] font-medium text-slate-700 truncate">{player.playerName}</p>
                          {player.isHost && <span className="text-[10px] text-emerald-600 font-semibold">Host</span>}
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-1">
                          <span className="text-slate-300 text-lg">+</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              {isHost && (
                <Button onClick={handleStart} disabled={players.length < 1}
                  className={`flex-1 bg-gradient-to-r ${modeInfo?.color || "from-violet-500 to-purple-600"} text-white font-bold py-3 rounded-2xl shadow-lg transition-all hover:scale-[1.02]`}>
                  <Sparkles size={18} /> Mulai Game
                </Button>
              )}
              <Button onClick={handleLeave} variant="outline" className="flex-1 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl py-3">
                Keluar
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4">
      <div className="max-w-lg mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Kuis Battle</h1>
          <p className="text-slate-500 mt-2">Pilih mode dan ajak temanmu bertanding!</p>
        </div>

        {isHost && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-slate-700 mb-3">Pilih Mode Game</p>
            <div className="space-y-3">
              {GAME_MODES.map((mode) => {
                const ModeIcon = mode.icon;
                const isSelected = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
                      isSelected ? mode.lightColor + " shadow-md scale-[1.02]" : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${isSelected ? `bg-gradient-to-br ${mode.color}` : "bg-slate-100"} flex items-center justify-center`}>
                        <ModeIcon size={24} className={isSelected ? "text-white" : "text-slate-400"} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{mode.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{mode.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isHost ? (
            <Button onClick={handleCreate} disabled={!userId}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
              <Sparkles size={20} /> Buat Ruangan
            </Button>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-3">Masuk ke Ruangan</p>
              <div className="flex gap-3">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="XXXXXX"
                  className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-lg font-bold tracking-widest uppercase focus:border-violet-500 focus:outline-none"
                  maxLength={6}
                />
                <Button onClick={handleJoin} disabled={joinCode.length !== 6}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold px-6 rounded-xl shadow-lg">
                  <ArrowRight size={20} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
