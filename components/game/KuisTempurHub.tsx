"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Gamepad2,
  Loader2,
  Search,
  Shield,
  Sparkles,
  Swords,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import KuisTempurSolo from "@/components/game/KuisTempurSolo";
import KuisTempurArena from "@/components/game/KuisTempurArena";
import GameBackButton from "@/components/game/GameBackButton";
import { gameSocket } from "@/lib/game/socket";

type AppUser = {
  id: string;
  fullName: string;
  nickname?: string | null;
  avatar?: string | null;
  level?: number;
};

type Friend = {
  id: string;
  fullName: string;
  avatar?: string | null;
  level?: number;
};

type RoomData = {
  roomId: string;
  code: string;
  name: string;
  isHost: boolean;
  player?: any;
};

type PlayerLite = {
  id: string;
  playerName: string;
  avatarUrl?: string | null;
  ready?: boolean;
  isHost?: boolean;
};

type Phase = "menu" | "friends" | "lobby" | "arena" | "solo";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase() || "?";

function Avatar({
  name,
  src,
  side = "blue",
  size = "lg",
}: {
  name: string;
  src?: string | null;
  side?: "blue" | "red" | "neutral";
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-11 w-11" : size === "md" ? "h-16 w-16" : "h-24 w-24";
  const ring =
    side === "blue"
      ? "from-cyan-300 via-blue-500 to-indigo-700"
      : side === "red"
        ? "from-orange-300 via-red-500 to-rose-800"
        : "from-slate-300 via-slate-500 to-slate-700";
  return (
    <div className={`relative ${dim} shrink-0 rounded-[28%] bg-gradient-to-br ${ring} p-[3px] shadow-[0_12px_28px_rgba(2,8,23,.28)]`}>
      <div className="h-full w-full overflow-hidden rounded-[25%] bg-slate-950/70 ring-1 ring-white/25">
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/10 text-xl font-black text-white">
            {initials(name)}
          </div>
        )}
      </div>
    </div>
  );
}

