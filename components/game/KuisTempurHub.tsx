"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronLeft,
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
import KuisTempurCharacterPortrait from "@/components/game/KuisTempurCharacterPortrait";
import KuisTempurSolo from "@/components/game/KuisTempurSolo";
import KuisTempurArena from "@/components/game/KuisTempurArena";
import { KuisTempurDisplayChoice, type KuisTempurDisplayMode } from "@/components/game/KuisTempurDisplayShell";
import GameBackButton from "@/components/game/GameBackButton";
import { gameSocket } from "@/lib/game/socket";
import {
  DEFAULT_KUIS_TEMPUR_CHARACTER_ID,
  KUIS_TEMPUR_PLAYABLE_CHARACTERS,
  getKuisTempurCharacter,
  normalizeKuisTempurCharacterId,
  type KuisTempurCharacterId,
} from "@/lib/game/kuis-tempur-characters";

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
  matchmaking?: "PUBLIC" | "PRIVATE";
  player?: any;
};

type PlayerLite = {
  id: string;
  playerName: string;
  avatarUrl?: string | null;
  characterId?: KuisTempurCharacterId | string;
  ready?: boolean;
  connected?: boolean;
  isHost?: boolean;
};

type EntryMode = "quick" | "private";
type Phase = "menu" | "setup" | "friends" | "lobby" | "arena" | "solo";

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
          // Avatar URLs can come from multiple user/profile providers; keep native img
          // here instead of forcing a brittle Next Image remote-host allowlist.
          // eslint-disable-next-line @next/next/no-img-element
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
        LAWAN
      </div>
    </div>
  );
}

