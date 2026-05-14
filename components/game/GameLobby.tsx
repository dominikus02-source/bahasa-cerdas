"use client";

import { useEffect, useState, useCallback } from "react";
import { gameSocket } from "@/lib/game/socket";
import { motion } from "framer-motion";
import { Zap, Trophy, Swords, Heart, Timer, Copy, Check, Users, Sparkles, ArrowRight, Maximize, Minimize } from "lucide-react";

const GAME_MODES = [
  {
    id: "KUIS_BATTLE",
    name: "Adu Cerdas",
    desc: "Jawab benar, kumpulkan poin, rebut peringkat teratas!",
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    textColor: "text-violet-700",
    svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="white" stroke-width="1.5" opacity=".3"/><path d="M40 15L45 35H65L48 48L55 68L40 55L25 68L32 48L15 35H35L40 15Z" fill="white" opacity=".9"/></svg>',
  },
  {
    id: "GOLD_RUSH",
    name: "Rebut Emas",
    desc: "Kumpulkan emas sebanyak-banyaknya, jawab benar untuk menambang!",
    icon: Trophy,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="white" stroke-width="1.5" opacity=".3"/><circle cx="40" cy="32" r="10" fill="white"/><path d="M25 50C25 44 33 42 40 42C47 42 55 44 55 50V58H25V50Z" fill="white" opacity=".9"/><path d="M30 62H50" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
  },
  {
    id: "SPEED_BATTLE",
    name: "Cepat Tepat",
    desc: "Kecepatan adalah segalanya! Jawab paling cepat dapat poin terbanyak!",
    icon: Swords,
    color: "from-red-500 to-rose-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="white" stroke-width="1.5" opacity=".3"/><path d="M28 20L52 40L28 60" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 20L64 40L40 60" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/></svg>',
  },
  {
    id: "SURVIVAL",
    name: "Tak Terkalahkan",
    desc: "Punya 3 nyawa! Jawab salah = nyawa berkurang. Bertahan paling akhir jadi juara!",
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-700",
    svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="white" stroke-width="1.5" opacity=".3"/><path d="M40 28C34 24 24 26 24 34C24 42 40 56 40 56C40 56 56 42 56 34C56 26 46 24 40 28Z" fill="white" opacity=".9"/></svg>',
  },
  {
    id: "TIMED_TRIAL",
    name: "Lawan Waktu",
    desc: "Waktu terbatas! Jawab benar untuk tambah waktu. Kejar skor tertinggi!",
    icon: Timer,
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700",
    svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="white" stroke-width="1.5" opacity=".3"/><circle cx="40" cy="40" r="16" stroke="white" stroke-width="3"/><path d="M40 30V40L47 47" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M38 20H42" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>',
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleSolo = useCallback(() => {
    gameSocket.createRoom({
      hostId: userId,
      hostName: userName,
      name: `Solo ${userName}`,
      gameType: "TIMED_TRIAL",
      category: "BAHASA",
      difficulty: "MEDIUM",
      questionCount: 10,
      timePerQuestion: 20,
    });
  }, [userId, userName]);

  // Auto-start game when room is created for solo mode
  useEffect(() => {
    const unsub = gameSocket.onRoomCreated((data: any) => {
      if (data.gameType === "TIMED_TRIAL") {
        setTimeout(() => {
          gameSocket.startGame({ roomCode: data.code });
        }, 500);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("bc-user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserName(parsed.state?.fullName || "Pemain");
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

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const handleCreate = useCallback(() => {
    gameSocket.createRoom({
      hostId: userId,
      hostName: userName,
      name: `Ruangan ${userName}`,
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
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-lg mx-auto w-full">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full text-center">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${modeInfo?.color || "from-violet-500 to-purple-600"} flex items-center justify-center shadow-lg`}>
                  <ModeIcon size={32} className="text-white" />
                </div>
                <button onClick={toggleFullscreen} className="text-white/40 hover:text-white transition-colors p-2" title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}>
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
              <h2 className="text-2xl font-bold text-white">{modeInfo?.name || "Ruangan Game"}</h2>
              <p className="text-sm text-white/50 mt-1">Bagikan kode ini ke pemain lain</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-8 px-6 mb-6">
              <p className="text-xs text-white/40 mb-2 tracking-widest uppercase">Kode Ruangan</p>
              <p className="text-5xl font-black tracking-[0.3em] text-white mb-4">{code}</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={copyCode} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl">
                  {copied ? <><Check size={16} className="text-green-400" /> Tersalin</> : <><Copy size={16} /> Salin Kode</>}
                </button>
                <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://bahasacerdas.site/game?code=' + code)}`, '_blank')}
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM20 14h1v1h-1zM17 17h3v3h-3zM14 20h1v1h-1zM20 17h1v1h-1z"/></svg>
                  QR
                </button>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <Users size={16} /> Pemain ({players.length})
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[...Array(6)].map((_, i) => {
                  const player = players[i];
                  return player ? (
                    <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center w-20">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm mx-auto mb-1 shadow">
                        {player.playerName.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-[11px] font-medium text-white truncate">{player.playerName}</p>
                      {player.isHost && <span className="text-[10px] text-emerald-400 font-semibold">Tuan Rumah</span>}
                    </div>
                  ) : (
                    <div key={i} className="bg-white/5 border border-dashed border-white/10 rounded-xl p-3 text-center w-20">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-1">
                        <span className="text-white/20 text-lg">+</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              {isHost && (
                <button onClick={handleStart} disabled={players.length < 1}
                  className={`flex-1 bg-gradient-to-r ${modeInfo?.color || "from-violet-500 to-purple-600"} text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed`}>
                  <Sparkles size={18} className="inline mr-1.5" /> Mulai Game
                </button>
              )}
              <button onClick={handleLeave} className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white font-semibold py-3.5 rounded-2xl transition-all">
                Keluar
              </button>
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
            <p className="text-sm font-semibold text-slate-700 mb-4">Pilih Mode Game</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GAME_MODES.map((mode) => {
                const ModeIcon = mode.icon;
                const isSelected = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`relative rounded-2xl border-2 p-4 transition-all ${
                      isSelected
                        ? `${mode.bgColor} ${mode.borderColor} shadow-lg scale-[1.02]`
                        : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-2xl ${isSelected ? `bg-gradient-to-br ${mode.color}` : "bg-slate-100"} flex items-center justify-center mx-auto mb-3 transition-all overflow-hidden`}>
                        <div className="w-12 h-12" dangerouslySetInnerHTML={{ __html: mode.svg }} />
                      </div>
                      <h3 className={`font-bold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{mode.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{mode.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isHost ? (
            <>
              <button onClick={handleCreate} disabled={!userId}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Sparkles size={20} /> Buat Ruangan
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">atau</span></div>
              </div>
              <button onClick={handleSolo} disabled={!userId}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                <Timer size={20} /> Main Sendiri
              </button>
            </>
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
                <button onClick={handleJoin} disabled={joinCode.length !== 6}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold px-6 rounded-xl shadow-lg disabled:opacity-40">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