function VsStage({ me, opponent }: { me: AppUser | null; opponent?: Friend | null }) {
  const myName = me?.nickname || me?.fullName?.split(" ")[0] || "Kamu";
  const rivalName = opponent?.fullName?.split(" ")[0] || "Teman";
  return (
    <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-[#08152f] shadow-[0_28px_80px_rgba(2,8,23,.45)]">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="bg-[radial-gradient(circle_at_22%_35%,rgba(34,211,238,.45),transparent_28%),linear-gradient(135deg,#053b80,#0b68db_58%,#061a48)]" />
        <div className="bg-[radial-gradient(circle_at_78%_35%,rgba(251,146,60,.42),transparent_28%),linear-gradient(225deg,#6b0a17,#e21d3d_58%,#430610)]" />
      </div>
      <div className="absolute inset-y-[-15%] left-1/2 w-[6px] -translate-x-1/2 rotate-[9deg] bg-white shadow-[0_0_18px_7px_rgba(125,211,252,.9)]" />
      <div className="absolute inset-y-[-12%] left-1/2 w-[2px] -translate-x-1/2 rotate-[9deg] bg-cyan-200" />
      <div className="relative grid min-h-[300px] grid-cols-2 items-end px-5 pb-6 pt-7 sm:px-9">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 rounded-full border border-cyan-200/30 bg-cyan-300/15 px-3 py-1 text-[10px] font-black tracking-[.18em] text-cyan-100">
            PENANTANG
          </div>
          <Avatar name={myName} src={me?.avatar} side="blue" />
          <div className="mt-3 rounded-2xl border border-cyan-100/25 bg-blue-950/55 px-5 py-2 shadow-[0_8px_25px_rgba(0,120,255,.25)] backdrop-blur">
            <div className="flex items-center justify-center gap-1.5 text-cyan-200">
              <Crown size={13} fill="currentColor" />
              <span className="text-[10px] font-black tracking-widest">KAMU</span>
            </div>
            <div className="mt-0.5 max-w-[120px] truncate text-xl font-black text-white">{myName}</div>
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 rounded-full border border-red-200/30 bg-red-300/15 px-3 py-1 text-[10px] font-black tracking-[.18em] text-red-100">
            LAWAN
          </div>
          <Avatar name={rivalName} src={opponent?.avatar} side="red" />
          <div className="mt-3 rounded-2xl border border-red-100/25 bg-red-950/55 px-5 py-2 shadow-[0_8px_25px_rgba(255,40,80,.23)] backdrop-blur">
            <div className="flex items-center justify-center gap-1.5 text-amber-200">
              <Swords size={13} />
              <span className="text-[10px] font-black tracking-widest">RIVAL</span>
            </div>
            <div className="mt-0.5 max-w-[120px] truncate text-xl font-black text-white">{rivalName}</div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] items-center justify-center rounded-full bg-amber-300 text-[46px] font-black italic tracking-[-.12em] text-[#4a1400] shadow-[0_0_0_5px_#fff,0_0_0_10px_#f59e0b,0_18px_40px_rgba(0,0,0,.4)]">
        VS
      </div>
    </div>
  );
}

export default function KuisTempurHub() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [me, setMe] = useState<AppUser | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [search, setSearch] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const pendingInviteRef = useRef<Friend | null>(null);
  const autoJoinRef = useRef(false);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/user/me", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    const user = data?.user ?? data?.data?.user;
    if (!user?.id) return null;
    const normalized: AppUser = {
      id: String(user.id),
      fullName: String(user.fullName || "Pemain"),
      nickname: user.nickname,
      avatar: user.avatar,
      level: Number(user.level || 1),
    };
    setMe(normalized);
    return normalized;
  }, []);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await fetch("/api/game/tantang", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Gagal mengambil teman");
      setFriends(Array.isArray(data?.teman) ? data.teman : []);
    } catch (e: any) {
      setNotice(e?.message || "Daftar teman belum bisa dimuat.");
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    loadMe().then((user) => {
      if (!user || disposed) return;
      gameSocket.connect(user.id, user.nickname || user.fullName, user.avatar || undefined);
      const params = new URLSearchParams(window.location.search);
      const joinCode = String(params.get("join") || "").toUpperCase();
      if (/^[A-HJ-NP-Z2-9]{6}$/.test(joinCode) && !autoJoinRef.current) {
        autoJoinRef.current = true;
        setCreating(true);
        gameSocket.joinRoom({
          code: joinCode,
          userId: user.id,
          playerName: user.nickname || user.fullName,
          avatarUrl: user.avatar || undefined,
        });
      }
    });
    return () => {
      disposed = true;
    };
  }, [loadMe]);

  useEffect(() => {
    const stopFail = gameSocket.onGagalSambung(() => {
      setServerOffline(true);
      setCreating(false);
    });
    const stopCreated = gameSocket.onRoomCreated(async (data: RoomData) => {
      setCreating(false);
      setRoom(data);
      setPlayers(data.player ? [data.player] : []);
      setPhase("lobby");

      const friend = pendingInviteRef.current;
      if (friend) {
        pendingInviteRef.current = null;
        try {
          const res = await fetch("/api/game/kuis-tempur/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opponentId: friend.id, roomCode: data.code }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload?.error || "Tantangan gagal dikirim");
          setNotice(payload?.message || `Tantangan terkirim ke ${friend.fullName}`);
        } catch (e: any) {
          setNotice(e?.message || "Room sudah dibuat, tetapi notifikasi tantangan gagal dikirim.");
        }
      }
    });
    const stopJoined = gameSocket.onRoomJoined((data: RoomData) => {
      setCreating(false);
      setRoom(data);
      setPlayers(data.player ? [data.player] : []);
      setPhase("lobby");
      setNotice("Berhasil masuk ke arena. Bersiap untuk tempur!");
    });
    const stopPlayers = gameSocket.onPlayerList((list: PlayerLite[]) => {
      setPlayers(Array.isArray(list) ? list : []);
    });
    const stopArena = gameSocket.onArenaStart(() => setPhase("arena"));
    const stopError = gameSocket.onError((data: { message?: string }) => {
      setCreating(false);
      setNotice(data?.message || "Terjadi masalah pada arena.");
    });
    return () => {
      stopFail();
      stopCreated();
      stopJoined();
      stopPlayers();
      stopArena();
      stopError();
    };
  }, []);

  const visibleFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => friend.fullName.toLowerCase().includes(q));
  }, [friends, search]);

  const openFriends = useCallback(() => {
    setPhase("friends");
    setNotice("");
    if (!friends.length) void loadFriends();
  }, [friends.length, loadFriends]);

  const challenge = useCallback(
    (friend: Friend) => {
      if (!me || serverOffline) return;
      setSelectedFriend(friend);
      pendingInviteRef.current = friend;
      setCreating(true);
      setNotice("");
      gameSocket.createRoom({
        hostId: me.id,
        hostName: me.nickname || me.fullName,
        hostAvatar: me.avatar || undefined,
        name: `Kuis Tempur: ${me.nickname || me.fullName} vs ${friend.fullName}`,
        gameType: "KUIS_BATTLE",
        category: "KUIS_TEMPUR_ARENA",
        difficulty: "MEDIUM",
        questionCount: 20,
        timePerQuestion: 15,
      });
    },
    [me, serverOffline]
  );

  const leaveLobby = useCallback(() => {
    if (room && me) gameSocket.leaveRoom({ code: room.code, userId: me.id });
    setRoom(null);
    setPlayers([]);
    setSelectedFriend(null);
    setNotice("");
    setPhase("menu");
  }, [room, me]);

  const startArena = useCallback(() => {
    if (!room?.code) return;
    gameSocket.startGame({ code: room.code });
  }, [room]);

  const copyCode = useCallback(async () => {
    if (!room?.code) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }, [room]);

  if (phase === "solo") {
    return <KuisTempurSolo backHref="/arena/game/kuis-tempur" />;
  }

  if (phase === "arena" && room && me) {
    return (
      <KuisTempurArena
        code={room.code}
        userId={me.id}
        userName={me.nickname || me.fullName}
        onExit={leaveLobby}
      />
    );
  }

  if (phase === "friends") {
    return (
      <main className="game-env game-env-kuis min-h-screen overflow-x-hidden bg-[#050b1b] text-white">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_12%,rgba(14,165,233,.23),transparent_26%),radial-gradient(circle_at_85%_16%,rgba(244,63,94,.2),transparent_26%),linear-gradient(180deg,#07132b,#050814_72%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-5 sm:px-6">
          <button
            onClick={() => setPhase("menu")}
            className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-black text-white/85 backdrop-blur transition hover:bg-white/12"
          >
            <ArrowLeft size={17} /> Kembali
          </button>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black tracking-[.18em] text-cyan-200">
              <Users size={14} /> TEMAN SEKELAS
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Pilih rivalmu.</h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">
              Tantangan dikirim langsung ke notifikasi teman. Begitu diterima, kalian masuk ke arena yang sama bersama bot.
            </p>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama teman..."
              className="w-full rounded-2xl border border-white/12 bg-white/8 py-3.5 pl-11 pr-4 font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
            />
          </div>

          {notice && (
            <div className="mb-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
              {notice}
            </div>
          )}

          {loadingFriends ? (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="animate-spin text-cyan-300" size={30} />
            </div>
          ) : visibleFriends.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleFriends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => challenge(friend)}
                  disabled={creating || serverOffline}
                  className="group flex items-center gap-4 rounded-[24px] border border-white/12 bg-white/[.07] p-4 text-left shadow-[0_12px_35px_rgba(0,0,0,.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-white/[.1] disabled:opacity-50"
                >
                  <Avatar name={friend.fullName} src={friend.avatar} side="red" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-black">{friend.fullName}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Shield size={13} /> Level {friend.level || 1}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-600 shadow-lg shadow-rose-950/30 transition group-hover:scale-105">
                    {creating && selectedFriend?.id === friend.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Swords size={18} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[.05] p-8 text-center">
              <Users className="mx-auto text-slate-500" size={34} />
              <h2 className="mt-3 font-black">Belum ada teman yang bisa ditantang</h2>
              <p className="mt-1 text-sm text-slate-400">Teman muncul dari kelas BahasaCerdas yang sama.</p>
            </div>
          )}

          {serverOffline && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4">
              <WifiOff className="mt-0.5 shrink-0 text-rose-300" size={18} />
              <div>
                <div className="font-black text-rose-100">Server realtime belum tersambung</div>
                <div className="mt-1 text-xs font-semibold leading-5 text-rose-100/70">
                  Mode Lawan Bot tetap bisa dimainkan. Tantang Teman akan aktif lagi saat server pertandingan tersedia.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (phase === "lobby" && room) {
    const humanCount = players.length;
    const opponent = players.find((p) => p.id !== me?.id);
    const host = players.find((p) => p.isHost);
    const canStart = Boolean(room.isHost && humanCount >= 2);
    return (
      <main className="game-env game-env-kuis min-h-screen overflow-x-hidden bg-[#040914] text-white">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_12%,rgba(14,165,233,.22),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(244,63,94,.22),transparent_28%),linear-gradient(180deg,#07152d,#040914_70%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={leaveLobby}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-black text-white/80"
            >
              <ArrowLeft size={17} /> Keluar
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-200">
              <Wifi size={14} /> ARENA ONLINE
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
            <section>
              <div className="mb-4">
                <div className="text-xs font-black tracking-[.22em] text-cyan-300">KUIS TEMPUR // LOBBY</div>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Bersiap untuk duel.</h1>
              </div>

              <VsStage
                me={me}
                opponent={
                  opponent
                    ? {
                        id: opponent.id,
                        fullName: opponent.playerName,
                        avatar: opponent.avatarUrl,
                      }
                    : selectedFriend
                }
              />

              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Raka BOT", "Sari BOT", "Bima BOT"].map((name, index) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-white/[.06] p-3 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-900">
                      <Bot size={18} />
                    </div>
                    <div className="mt-2 truncate text-xs font-black">{name}</div>
                    <div className="mt-0.5 text-[9px] font-black tracking-widest text-amber-300">AI ARENA</div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-[30px] border border-white/12 bg-white/[.07] p-5 shadow-[0_20px_55px_rgba(0,0,0,.25)] backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-black tracking-[.2em] text-slate-400">
                <Gamepad2 size={15} /> MATCH ROOM
              </div>
              <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4 text-center">
                <div className="text-[10px] font-black tracking-[.2em] text-cyan-200/70">KODE ARENA</div>
                <div className="mt-1 text-4xl font-black tracking-[.2em] text-white">{room.code}</div>
                <button onClick={copyCode} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white/80">
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Tersalin" : "Salin kode"}
                </button>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-black">
                  <span className="text-slate-400">PEMAIN</span>
                  <span>{humanCount}/2 manusia</span>
                </div>
                <div className="space-y-2">
                  {[0, 1].map((slot) => {
                    const p = players[slot];
                    return p ? (
                      <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                        <Avatar name={p.playerName} src={p.avatarUrl} side={slot === 0 ? "blue" : "red"} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black">{p.playerName}</div>
                          <div className="mt-0.5 text-[10px] font-bold text-emerald-300">{p.isHost ? "HOST · SIAP" : "TERHUBUNG · SIAP"}</div>
                        </div>
                        <Check size={17} className="text-emerald-300" />
                      </div>
                    ) : (
                      <div key={slot} className="flex items-center gap-3 rounded-2xl border border-dashed border-white/12 bg-white/[.03] p-3 text-slate-500">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-white/15">
                          <Users size={17} />
                        </div>
                        <div>
                          <div className="text-sm font-black">Menunggu lawan...</div>
                          <div className="text-[10px] font-bold">Tantangan sudah dikirim</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[.07] p-3 text-xs font-semibold leading-5 text-amber-50/80">
                Jawab benar untuk mendapatkan amunisi. Gunakan map untuk berlindung, incar lawan atau bot, dan rebut skor tertinggi sebelum waktu habis.
              </div>

              {notice && <div className="mt-3 text-center text-xs font-bold text-cyan-200">{notice}</div>}

              {room.isHost ? (
                <button
                  onClick={startArena}
                  disabled={!canStart}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 py-4 text-base font-black text-[#2c0d00] shadow-[0_12px_35px_rgba(251,146,60,.32)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-40"
                >
                  <Zap size={19} fill="currentColor" />
                  {canStart ? "MULAI PERTEMPURAN" : "MENUNGGU TEMAN"}
                </button>
              ) : (
                <div className="mt-5 rounded-2xl bg-white/8 p-4 text-center">
                  <Loader2 className="mx-auto animate-spin text-cyan-300" size={21} />
                  <div className="mt-2 text-sm font-black">Menunggu {host?.playerName || "host"} memulai...</div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="game-env game-env-kuis min-h-screen overflow-x-hidden bg-[#050914] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_17%_9%,rgba(14,165,233,.26),transparent_26%),radial-gradient(circle_at_84%_12%,rgba(244,63,94,.22),transparent_27%),linear-gradient(180deg,#071630,#050914_68%)]" />
      <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <GameBackButton href="/arena/game" label="Arena" title="Kembali ke Arena" />
          <div className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-black tracking-[.18em] text-slate-300">
            KUIS TEMPUR 2.0
          </div>
        </div>

        <section className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-xs font-black tracking-[.16em] text-amber-200">
            <Sparkles size={14} /> JAWAB · DAPAT AMUNISI · BERTAHAN
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-6xl">
            Kuis <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">Tempur</span>
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
            Pengetahuan adalah senjatamu. Main sendiri melawan bot atau tantang teman sekelas masuk ke arena yang sama.
          </p>
        </section>

        <div className="mx-auto mt-7 max-w-3xl">
          <VsStage me={me} opponent={null} />
        </div>

        <section className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
          <button
            onClick={() => setPhase("solo")}
            className="group relative overflow-hidden rounded-[28px] border border-cyan-300/20 bg-gradient-to-br from-[#0c3f86] to-[#071c45] p-5 text-left shadow-[0_18px_45px_rgba(0,116,255,.18)] transition hover:-translate-y-1"
          >
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg">
                  <Bot size={28} className="text-cyan-200" />
                </div>
                <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[9px] font-black tracking-widest text-emerald-200">LANGSUNG MAIN</span>
              </div>
              <h2 className="mt-5 text-2xl font-black">Lawan Bot</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-100/70">
                Masuk ke Kampung Kata, jawab soal, kumpulkan peluru, dan kalahkan gelombang bot.
              </p>
              <div className="mt-5 flex items-center gap-2 font-black text-cyan-200">
                MAIN SEKARANG <ChevronRight size={18} className="transition group-hover:translate-x-1" />
              </div>
            </div>
          </button>

          <button
            onClick={openFriends}
            className="group relative overflow-hidden rounded-[28px] border border-rose-300/20 bg-gradient-to-br from-[#89172d] to-[#430a17] p-5 text-left shadow-[0_18px_45px_rgba(244,63,94,.18)] transition hover:-translate-y-1"
          >
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-300/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg">
                  <Swords size={28} className="text-orange-200" />
                </div>
                <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-[9px] font-black tracking-widest text-amber-200">REALTIME</span>
              </div>
              <h2 className="mt-5 text-2xl font-black">Tantang Teman</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-rose-100/70">
                Pilih teman sekelas, kirim tantangan, lalu bertarung bersama bot dalam arena yang sama.
              </p>
              <div className="mt-5 flex items-center gap-2 font-black text-orange-200">
                PILIH TEMAN <ChevronRight size={18} className="transition group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        </section>

        <section className="mx-auto mt-5 grid max-w-3xl grid-cols-3 gap-2 rounded-[26px] border border-white/10 bg-white/[.05] p-3 backdrop-blur">
          {[
            ["1", "Jawab", "Dapat amunisi"],
            ["2", "Bertempur", "Bidik rival & bot"],
            ["3", "Menang", "Rebut skor tertinggi"],
          ].map(([n, title, desc]) => (
            <div key={n} className="rounded-2xl p-3 text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-amber-200">{n}</div>
              <div className="mt-2 text-xs font-black sm:text-sm">{title}</div>
              <div className="mt-0.5 text-[9px] font-semibold leading-4 text-slate-500 sm:text-[10px]">{desc}</div>
            </div>
          ))}
        </section>

        {serverOffline && (
          <div className="mx-auto mt-4 flex max-w-3xl items-start gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/[.08] p-4">
            <WifiOff className="mt-0.5 shrink-0 text-rose-300" size={18} />
            <div className="text-xs font-semibold leading-5 text-rose-50/70">
              Server realtime sedang tidak terjangkau. <b className="text-rose-100">Lawan Bot tetap aktif</b>; Tantang Teman akan tersedia setelah koneksi kembali.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