export default function KuisTempurHub() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
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
  const [copiedKind, setCopiedKind] = useState<"code" | "link" | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [matchCountdown, setMatchCountdown] = useState<number | null>(null);
  const [displayChoiceOpen, setDisplayChoiceOpen] = useState(false);
  const [pendingArenaStart, setPendingArenaStart] = useState(false);
  const [preferredDisplayMode, setPreferredDisplayMode] = useState<KuisTempurDisplayMode>("normal");
  const [selectedCharacterId, setSelectedCharacterId] = useState<KuisTempurCharacterId>(
    DEFAULT_KUIS_TEMPUR_CHARACTER_ID
  );
  const pendingInviteRef = useRef<Friend | null>(null);
  const autoJoinRef = useRef(false);
  const displayReadyRef = useRef(false);

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
      const rememberedCharacterId = normalizeKuisTempurCharacterId(
        window.localStorage.getItem("kuis-tempur-character")
      );
      setSelectedCharacterId(rememberedCharacterId);
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
          characterId: rememberedCharacterId,
        });
      }
    }).catch(() => {
      if (!disposed) setNotice("Gagal memuat profil murid. Periksa koneksi dan muat ulang halaman.");
    });
    return () => {
      disposed = true;
    };
  }, [loadMe]);

  useEffect(() => {
    const stopFail = gameSocket.onGagalSambung(() => {
      setServerOffline(true);
      setCreating(false);
      setNotice("Koneksi terputus. Periksa internet, lalu tunggu sambungan pulih.");
    });
    const stopConnected = gameSocket.onConnected(() => {
      setServerOffline(false);
      setNotice((current) => current.startsWith("Koneksi terputus") ? "Koneksi pulih. Memulihkan ruang bermain..." : current);
    });
    const stopDisconnected = gameSocket.onDisconnected(() => {
      setServerOffline(true);
      setNotice("Koneksi terputus. Sedang menyambung kembali...");
    });
    const stopCreated = gameSocket.onRoomCreated(async (data: RoomData) => {
      setCreating(false);
      setRoom(data);
      setPlayers(data.player ? [data.player] : []);
      const serverCharacterId = normalizeKuisTempurCharacterId(data.player?.characterId);
      setSelectedCharacterId(serverCharacterId);
      window.localStorage.setItem("kuis-tempur-character", serverCharacterId);
      setMatchCountdown(null);
      if (!displayReadyRef.current) setDisplayChoiceOpen(true);
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
          setNotice(e?.message || "Ruang sudah dibuat, tetapi notifikasi tantangan gagal dikirim.");
        }
      }
    });
    const stopJoined = gameSocket.onRoomJoined((data: RoomData) => {
      setCreating(false);
      setRoom(data);
      setPlayers(data.player ? [data.player] : []);
      const serverCharacterId = normalizeKuisTempurCharacterId(data.player?.characterId);
      setSelectedCharacterId(serverCharacterId);
      window.localStorage.setItem("kuis-tempur-character", serverCharacterId);
      setMatchCountdown(null);
      if (!displayReadyRef.current) setDisplayChoiceOpen(true);
      setPhase((current) => current === "arena" ? current : "lobby");
      setNotice("Berhasil bergabung. Bersiap untuk bertempur!");
    });
    const stopPlayers = gameSocket.onPlayerList((list: PlayerLite[]) => {
      const nextPlayers = Array.isArray(list) ? list : [];
      setPlayers(nextPlayers);
     });
    const stopHostChanged = gameSocket.onHostChanged((data: { newHostId: string }) => {
      setRoom((current) =>
        current
          ? {
              ...current,
              isHost: current.player?.id === data.newHostId,
            }
          : current
      );
      setPlayers((current) =>
        current.map((player) => ({
          ...player,
          isHost: player.id === data.newHostId,
        }))
      );
      setNotice((current) => current || "Host arena berpindah. Pertandingan tetap bisa dilanjutkan.");
    });
    const stopCountdown = gameSocket.onMatchCountdown(({ seconds }) => {
      setMatchCountdown(seconds >= 0 ? seconds : null);
    });
    const stopArena = gameSocket.onArenaStart(() => {
      if (displayReadyRef.current) {
        setPendingArenaStart(false);
        setPhase("arena");
        return;
      }
      setPendingArenaStart(true);
      setDisplayChoiceOpen(true);
    });
    const stopError = gameSocket.onError((data: { message?: string }) => {
      setCreating(false);
      setNotice(data?.message || "Terjadi masalah pada arena.");
    });
    return () => {
      stopFail();
      stopConnected();
      stopDisconnected();
      stopCreated();
      stopJoined();
      stopPlayers();
      stopHostChanged();
      stopCountdown();
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
        name: `Kuis Tempur · Room ${me.nickname || me.fullName}`,
        gameType: "KUIS_BATTLE",
        category: "KUIS_TEMPUR_ARENA",
        difficulty: "MEDIUM",
        questionCount: 20,
        timePerQuestion: 15,
        characterId: selectedCharacterId,
      });
    },
    [me, selectedCharacterId, serverOffline]
  );

  const joinPrivateRoom = useCallback(() => {
    if (!me || serverOffline || creating) return;
    const code = joinCodeInput.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "");
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      setNotice("Masukkan kode ruang 6 karakter yang valid.");
      return;
    }
    setCreating(true);
    setNotice("Menghubungkan ke room " + code + "...");
    gameSocket.joinRoom({
      code,
      userId: me.id,
      playerName: me.nickname || me.fullName,
      avatarUrl: me.avatar || undefined,
      characterId: selectedCharacterId,
    });
  }, [me, serverOffline, creating, joinCodeInput, selectedCharacterId]);

  const quickMatch = useCallback(() => {
    if (!me || serverOffline || creating) return;
    setCreating(true);
    setNotice("Mencari arena publik...");
    gameSocket.joinQueue({
      userId: me.id,
      userName: me.nickname || me.fullName,
      avatarUrl: me.avatar || undefined,
      gameType: "KUIS_TEMPUR_ARENA",
      characterId: selectedCharacterId,
    });
  }, [creating, me, selectedCharacterId, serverOffline]);

  const createPrivateRoom = useCallback(() => {
    if (!me || serverOffline || creating) return;
    setCreating(true);
    setNotice("");
    gameSocket.createRoom({
      hostId: me.id,
      hostName: me.nickname || me.fullName,
      hostAvatar: me.avatar || undefined,
      name: `Ruang Privat · ${me.nickname || me.fullName}`,
      gameType: "KUIS_BATTLE",
      category: "KUIS_TEMPUR_ARENA",
      difficulty: "MEDIUM",
      questionCount: 20,
      timePerQuestion: 15,
      characterId: selectedCharacterId,
    });
  }, [creating, me, selectedCharacterId, serverOffline]);

  const openMultiplayerSetup = useCallback((mode: EntryMode) => {
    if (!me || serverOffline || creating) return;
    displayReadyRef.current = false;
    setDisplayChoiceOpen(false);
    setPendingArenaStart(false);
    setEntryMode(mode);
    setNotice("");
    setPhase("setup");
  }, [creating, me, serverOffline]);

  const chooseMultiplayerDisplay = useCallback((mode: KuisTempurDisplayMode) => {
    displayReadyRef.current = true;
    setPreferredDisplayMode(mode);
    setDisplayChoiceOpen(false);

    if (phase === "setup" && entryMode) {
      if (entryMode === "quick") quickMatch();
      else createPrivateRoom();
      return;
    }

    if (pendingArenaStart) {
      setPendingArenaStart(false);
      setPhase("arena");
    }
  }, [createPrivateRoom, entryMode, pendingArenaStart, phase, quickMatch]);

  const selectCharacter = useCallback(
    (characterId: KuisTempurCharacterId) => {
      setSelectedCharacterId(characterId);
      window.localStorage.setItem("kuis-tempur-character", characterId);
      if (phase === "lobby" && room?.code && me?.id) {
        gameSocket.arenaSelectCharacter({
          code: room.code,
          userId: me.id,
          characterId,
        });
      }
    },
    [me?.id, phase, room?.code]
  );

  const leaveLobby = useCallback(() => {
    if (room && me) gameSocket.leaveRoom({ code: room.code, userId: me.id });
    setRoom(null);
    setPlayers([]);
    setSelectedFriend(null);
    setNotice("");
    setMatchCountdown(null);
    setPendingArenaStart(false);
    setDisplayChoiceOpen(false);
    setEntryMode(null);
    displayReadyRef.current = false;
    setPhase("menu");
  }, [room, me]);

  const startArena = useCallback(() => {
    if (!room?.code) return;
    gameSocket.startGame({ code: room.code });
  }, [room]);

  const copyCode = useCallback(async (asLink = true) => {
    if (!room?.code) return;
    try {
      const joinUrl = `${window.location.origin}/arena/game/kuis-tempur?join=${room.code}`;
      await navigator.clipboard.writeText(asLink ? joinUrl : room.code);
      setCopiedKind(asLink ? "link" : "code");
      setTimeout(() => setCopiedKind(null), 1600);
    } catch {
      setNotice("Gagal menyalin. Salin kode ruang secara manual.");
    }
  }, [room]);

  if (phase === "setup" && entryMode) {
    const selectedCharacter = getKuisTempurCharacter(selectedCharacterId);
    const selectedIndex = KUIS_TEMPUR_PLAYABLE_CHARACTERS.findIndex(
      (character) => character.id === selectedCharacterId
    );
    const cycleCharacter = (direction: -1 | 1) => {
      const nextIndex =
        (selectedIndex + direction + KUIS_TEMPUR_PLAYABLE_CHARACTERS.length) %
        KUIS_TEMPUR_PLAYABLE_CHARACTERS.length;
      selectCharacter(KUIS_TEMPUR_PLAYABLE_CHARACTERS[nextIndex].id);
    };
    const modeTitle = entryMode === "quick" ? "MAIN CEPAT" : "RUANG PRIVAT";
    const modeHint =
      entryMode === "quick"
        ? "Sesudah memilih tampilan, server langsung mencarikan arena publik 2–10 pemain."
        : "Sesudah memilih tampilan, room berkode akan dibuat untuk teman atau kelas.";

    return (
      <main className="game-env game-env-kuis min-h-screen overflow-x-hidden bg-[#040914] text-white">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,.24),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,.19),transparent_28%),linear-gradient(180deg,#08162f,#040914_72%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-8 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (creating) return;
                setEntryMode(null);
                setDisplayChoiceOpen(false);
                displayReadyRef.current = false;
                setPhase("menu");
              }}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-black text-white/80 disabled:opacity-40"
            >
              <ArrowLeft size={17} /> Kembali
            </button>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black tracking-[.18em] text-cyan-200">
              {modeTitle}
            </div>
          </div>

          <section className="mx-auto mt-5 grid w-full max-w-4xl flex-1 items-center gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,.22),transparent_31%),linear-gradient(180deg,#0b2347,#071126)] p-5 shadow-[0_28px_80px_rgba(0,0,0,.34)]">
              <div className="text-center">
                <div className="text-[10px] font-black tracking-[.22em] text-cyan-300">PILIH PETARUNG</div>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Siapa yang turun ke Kampung Kata?</h1>
                <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">
                  Semua karakter punya statistik yang setara. Pilih gaya yang paling kamu suka.
                </p>
              </div>

              <div className="relative mt-4 flex min-h-[285px] items-center justify-center">
                <button
                  type="button"
                  onClick={() => cycleCharacter(-1)}
                  className="absolute left-1 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/55 text-white backdrop-blur transition hover:bg-white/10"
                  aria-label="Karakter sebelumnya"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex flex-col items-center">
                  <KuisTempurCharacterPortrait characterId={selectedCharacterId} hero />
                  <div className="-mt-3 rounded-2xl border border-cyan-200/20 bg-slate-950/70 px-5 py-2 text-center shadow-xl backdrop-blur">
                    <div className="text-xl font-black">{selectedCharacter.name}</div>
                    <div className="mt-0.5 text-[9px] font-black tracking-[.18em] text-cyan-300">KEMAMPUAN SETARA · TAMPILAN SAJA</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cycleCharacter(1)}
                  className="absolute right-1 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/55 text-white backdrop-blur transition hover:bg-white/10"
                  aria-label="Karakter berikutnya"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>

            <div className="flex h-full flex-col rounded-[34px] border border-white/12 bg-white/[.055] p-5 shadow-[0_28px_80px_rgba(0,0,0,.24)] backdrop-blur">
              <div>
                <div className="text-[10px] font-black tracking-[.22em] text-slate-500">{KUIS_TEMPUR_PLAYABLE_CHARACTERS.length} TOKOH PILIHAN</div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {KUIS_TEMPUR_PLAYABLE_CHARACTERS.map((character) => {
                    const active = character.id === selectedCharacterId;
                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => selectCharacter(character.id)}
                        className={`rounded-2xl border p-2 transition ${
                          active
                            ? "border-cyan-300/55 bg-cyan-300/12 shadow-[0_0_0_1px_rgba(103,232,249,.15)]"
                            : "border-white/10 bg-white/[.035] hover:border-white/25 hover:bg-white/[.07]"
                        }`}
                      >
                        <div className="flex justify-center">
                          <KuisTempurCharacterPortrait characterId={character.id} compact />
                        </div>
                        <div className={`mt-1 truncate text-[9px] font-black ${active ? "text-cyan-100" : "text-slate-500"}`}>
                          {character.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  {entryMode === "quick" ? <Zap size={15} className="text-amber-300" /> : <Shield size={15} className="text-violet-300" />}
                  {modeTitle}
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">{modeHint}</p>
              </div>

              {notice && (
                <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.07] px-4 py-3 text-center text-xs font-bold text-amber-100">
                  {notice}
                </div>
              )}

              <button
                onClick={() => setDisplayChoiceOpen(true)}
                disabled={creating || serverOffline}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 px-5 py-4 text-base font-black text-[#2c0d00] shadow-[0_16px_38px_rgba(244,63,94,.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
              >
                {creating ? <Loader2 size={19} className="animate-spin" /> : <Gamepad2 size={19} />}
                {creating
                  ? entryMode === "quick"
                    ? "MENCARI ARENA..."
                    : "MEMBUAT RUANG..."
                  : "LANJUT PILIH TAMPILAN"}
              </button>
            </div>
          </section>
        </div>

        {displayChoiceOpen && (
          <KuisTempurDisplayChoice
            title="Pilih tampilan sebelum bertempur"
            onChoose={chooseMultiplayerDisplay}
          />
        )}
      </main>
    );
  }

  if (phase === "solo") {
    return <KuisTempurSolo backHref="/arena/game/kuis-tempur" />;
  }

  if (phase === "arena" && room && me) {
    return (
      <KuisTempurArena
        code={room.code}
        userId={me.id}
        onExit={leaveLobby}
        preferredDisplayMode={preferredDisplayMode}
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
              Undang satu teman untuk membuka room, lalu bagikan kode arena. Maksimal 10 murid dapat bertempur bersama secara realtime.
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
    const host = players.find((p) => p.isHost);
    const isPublicRoom = room.matchmaking === "PUBLIC";
    const canStart = Boolean(!isPublicRoom && room.isHost && humanCount >= 2);
    const selectedCharacter = getKuisTempurCharacter(selectedCharacterId);
    const selectedIndex = KUIS_TEMPUR_PLAYABLE_CHARACTERS.findIndex(
      (character) => character.id === selectedCharacterId
    );
    const cycleCharacter = (direction: -1 | 1) => {
      const nextIndex =
        (selectedIndex + direction + KUIS_TEMPUR_PLAYABLE_CHARACTERS.length) %
        KUIS_TEMPUR_PLAYABLE_CHARACTERS.length;
      selectCharacter(KUIS_TEMPUR_PLAYABLE_CHARACTERS[nextIndex].id);
    };
    const slots = Array.from({ length: 10 }, (_, index) => players[index] || null);

    return (
      <main className="game-env game-env-kuis min-h-screen overflow-x-hidden bg-[#040914] text-white">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_12%,rgba(14,165,233,.22),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(244,63,94,.22),transparent_28%),linear-gradient(180deg,#07152d,#040914_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6">
          <header className="mb-5 rounded-[26px] border border-white/10 bg-[#0b1932]/90 p-3 shadow-[0_18px_48px_rgba(0,0,0,.23)] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={leaveLobby}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-slate-100 transition hover:border-cyan-300/50 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                  aria-label="Keluar dari lobi"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/30 bg-gradient-to-br from-amber-400/25 to-orange-600/20 text-amber-200">
                  <Swords size={22} />
                </div>
                <div>
                  <div className="text-[9px] font-black tracking-[.24em] text-amber-200/80">KUIS TEMPUR · KAMPUNG KATA</div>
                  <h1 className="mt-0.5 text-lg font-black leading-none tracking-tight sm:text-2xl">Markas Persiapan</h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-[10px] font-black tracking-wider text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.75)]" />
                  <Wifi size={13} /> TERHUBUNG
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black tracking-wider text-white">
                  {isPublicRoom ? "MAIN CEPAT" : "RUANG PRIVAT"} · {humanCount}/10
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/10 pt-3 sm:gap-3">
              {[
                { step: "01", title: "Pilih Petarung", complete: true },
                { step: "02", title: isPublicRoom ? "Cari Lawan" : "Undang Teman", complete: humanCount >= (isPublicRoom ? 1 : 2) },
                { step: "03", title: "Masuk Arena", complete: false },
              ].map(({ step, title, complete }) => (
                <div key={step} className={`flex items-center gap-2 rounded-xl border px-2 py-2 sm:px-3 ${complete ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[.035] text-slate-400"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${complete ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                    {complete ? <Check size={13} strokeWidth={3} /> : step}
                  </span>
                  <span className="truncate text-[9px] font-black uppercase tracking-wider sm:text-xs">{title}</span>
                </div>
              ))}
            </div>
          </header>

          <div className="kt-lobby-layout grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="overflow-hidden rounded-[30px] border border-cyan-100/15 bg-[#061225] shadow-[0_25px_65px_rgba(0,0,0,.4)]">
              <style jsx>{`
                @keyframes ktCharacterIn {
                  0% { opacity: 0; transform: translateY(18px) scale(.94); filter: blur(6px); }
                  70% { opacity: 1; transform: translateY(-4px) scale(1.02); filter: blur(0); }
                  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                @keyframes ktStagePulse {
                  0%,100% { opacity:.3; transform:scale(.96); }
                  50% { opacity:.62; transform:scale(1.06); }
                }
                .kt-character-enter { animation: ktCharacterIn .28s cubic-bezier(.2,.8,.2,1); }
                .kt-stage-pulse { animation: ktStagePulse 2.4s ease-in-out infinite; }
                .kt-roster-scroll { scrollbar-width:none; }
                .kt-roster-scroll::-webkit-scrollbar { display:none; }
                @media (max-height: 520px) and (orientation: landscape) {
                  .kt-lobby-layout {
                    grid-template-columns: minmax(0,1fr) 250px !important;
                    gap: .75rem !important;
                  }
                  .kt-lobby-stage {
                    min-height: 228px !important;
                    padding-top: .65rem !important;
                    padding-bottom: .35rem !important;
                  }
                  .kt-lobby-title {
                    font-size: 1.15rem !important;
                    line-height: 1.25rem !important;
                    white-space: nowrap;
                  }
                  .kt-lobby-equal {
                    padding: .35rem .55rem !important;
                    font-size: .45rem !important;
                    white-space: nowrap;
                  }
                  .kt-lobby-stage-inner {
                    min-height: 158px !important;
                  }
                  .kt-lobby-hero-wrap {
                    transform: scale(.58);
                    transform-origin: center center;
                    margin-top: -36px;
                    margin-bottom: -78px;
                  }
                  .kt-selected-pill {
                    margin-top: -1.7rem !important;
                  }
                  .kt-lobby-stats {
                    display: none !important;
                  }
                  .kt-room-panel {
                    padding: .8rem !important;
                    border-radius: 22px !important;
                  }
                }
                @media (prefers-reduced-motion: reduce) {
                  .kt-character-enter,.kt-stage-pulse { animation:none!important; }
                }
              `}</style>

              <div className="kt-lobby-stage relative min-h-[420px] overflow-hidden border-b border-amber-200/15 bg-[#08172b] px-4 pb-5 pt-5 sm:px-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: 'url("/game/kuis-tempur/assets/world/base/arena_base_01.png")',
                    backgroundPosition: "center 57%",
                    backgroundSize: "cover",
                    imageRendering: "pixelated",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,13,31,.92)_0%,rgba(7,19,38,.6)_39%,rgba(6,13,30,.75)_100%)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,.24),transparent_65%)]" />
                <div className="kt-stage-pulse pointer-events-none absolute bottom-[70px] left-1/2 h-28 w-80 -translate-x-1/2 rounded-[50%] border border-amber-200/30 bg-amber-300/10 blur-[1px]" />
                <div className="pointer-events-none absolute bottom-[90px] left-1/2 h-16 w-56 -translate-x-1/2 rounded-[50%] bg-amber-200/15 blur-xl" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />

                <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-200/10 px-3 py-1.5 text-[10px] font-black tracking-[.22em] text-amber-200"><Sparkles size={12} /> PILIH PETARUNGMU</div>
                    <h1 className="kt-lobby-title mt-1 text-2xl font-black tracking-tight sm:text-4xl">
                      Pilih jagoanmu!
                    </h1>
                  </div>
                  <div className="kt-lobby-equal rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[9px] font-black tracking-[.16em] text-emerald-200">
                    <Shield size={12} className="inline-block -mt-0.5 mr-1" /> SEMUA STAT SETARA
                  </div>
                </div>

                <div className="kt-lobby-stage-inner relative z-10 mt-0 flex min-h-[290px] items-center justify-center">
                  <button
                    onClick={() => cycleCharacter(-1)}
                    className="absolute left-0 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100/25 bg-slate-950/75 text-amber-100 shadow-lg backdrop-blur transition hover:scale-105 hover:border-amber-200/55 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:left-4"
                    aria-label="Karakter sebelumnya"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <div className="kt-lobby-hero-wrap relative flex flex-col items-center text-center">
                    <div className="pointer-events-none absolute left-1/2 top-[37%] h-56 w-56 -translate-x-1/2 rounded-full border border-amber-300/20 bg-[radial-gradient(circle,rgba(251,191,36,.1),transparent_70%)] shadow-[0_0_55px_rgba(245,158,11,.12)] sm:h-64 sm:w-64" />
                    <div key={selectedCharacter.id} className="kt-character-enter relative">
                      <div
                        className="pointer-events-none absolute inset-x-[-40px] bottom-2 top-20 rounded-full opacity-50 blur-3xl"
                        style={{ backgroundColor: selectedCharacter.accent }}
                      />
                      <KuisTempurCharacterPortrait characterId={selectedCharacter.id} hero />
                    </div>

                    <div className="kt-selected-pill -mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-slate-950/85 px-4 py-1.5 text-[9px] font-black tracking-[.18em] text-amber-200 backdrop-blur">
                      <Check size={12} /> KARAKTER TERPILIH
                    </div>
                    <div className="mt-1.5 text-3xl font-black tracking-[-.03em] text-white sm:text-4xl">
                      {selectedCharacter.name}
                    </div>
                    <div className="mt-1 text-xs font-black tracking-[.16em] text-slate-400">
                      {selectedCharacter.role.toUpperCase()}
                    </div>
                    <div className="kt-lobby-stats mt-2.5 flex flex-wrap justify-center gap-2 text-[9px] font-black tracking-wider">
                      <span className="rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1.5 text-cyan-100">
                        NYAWA SETARA
                      </span>
                      <span className="rounded-full border border-amber-200/15 bg-amber-300/10 px-3 py-1.5 text-amber-100">
                        SERANGAN SETARA
                      </span>
                      <span className="rounded-full border border-violet-200/15 bg-violet-300/10 px-3 py-1.5 text-violet-100">
                        KECEPATAN SETARA
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => cycleCharacter(1)}
                    className="absolute right-0 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100/25 bg-slate-950/75 text-amber-100 shadow-lg backdrop-blur transition hover:scale-105 hover:border-amber-200/55 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:right-4"
                    aria-label="Karakter berikutnya"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              <div className="bg-[linear-gradient(180deg,#0c1b35,#06101f)] px-3 pb-4 pt-4 sm:px-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-amber-200"><Crown size={13} /> ROSTER KARAKTER</div>
                  <div className="text-[9px] font-bold text-slate-600">Klik atau swipe untuk ganti</div>
                </div>

                <div className="kt-roster-scroll flex snap-x gap-2 overflow-x-auto pb-1">
                  {KUIS_TEMPUR_PLAYABLE_CHARACTERS.map((character) => {
                    const active = character.id === selectedCharacterId;
                    return (
                      <button
                        key={character.id}
                        onClick={() => selectCharacter(character.id)}
                        className={`group relative min-w-[82px] snap-center rounded-[18px] border px-2 py-2 text-center transition-all duration-200 sm:min-w-[92px] ${
                          active
                            ? "border-amber-300/65 bg-amber-300/15 shadow-[0_0_0_1px_rgba(251,191,36,.24),0_9px_24px_rgba(0,0,0,.2)]"
                            : "border-white/10 bg-white/[.035] opacity-80 hover:-translate-y-0.5 hover:border-amber-200/30 hover:bg-white/[.08] hover:opacity-100"
                        }`}
                        title={`${character.name} · ${character.role}`}
                        aria-pressed={active}
                      >
                        {active && (
                          <div className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-amber-950 shadow">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                        <div className="flex justify-center transition group-hover:scale-105">
                          <KuisTempurCharacterPortrait characterId={character.id} compact />
                        </div>
                        <div className={`mt-1.5 truncate text-[9px] font-black ${active ? "text-cyan-100" : "text-slate-400"}`}>
                          {character.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-cyan-200"><Users size={14} /> PEMAIN DI RUANG</div>
                    <div className="mt-0.5 text-xs font-bold text-slate-400">
                      {isPublicRoom
                        ? humanCount < 2
                          ? matchCountdown !== null && matchCountdown > 0 ? `Mulai dalam ${matchCountdown} detik + bot` : "Menyiapkan arena dan lawan bot..."
                          : matchCountdown !== null && matchCountdown > 0
                            ? `Mulai otomatis dalam ${matchCountdown} detik`
                            : humanCount >= 10
                              ? "Arena penuh · mulai sekarang"
                              : "Mencari pemain tambahan..."
                        : `${humanCount}/10 bergabung · ${humanCount >= 5 ? "komposisi ideal" : "5-10 paling seru"}`}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[9px] font-black text-slate-300">
                    {isPublicRoom ? "ARENA UMUM" : `RUANG ${room.code}`}
                  </div>
                </div>

                <div className="kt-roster-scroll mt-3 flex snap-x gap-2 overflow-x-auto pb-2">
                  {slots.map((player, slot) =>
                    player ? (
                      <div
                        key={player.id}
                        className={`flex min-w-[170px] snap-start items-center gap-2.5 rounded-2xl border px-3 py-2.5 shadow-[0_8px_20px_rgba(0,0,0,.16)] ${
                          player.id === me?.id
                            ? "border-cyan-300/30 bg-cyan-300/[.08]"
                            : "border-white/8 bg-white/[.035]"
                        }`}
                      >
                        <KuisTempurCharacterPortrait characterId={player.characterId} compact />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-white">
                            {player.id === me?.id ? `${player.playerName} · Kamu` : player.playerName}
                          </div>
                          <div className="mt-0.5 truncate text-[9px] font-bold text-slate-500">
                            {getKuisTempurCharacter(player.characterId).name}
                          </div>
                          <div className={`mt-0.5 text-[8px] font-black tracking-wider ${
                            player.isHost ? "text-amber-300" : "text-emerald-300"
                          }`}>
                            {player.connected === false ? "MENYAMBUNG ULANG" : player.isHost ? "PEMBUAT RUANG" : "TERHUBUNG"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={slot}
                        className="flex min-w-[118px] snap-start items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-3 py-3"
                      >
                        <div className="text-center">
                          <Users size={14} className="mx-auto text-slate-700" />
                          <div className="mt-1 text-[8px] font-black tracking-wider text-slate-700">MENUNGGU</div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-amber-300/12 bg-amber-300/[.055] px-4 py-3 text-xs font-semibold leading-5 text-amber-50/75">
                  Jawab benar untuk mengisi amunisi. Pilihan karakter hanya mengubah penampilan—semua pemain tetap bertarung dengan kemampuan yang sama.
                </div>
              </div>
            </section>

            <aside className="kt-room-panel self-start rounded-[30px] border border-cyan-200/20 bg-[linear-gradient(155deg,#102644_0%,#071329_72%)] p-5 shadow-[0_20px_55px_rgba(0,0,0,.4)]">
              <div className="flex items-center gap-2 text-xs font-black tracking-[.2em] text-slate-400">
                <Gamepad2 size={15} className="text-amber-300" /> PUSAT PERTEMPURAN
              </div>
              {isPublicRoom ? (
                <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4 text-center">
                  <Zap className="mx-auto text-amber-300" size={28} fill="currentColor" />
                  <div className="mt-2 text-[10px] font-black tracking-[.2em] text-cyan-200/70">MENCARI LAWAN</div>
                  <div aria-live="polite" className="mt-2 text-3xl font-black text-white">
                    {matchCountdown !== null && matchCountdown > 0
                      ? `${matchCountdown}s`
                      : humanCount >= 10
                        ? "ARENA PENUH!"
                        : "MENCARI LAWAN"}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-2.5 py-1 text-[9px] font-black tracking-widest text-amber-200"><Bot size={12} /> LAWAN KOMPUTER SIAP</div>
                  <div className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">
                    Maksimal 10 pemain. Bot menjaga arena tetap seru saat murid masih sedikit.
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4 text-center">
                  <div className="text-[10px] font-black tracking-[.2em] text-cyan-200/70">KODE ARENA</div>
                  <div aria-label={`Kode ruang ${room.code}`} className="mt-3 rounded-xl border border-dashed border-cyan-200/30 bg-slate-950/60 px-2 py-3 text-center font-mono text-2xl font-black tracking-[.24em] text-amber-200 sm:text-3xl">{room.code}</div>
                  <div className="mt-2 text-[10px] font-semibold text-slate-400">Bagikan kode atau tautan ke temanmu</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => void copyCode(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-2 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                      {copiedKind === "code" ? <Check size={14} /> : <Copy size={14} />} {copiedKind === "code" ? "Tersalin!" : "Salin kode"}
                    </button>
                    <button onClick={() => void copyCode(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-xs font-black text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                      {copiedKind === "link" ? <Check size={14} /> : <Copy size={14} />} {copiedKind === "link" ? "Tersalin!" : "Salin tautan"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-400">PEMAIN</span>
                  <span className="text-white">{humanCount}/10</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width]"
                    style={{ width: `${Math.min(100, humanCount * 10)}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] font-semibold text-slate-500">
                  {isPublicRoom
                    ? humanCount < 2
                      ? "Arena otomatis dimulai setelah hitung mundur, bahkan saat kamu bermain sendiri melawan bot."
                      : matchCountdown !== null && matchCountdown > 0
                        ? `Pertempuran dimulai otomatis dalam ${matchCountdown} detik.`
                        : humanCount >= 10
                          ? "10/10 · arena ditutup untuk pemain baru."
                          : "Masih menerima pemain sampai arena penuh."
                    : humanCount < 5
                      ? "Bisa mulai dari 2 pemain; 5-10 pemain akan terasa lebih seru."
                      : humanCount < 10
                        ? "Komposisi arena ideal."
                        : "Arena penuh dan siap tempur."}
                </div>
              </div>

              {notice && <div className="mt-3 text-center text-xs font-bold text-cyan-200">{notice}</div>}

              {isPublicRoom ? (
                <div role="status" className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[.09] p-4 text-center">
                  <Loader2 className="mx-auto animate-spin text-amber-300" size={21} />
                  <div className="mt-2 text-sm font-black">
                    {humanCount < 2
                      ? matchCountdown !== null && matchCountdown > 0 ? `Mulai dalam ${matchCountdown} detik` : "Menyiapkan arena..."
                      : matchCountdown !== null && matchCountdown > 0
                        ? `Mulai dalam ${matchCountdown} detik`
                        : "Menyiapkan pertempuran..."}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-slate-500">Tidak ada host. Arena mulai otomatis.</div>
                </div>
              ) : room.isHost ? (
                <button
                  onClick={startArena}
                  disabled={!canStart}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 py-4 text-base font-black text-[#2c0d00] shadow-[0_12px_35px_rgba(251,146,60,.32)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-40"
                >
                  <Zap size={19} fill="currentColor" />
                  {canStart ? "MULAI PERTEMPURAN" : "BUTUH 1 PEMAIN LAGI"}
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
        {displayChoiceOpen && (
          <KuisTempurDisplayChoice
            title="Arena siap. Pilih tampilan bertempur."
            onChoose={chooseMultiplayerDisplay}
          />
        )}
      </main>
    );
  }

  return (
    <main className="game-env game-env-kuis relative isolate min-h-screen overflow-x-hidden bg-[#040918] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_17%_15%,rgba(249,115,22,.16),transparent_34%),radial-gradient(circle_at_84%_30%,rgba(34,211,238,.16),transparent_36%),linear-gradient(180deg,#06152c_0%,#040918_75%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:pt-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <GameBackButton href="/arena/game" label="Arena" title="Kembali ke Arena" />
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] font-black tracking-[.15em] text-amber-100">
              <Swords size={13} className="mr-1 inline-block" /> KUIS TEMPUR 2.0
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-black tracking-wide ${serverOffline ? "border-rose-300/30 bg-rose-300/10 text-rose-200" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"}`}>
              <span className={`h-2 w-2 rounded-full ${serverOffline ? "bg-rose-400" : "bg-emerald-300 shadow-[0_0_9px_rgba(110,231,183,.7)]"}`} />
              {serverOffline ? "TERPUTUS" : "TERHUBUNG"}
            </div>
          </div>
        </header>

        <section className="mt-5 grid overflow-hidden rounded-[34px] border border-amber-200/20 bg-[#071428] shadow-[0_28px_80px_rgba(0,0,0,.45)] lg:grid-cols-[1.03fr_.97fr]">
          <div className="relative z-10 flex flex-col justify-center bg-[radial-gradient(circle_at_5%_70%,rgba(251,191,36,.12),transparent_45%),linear-gradient(145deg,#102847_0%,#061326_85%)] p-6 sm:p-9 lg:p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/30 bg-amber-300/10 px-3.5 py-2 text-[10px] font-black tracking-[.17em] text-amber-200">
              <Sparkles size={14} /> PETUALANGAN BERBASIS SOAL
            </div>
            <h1 className="mt-5 text-[clamp(2.8rem,6vw,5.5rem)] font-black leading-[.96] tracking-[-.055em]">
              KUIS<br />
              <span className="bg-gradient-to-r from-amber-200 via-orange-400 to-rose-400 bg-clip-text text-transparent">TEMPUR</span>
            </h1>
            <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-slate-300 sm:text-base">
              Jawab soal, kumpulkan energi, lalu bertarung di Kampung Kata. Pilih jagoanmu dan rebut puncak podium!
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-[10px] font-black text-white/90">
                <Users size={13} className="text-cyan-300" /> HINGGA 10 PEMAIN
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-[10px] font-black text-white/90">
                <Bot size={13} className="text-amber-300" /> MONSTER KOMPUTER
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-[10px] font-black text-white/90">
                <Shield size={13} className="text-emerald-300" /> STAT SETARA
              </span>
            </div>

            <div className="mt-6 text-[10px] font-black tracking-[.18em] text-amber-100/75">MODE UTAMA · CARI LAWAN OTOMATIS</div>
            <button
              onClick={() => openMultiplayerSetup("quick")}
              disabled={creating || serverOffline}
              className="group mt-2 flex min-h-[62px] w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 px-5 py-3 text-left text-slate-950 shadow-[0_12px_34px_rgba(249,115,22,.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:grayscale disabled:opacity-50 sm:max-w-[420px]"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/15"><Zap size={24} fill="currentColor" /></span>
                <span>
                  <span className="block text-lg font-black leading-tight">MAIN CEPAT</span>
                  <span className="block text-[10px] font-bold tracking-wide opacity-75">Cari lawan otomatis · mulai dengan bot</span>
                </span>
              </span>
              <ChevronRight size={25} className="transition group-hover:translate-x-1" />
            </button>
            <p className="mt-2 text-[11px] font-semibold text-amber-100/65">Tidak perlu kode ruang. Arena mulai otomatis.</p>
          </div>

          <div className="relative min-h-[350px] overflow-hidden border-t border-amber-200/10 bg-[#11283c] sm:min-h-[420px] lg:min-h-[480px] lg:border-l lg:border-t-0">
            <div
              className="absolute inset-0 opacity-75"
              style={{
                backgroundImage: 'url("/game/kuis-tempur/assets/world/base/arena_base_01.png")',
                backgroundPosition: "center center",
                backgroundSize: "cover",
                imageRendering: "pixelated",
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,15,31,.30)_0%,rgba(3,14,30,.28)_45%,rgba(4,12,24,.94)_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-amber-200/30 bg-slate-950/75 px-4 py-2 text-[10px] font-black tracking-[.2em] text-amber-100 backdrop-blur">
              <Crown size={13} className="mr-1 inline-block text-amber-300" /> PARA PENJAGA KAMPUNG KATA
            </div>
            <div className="pointer-events-none absolute bottom-[44px] left-1/2 h-16 w-[75%] -translate-x-1/2 rounded-[50%] bg-amber-200/20 blur-2xl" />
            <div className="pointer-events-none absolute bottom-[73px] left-1/2 h-10 w-[75%] -translate-x-1/2 rounded-[50%] border border-amber-200/25 bg-amber-300/10" />
            <div className="pointer-events-none absolute bottom-[72px] left-[2%] scale-[.7] origin-bottom sm:left-[6%] sm:scale-[.82]">
              <KuisTempurCharacterPortrait characterId="ki-jaka" hero />
            </div>
            <div className="pointer-events-none absolute bottom-[56px] right-[1%] scale-[.69] origin-bottom sm:right-[4%] sm:scale-[.8]">
              <KuisTempurCharacterPortrait characterId="bu-sari" hero />
            </div>
            <div className="pointer-events-none absolute bottom-[42px] left-1/2 z-10 -translate-x-1/2 scale-[.88] origin-bottom sm:scale-100">
              <KuisTempurCharacterPortrait characterId="arga" hero />
            </div>
            <div className="absolute inset-x-4 bottom-3 z-20 flex items-center justify-center gap-2 rounded-2xl border border-amber-200/20 bg-slate-950/85 px-4 py-3 text-center backdrop-blur">
              <Sparkles size={15} className="shrink-0 text-amber-300" />
              <span className="text-[11px] font-black tracking-wider text-white sm:text-xs">6 PETARUNG · SATU ARENA · JADILAH JUARA</span>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_.94fr]">
          <section className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => openMultiplayerSetup("private")}
              disabled={creating || serverOffline}
              className="group flex min-h-[183px] flex-col justify-between rounded-[26px] border border-violet-300/25 bg-[radial-gradient(circle_at_90%_0%,rgba(192,132,252,.22),transparent_58%),linear-gradient(135deg,#29195b,#111738)] p-5 text-left shadow-[0_14px_35px_rgba(0,0,0,.24)] transition hover:-translate-y-1 hover:border-violet-200/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="flex items-center justify-between"><Shield size={30} className="text-violet-200" /><span className="text-[9px] font-black tracking-[.13em] text-violet-200/75">MAINKAN BERSAMA</span></div>
              <div>
                <h2 className="text-xl font-black">RUANG PRIVAT</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-violet-100/75">Buat kode undangan, ajak teman, lalu bertempur bersama.</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-black text-violet-200">BUAT RUANG <ChevronRight size={16} className="transition group-hover:translate-x-1" /></div>
              </div>
            </button>
            <button
              onClick={() => setPhase("solo")}
              className="group flex min-h-[183px] flex-col justify-between rounded-[26px] border border-cyan-300/25 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.2),transparent_58%),linear-gradient(135deg,#113969,#0b1b37)] p-5 text-left shadow-[0_14px_35px_rgba(0,0,0,.24)] transition hover:-translate-y-1 hover:border-cyan-200/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <div className="flex items-center justify-between"><Bot size={30} className="text-cyan-200" /><span className="text-[9px] font-black tracking-[.13em] text-cyan-200/75">LATIHAN MANDIRI</span></div>
              <div>
                <h2 className="text-xl font-black">LAWAN KOMPUTER</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-cyan-100/75">Kuasai soal, coba jurus, dan asah kemampuanmu.</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-black text-cyan-200">MULAI LATIHAN <ChevronRight size={16} className="transition group-hover:translate-x-1" /></div>
              </div>
            </button>
          </section>

          <section className="rounded-[26px] border border-amber-200/20 bg-[linear-gradient(135deg,#102441,#08152c)] p-5 shadow-[0_14px_35px_rgba(0,0,0,.22)] sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-amber-100"><Users size={18} className="text-amber-300" /> GABUNG RUANG TEMAN</div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">Punya undangan? Masukkan 6 karakter kode dari temanmu.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                aria-label="Kode ruang privat"
                maxLength={6}
                autoCapitalize="characters"
                value={joinCodeInput}
                onChange={(event) => setJoinCodeInput(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, ""))}
                onKeyDown={(event) => { if (event.key === "Enter") joinPrivateRoom(); }}
                placeholder="KODE RUANG"
                className="min-w-0 flex-1 rounded-xl border border-amber-100/20 bg-slate-950/75 px-3 py-3 text-center font-mono text-base font-black tracking-[.18em] text-white outline-none placeholder:tracking-[.08em] placeholder:text-slate-500 focus:border-amber-300"
              />
              <button
                onClick={joinPrivateRoom}
                disabled={creating || serverOffline || joinCodeInput.length !== 6}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                GABUNG <ChevronRight size={17} />
              </button>
            </div>
            {notice && <p role="status" className="mt-3 text-xs font-semibold text-amber-200">{notice}</p>}
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] font-semibold text-slate-400">
              <Shield size={14} className="shrink-0 text-emerald-300" /> Room privat hanya bisa dimasuki dengan kode undangan.
            </div>
          </section>
        </div>

        <section className="mt-5 grid gap-3 rounded-[26px] border border-white/10 bg-white/[.04] p-3 sm:grid-cols-3 sm:p-4">
          {[
            { n: "01", title: "JAWAB SOAL", caption: "Kumpulkan energi dari jawaban benar", icon: <Sparkles size={19} /> },
            { n: "02", title: "BERTEMPUR", caption: "Hadapi monster dan pemain lain", icon: <Swords size={19} /> },
            { n: "03", title: "REBUT PODIUM", caption: "Kumpulkan skor dan raih kemenangan", icon: <Crown size={19} /> },
          ].map(({ n, title, caption, icon }) => (
            <div key={n} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-[#0d1b32] px-4 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">{icon}</div>
              <div><div className="text-[10px] font-black tracking-[.12em] text-white">{n} · {title}</div><p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">{caption}</p></div>
            </div>
          ))}
        </section>

        {serverOffline && (
          <div role="status" className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/[.08] p-4">
            <WifiOff className="mt-0.5 shrink-0 text-rose-300" size={18} />
            <p className="text-xs font-semibold leading-5 text-rose-100/80">
              Server realtime belum tersambung. <strong>Mode Lawan Bot tetap bisa dimainkan</strong> selama Main Cepat dan Ruang Privat belum tersedia.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
