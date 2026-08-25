"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gameSocket } from "@/lib/game/socket";
import { motion } from "framer-motion";
import { Zap, Trophy, Swords, Heart, Timer, Copy, Check, Users, Sparkles, ArrowRight, Maximize, Minimize, Lightbulb, Shuffle } from "lucide-react";
import { MULTIPLAYER_ENABLED } from "@/lib/features";
import ComingSoon from "@/components/game/ComingSoon";

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
  },
];

const SOLO_GAMES = [
  {
    id: "tebak-kata",
    name: "Tebak Kata",
    desc: "Tebak kata dari petunjuk yang diberikan",
    icon: Lightbulb,
    color: "from-indigo-500 to-purple-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
  },
  {
    id: "susun-kata",
    name: "Susun Kata",
    desc: "Susun huruf acak menjadi kata yang benar",
    icon: Shuffle,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
  },
];

interface GameLobbyProps {
  isHost?: boolean;
  roomCode?: string;
  onStart?: () => void;
  role?: "GURU" | "MURID";
}

export default function GameLobby({ isHost = false, roomCode: initialCode, onStart, role = "MURID" }: GameLobbyProps) {
  if (!MULTIPLAYER_ENABLED) return <ComingSoon title="Kuis Tempur — Segera Hadir" backHref={role === "GURU" ? "/guru/game" : "/murid/game"} />;

  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [code, setCode] = useState(initialCode || "");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState("KUIS_BATTLE");
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Server pertandingan berjalan di VPS terpisah. Tanpa keadaan ini, lobinya
  // hanya menampilkan daftar pemain kosong selamanya saat server mati.
  const [serverMati, setServerMati] = useState(false);

  // requestFullscreen() mengembalikan Promise dan SERING ditolak — di dalam APK
  // (TWA) layar penuh kerap tidak diizinkan sama sekali. Versi lama mengabaikan
  // Promise itu lalu tetap menyetel isFullscreen(true), sehingga tombolnya
  // berubah jadi "Keluar Layar Penuh" padahal layarnya tidak pernah penuh.
  // Keadaan hanya diubah setelah browser benar-benar menyetujui.
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Ditolak browser — biarkan tampilan apa adanya. Listener
      // "fullscreenchange" di bawah tetap menjadi sumber kebenarannya.
      setIsFullscreen(!!document.fullscreenElement);
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
          gameSocket.startGame({ code: data.code });
        }, 500);
      }
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("bc-user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const name = parsed.state?.fullName || "Pemain";
        const uid = parsed.state?.supabaseId || "";
        setUserName(name);
        setUserId(uid);
        if (uid) {
          gameSocket.connect(uid, name, parsed.state?.avatar || "");
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    gameSocket.connect(userId, userName);

    const unsubGagal = gameSocket.onGagalSambung(() => setServerMati(true));

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

    return () => { unsub1(); unsub2(); unsub3(); unsubGagal(); };
  }, [userId, userName]);

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
      code: joinCode.toUpperCase(),
      userId,
      playerName: userName,
    });
  }, [joinCode, userId, userName]);

  const handleStart = useCallback(() => {
    gameSocket.startGame({ code });
  }, [code]);

  const handleLeave = useCallback(() => {
    gameSocket.leaveRoom({ code, userId });
    setRoom(null);
    setCode("");
    setPlayers([]);
  }, [code, userId]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Layar berhenti, bukan lobi kosong: tanpa server pertandingan tidak ada satu
  // pun tombol di halaman ini yang bisa bekerja, dan lobi yang menunggu pemain
  // selamanya membuat murid mengira gimnya yang rusak.
  if (serverMati && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">🔌</div>
          <h1 className="text-xl font-extrabold mb-2">Server gim sedang tidak aktif</h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Gim ini butuh sambungan ke server pertandingan, dan sekarang server itu tidak bisa
            dihubungi. Gim lain di Arena tetap bisa dimainkan seperti biasa.
          </p>
          <a
            href="/arena/game"
            className="mt-6 inline-block px-6 py-3 rounded-xl bg-white text-slate-900 font-bold active:scale-95 transition-transform"
          >
            Kembali ke daftar gim
          </a>
        </div>
      </div>
    );
  }

  if (room) {
    const modeInfo = GAME_MODES.find((m) => m.id === (room.gameType || selectedMode));
    const ModeIcon = modeInfo?.icon || Zap;

    return (
      <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col ${isFullscreen ? "fixed inset-0 z-[9999]" : "min-h-screen"}`}>
        {/* Exit Fullscreen Button */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all"
          >
            <Minimize size={18} />
            <span className="text-sm font-medium">Keluar Layar Penuh</span>
          </button>
        )}

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
              <h2 className="text-2xl font-bold text-white">{modeInfo?.name || "Ruangan Pertandingan"}</h2>
              <p className="text-sm text-white/50 mt-1">Bagikan kode ini ke pemain lain</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-8 px-6 mb-6">
              <p className="text-xs text-white/40 mb-2 tracking-widest uppercase">Kode Ruangan</p>
              <p className="text-5xl font-black tracking-[0.3em] text-white mb-4">{code}</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={copyCode} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl">
                  {copied ? <><Check size={16} className="text-green-400" /> Tersalin</> : <><Copy size={16} /> Salin Kode</>}
                </button>
                <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/game?code=' + code)}`, '_blank')}
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
                  <Sparkles size={18} className="inline mr-1.5" /> Mulai Pertandingkan
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-[#12101F] p-4">
      <div className="max-w-lg mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Kuis Tempur</h1>
          <p className="text-slate-500 dark:text-[#A9A6C9] mt-2">Pilih mode dan ajak temanmu bertanding!</p>
        </div>

        {isHost && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Pilih Mode Permainan</p>
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
                        : "bg-white dark:bg-[#16122A] border-slate-100 dark:border-[rgba(124,58,237,0.2)] hover:border-slate-300 dark:hover:border-violet-500/40 hover:shadow-md"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-2xl ${isSelected ? `bg-gradient-to-br ${mode.color}` : "bg-slate-100 dark:bg-slate-800"} flex items-center justify-center mx-auto mb-3 transition-all`}>
                        <div className="w-12 h-12 flex items-center justify-center">
                          {selectedMode === mode.id ? (
                            <ModeIcon size={28} className="text-white" />
                          ) : (
                            <ModeIcon size={28} className="text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                      </div>
                      <h3 className={`font-bold ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>{mode.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-[#7C7A9E] mt-1 leading-relaxed">{mode.desc}</p>
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
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-[#12101F] px-3 text-slate-400 dark:text-slate-500">atau main sendiri</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SOLO_GAMES.map((game) => {
                  const GameIcon = game.icon;
                  return (
                    <button
                      key={game.id}
                       onClick={() => router.push(`/${role === "GURU" ? "guru" : "murid"}/game/${game.id}`)}
                      className={`rounded-2xl border-2 p-4 transition-all bg-white dark:bg-[#16122A] border-slate-100 dark:border-[rgba(124,58,237,0.2)] hover:border-slate-300 dark:hover:border-violet-500/40 hover:shadow-md`}
                    >
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mx-auto mb-2`}>
                          <GameIcon size={24} className="text-white" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{game.name}</h3>
                        <p className="text-[10px] text-slate-500 dark:text-[#7C7A9E] mt-0.5 leading-relaxed">{game.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#16122A] rounded-2xl p-6 border border-slate-200 dark:border-[rgba(124,58,237,0.2)] shadow-sm">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Masuk ke Ruangan</p>
              <div className="flex gap-3">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="XXXXXX"
                  className="flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-[#1E1B3A] text-slate-900 dark:text-white placeholder-slate-400 px-4 py-3 text-center text-lg font-bold tracking-widest uppercase focus:border-violet-500 focus:outline-none"
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
