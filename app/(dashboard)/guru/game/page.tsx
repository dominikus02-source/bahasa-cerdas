"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Play,
  BarChart3,
  Zap,
  Star,
  Swords,
  History,
  Flame,
  Trophy,
  Medal,
  Sparkles,
  TrendingUp,
  Target,
  ChevronRight,
  ArrowRight,
  CircleCheckBig,
  CircleAlert,
  Gamepad2,
  BellRing,
} from "lucide-react";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { RARITY_META } from "@/lib/gamification/client-types";

interface RoomLite {
  name: string | null;
  gameType: string | null;
}

interface ResultRow {
  id: string;
  finalScore: number;
  correct: number;
  wrong: number;
  maxStreak: number;
  xpEarned: number;
  createdAt: string;
  room: RoomLite | null;
}

interface StudentResult extends ResultRow {
  user: {
    id: string;
    fullName: string | null;
    avatar: string | null;
    xp: number;
    streak: number;
    level: number;
    profile: { school: string | null } | null;
  } | null;
}

interface GameHubData {
  questionCount: number;
  myResults: ResultRow[];
  studentResults: StudentResult[];
  activeRooms: { id: string }[];
}

interface BadgeLite {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  rarity: string;
  unlocked: boolean;
  description: string;
  progress: number;
  condition: { target?: number } | null;
}

interface BadgesData {
  badges: BadgeLite[];
  summary: { total: number; unlocked: number };
}

interface TeacherLeaderboardEntry {
  userId: string;
  fullName: string | null;
  avatar: string | null;
  xp: number;
  streak: number;
}

interface LeaderboardData {
  entries: TeacherLeaderboardEntry[];
  myRank: number | null;
}

interface XpHistoryEntry {
  id: string;
  source: string;
  sourceLabel: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface GuruUser {
  fullName: string | null;
  nickname: string | null;
}

interface SiswaRow {
  id: string;
  fullName: string | null;
  avatar: string | null;
  lastActiveAt: string | null;
}

const TARGET_MINGGUAN_XP = 500;

const SOLO_GAMES = [
  { id: "lari-kata", title: "Lari Kata", desc: "Jawab 20 soal dalam 60 detik! Makin cepat dan rentetan tinggi, makin banyak XP.", href: "/guru/game/lari-kata", gradient: "from-violet-500 via-purple-600 to-violet-800", icon: Zap, emoji: "🏃" },
  { id: "benar-salah", title: "Benar atau Salah", desc: "Kuis kilat 60 detik! Tentukan pernyataan yang muncul benar atau salah.", href: "/guru/game/benar-salah", gradient: "from-emerald-400 via-teal-500 to-cyan-600", icon: Star, emoji: "⚖️" },
  { id: "susun-kata", title: "Susun Kata", desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kosakata Anda!", href: "/guru/game/susun-kata", gradient: "from-emerald-500 via-emerald-600 to-teal-700", icon: BookOpen, emoji: "🧩" },
  { id: "tebak-kata", title: "Tebak Kata", desc: "Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.", href: "/guru/game/tebak-kata", gradient: "from-blue-500 via-blue-600 to-indigo-700", icon: Swords, emoji: "⚡" },
  { id: "irama-kata", title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk hanya yang sesuai aturan level.", href: "/guru/game/irama-kata", gradient: "from-orange-500 via-rose-500 to-red-600", icon: Zap, emoji: "🎵" },
  { id: "menara", title: "Menara Cerdas", desc: "Panjat menara dengan soal pelajaran murid! Jawab benar untuk naik.", href: "/guru/game/menara", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: Trophy, emoji: "🗼" },
  { id: "kata-play", title: "KataPlay", desc: "Belajar membaca dari nol! 4 tingkat, puluhan soal seru.", href: "/guru/game/kata-play", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: BookOpen, emoji: "📚" },
];

const GAME_TYPE_LABEL: Record<string, string> = {
  TEBAK_KATA: "Tebak Kata",
  SUSUN_KATA: "Susun Kata",
  BENAR_SALAH: "Benar atau Salah",
  IRAMA_KATA: "Irama Kata",
  KATAPLAY: "KataPlay",
};

const GAME_EMOJI: Record<string, string> = {
  "Lari Kata": "🏃",
  "Benar atau Salah": "⚖️",
  "Susun Kata": "🧩",
  "Tebak Kata": "⚡",
  "Irama Kata": "🎵",
  "Menara Cerdas": "🗼",
  KataPlay: "📚",
};

const resultGameLabel = (r: { room: RoomLite | null }): string =>
  r.room?.name || r.room?.gameType || "Gim";

const resultGameEmoji = (r: { room: RoomLite | null }): string =>
  GAME_EMOJI[resultGameLabel(r)] ?? "🎮";

const relativeDay = (iso: string): string => {
  const start = startOfToday();
  const t = new Date(iso).getTime();
  const diff = Math.floor((start - t) / 86_400_000);
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff === 2) return "2 hari lalu";
  if (diff === 3) return "3 hari lalu";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export default function GuruGameHubPage() {
  const [hub, setHub] = useState<GameHubData | null>(null);
  const [badges, setBadges] = useState<BadgesData | null>(null);
  const [lb, setLb] = useState<LeaderboardData | null>(null);
  const [xpHist, setXpHist] = useState<XpHistoryEntry[]>([]);
  const [user, setUser] = useState<GuruUser | null>(null);
  const [siswa, setSiswa] = useState<SiswaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllRiwayat, setShowAllRiwayat] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/guru/game-hub").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/player/badges").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/guru/leaderboard").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/player/xp/history?limit=100").then((r) => (r.ok ? r.json() : { entries: [] })),
      fetch("/api/user/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/guru/siswa").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([hubD, bd, lbD, xpD, userD, sisiwaD]) => {
        setHub(hubD);
        setBadges(bd);
        setLb(lbD);
        setXpHist(Array.isArray(xpD?.entries) ? xpD.entries as XpHistoryEntry[] : []);
        setUser(userD?.user ?? null);
        setSiswa(Array.isArray(sisiwaD?.siswa) ? sisiwaD.siswa as SiswaRow[] : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derive data ─────────────────────────────────────────────
  const guruBadges = (badges?.badges ?? []).filter((b) => b.code.startsWith("guru-"));
  const totalGuruBadges = guruBadges.length;
  const unlocked = guruBadges.filter((b) => b.unlocked).length;

  const dayStart = startOfToday();
  const myResultsToday = (hub?.myResults ?? []).filter((x) => new Date(x.createdAt).getTime() >= dayStart);
  const studentResultsToday = (hub?.studentResults ?? []).filter((x) => new Date(x.createdAt).getTime() >= dayStart);
  const aktifMuridIds = new Set(studentResultsToday.map((x) => x.user?.id).filter(Boolean));
  const aktifHariIni = aktifMuridIds.size;
  const totalMurid = siswa.length;
  const belumBermain = Math.max(0, totalMurid - aktifHariIni);

  const playedMeToday = myResultsToday.length;

  const guruSources = new Set([
    "MURID_KARYA", "MURID_LIKE", "MURID_KOMENTAR",
    "GURU_TUGAS", "GURU_PENGUMUMAN", "GURU_FEATURED", "GURU_GAME",
  ]);
  const weekStart = dayStart - 6 * 86_400_000;
  const weeklyXp = xpHist
    .filter((e) => guruSources.has(e.source) && new Date(e.createdAt).getTime() >= weekStart)
    .reduce((s, e) => s + e.amount, 0);
  const xpTargetPct = Math.min(100, Math.round((weeklyXp / TARGET_MINGGUAN_XP) * 100));

  // Last game + best score (dari riwayat XP game guru; fallback ke myResults)
  let lastGame: { title: string; href: string; emoji: string } | null = null;
  let bestScore = 0;
  for (const e of [...xpHist].reverse()) {
    if (e.source !== "GURU_GAME") continue;
    const gt = typeof e.metadata?.gameType === "string" ? e.metadata.gameType : "";
    const metaScore = Number(e.metadata?.skor) || 0;
    if (metaScore > bestScore) bestScore = metaScore;
    if (!lastGame) {
      const title = gt ? (GAME_TYPE_LABEL[gt] ?? gt) : "Gim";
      const slug = Object.entries(GAME_TYPE_LABEL).find(([, v]) => v === title)?.[0];
      const href = slug ? `/guru/game/${slugToPage(slug)}` : "/guru/game/lari-kata";
      lastGame = { title, href, emoji: GAME_EMOJI[title] ?? "🎮" };
    }
    if (lastGame) break;
  }
  if (!lastGame && (hub?.myResults?.length ?? 0) > 0) {
    const latest = hub!.myResults[0];
    lastGame = { title: resultGameLabel(latest), href: "/guru/game/lari-kata", emoji: resultGameEmoji(latest) };
    bestScore = Math.max(bestScore, latest.finalScore);
  }
  lastGame = lastGame ?? { title: "Lari Kata", href: "/guru/game/lari-kata", emoji: "🏃" };

  // Popularitas game (Top 5)
  const counts = new Map<string, number>();
  for (const res of [...(hub?.studentResults ?? []), ...(hub?.myResults ?? [])]) {
    const key = resultGameLabel(res);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const popularity = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = popularity[0]?.[1] ?? 1;
  const totalPlays = popularity.reduce((a, [, n]) => a + n, 0) || 1;
  const topGameName = popularity[0]?.[0];

  // Misi harian adaptif
  const dailyMissions = [
    { id: "main-1", label: "Main 1 game hari ini", done: playedMeToday >= 1, icon: "🎮" },
    { id: "main-5", label: "5 murid bermain hari ini", done: aktifHariIni >= 5, icon: "👥" },
    { id: "cetak-baru", label: "Cetak skor baru (melebihi rekor terbaikmu)", done: false, icon: "🏅" },
  ];
  const missionsDone = dailyMissions.filter((m) => m.done).length;

  // Badge berikutnya
  const nextBadge = guruBadges.find((b) => !b.unlocked);
  const nextBadgePct =
    nextBadge && nextBadge.condition?.target
      ? Math.min(100, Math.round((nextBadge.progress / nextBadge.condition.target) * 100))
      : 100;

  // AI Insight preview
  const insight = insightFromResults(hub?.studentResults ?? []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40">
      {/* ── HERO: dashboard ringkas ─────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-8 w-48 h-48 bg-teal-300/10 rounded-full blur-[60px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-7">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-emerald-200 uppercase tracking-wider font-semibold">Teacher Engagement Dashboard</p>
                  <h1 className="text-xl lg:text-2xl font-extrabold">
                    Halo, {loading ? "Guru" : (user?.nickname || user?.fullName || "Guru")} 👋
                  </h1>
                </div>
              </div>
              <p className="mt-2 text-emerald-100/90 text-sm">
                Ringkasan aktivitas gim kamu dan kelas — buka setiap hari untuk melihat perkembangan.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 96 96" className="w-24 h-24 -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
                  <circle
                    cx="48" cy="48" r="40" fill="none" stroke="#fff" strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(xpTargetPct / 100) * 251.3} 251.3`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold">{xpTargetPct}%</span>
                  <span className="text-[9px] text-emerald-100">Target</span>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wide">XP Minggu Ini</p>
                <p className="text-2xl font-extrabold tabular-nums">+{weeklyXp.toLocaleString("id-ID")}</p>
                <p className="text-[11px] text-emerald-200 mt-1">Target: {TARGET_MINGGUAN_XP.toLocaleString("id-ID")} XP Guru</p>
              </div>
            </div>
          </div>

          {/* Hero stat chips */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <HeroChip icon={<Medal className="w-4 h-4 text-purple-300" />} label="Badge Terbuka" value={loading ? "..." : `${unlocked} / ${totalGuruBadges}`} />
            <HeroChip icon={<Users className="w-4 h-4 text-sky-300" />} label="Murid Aktif Hari Ini" value={loading ? "..." : String(aktifHariIni)} />
            <HeroChip icon={<TrendingUp className="w-4 h-4 text-green-300" />} label="XP Guru Minggu Ini" value={loading ? "..." : `+${weeklyXp.toLocaleString("id-ID")}`} />
            <HeroChip icon={<Trophy className="w-4 h-4 text-amber-300" />} label="Rank Guru" value={loading ? "..." : lb?.myRank ? `#${lb.myRank}` : "—"} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── FOKUS HARI INI (CTA utama) ────────────────────── */}
        <section className="mb-8">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-100 p-6 text-sm text-slate-400 shadow-sm">Memuat fokus hari ini...</div>
          ) : belumBermain > 0 ? (
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-xl border border-orange-100 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  <p className="font-bold text-slate-800 text-base">Fokus Hari Ini</p>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  <strong className="text-orange-600">{belumBermain} murid</strong> belum bermain hari ini. Ajak mereka bermain untuk memperoleh{" "}
                  <strong className="text-emerald-600">+20 XP Guru</strong>.
                </p>
              </div>
              <a
                href="#aktivitas-murid"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <BellRing className="w-4 h-4" /> Kirim Pengingat
              </a>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CircleCheckBig className="w-5 h-5 text-emerald-500" />
                <p className="font-extrabold text-slate-800 text-base">Hebat!</p>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Semua murid ({totalMurid || aktifHariIni}) telah aktif bermain hari ini. 🎉
              </p>
            </div>
          )}
        </section>

        {/* ── QUICK ACTION ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href={lastGame.href} className="group flex flex-col bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0"><Play className="w-4 h-4 text-white" /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">▶ Main Sekarang</p>
                <p className="font-bold text-slate-900 text-sm truncate">{lastGame.emoji} {lastGame.title}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-auto">
              <span className="font-semibold text-slate-700">Best Score</span> {bestScore.toLocaleString("id-ID")}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 group-hover:gap-2 transition-all">
              Main Lagi <ArrowRight size={12} />
            </span>
          </Link>

          {/* Tantangan / Misi */}
          <a
            href="#misi-hari-ini"
            className="group bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0"><Flame className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">🔥 Tantangan Hari Ini</p>
                <p className="font-bold text-slate-900 text-sm">Misi harian &amp; reward</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-auto">{missionsDone}/3 misi selesai</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 group-hover:gap-2 transition-all">
              Ke Misi <ArrowRight size={12} />
            </span>
          </a>

          {/* Badge Saya */}
          <Link href="/guru/game/achievement" className="group bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0"><Medal className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">🏆 Badge Saya</p>
                <p className="font-bold text-slate-900 text-sm">{unlocked} / {totalGuruBadges} Badge</p>
              </div>
            </div>
            {nextBadge ? (
              <div className="mt-auto">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${nextBadgePct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{nextBadgePct}% menuju {nextBadge.name}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-auto">Semua badge guru terbuka! 🎉</p>
            )}
          </Link>
        </div>

        {/* ── STATISTIK (hari/minggu ini) ────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={<Users className="w-4 h-4 text-sky-500" />} label="Murid Bermain Hari Ini" value={loading ? "..." : aktifHariIni.toString()} accent="border-sky-100 bg-sky-50/40" />
          <Stat icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="XP Guru Minggu Ini" value={loading ? "..." : `+${weeklyXp.toLocaleString("id-ID")}`} accent="border-emerald-100 bg-emerald-50/40" />
          <Stat icon={<Medal className="w-4 h-4 text-violet-500" />} label="Badge Terbuka" value={loading ? "..." : `${unlocked}/${totalGuruBadges}`} accent="border-violet-100 bg-violet-50/40" />
          <Stat icon={<Sparkles className="w-4 h-4 text-orange-500" />} label="Aktivitas Hari Ini" value={loading ? "..." : (studentResultsToday.length + playedMeToday).toString()} accent="border-orange-100 bg-orange-50/40" />
        </div>

        {/* ── MISI HARIAN ───────────────────────────────────── */}
        <section id="misi-hari-ini" className="scroll-mt-24 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">🎯 Misi Hari Ini</h2>
            <span className="ml-auto text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">{missionsDone}/{dailyMissions.length}</span>
          </div>
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-xl border border-orange-100 p-5 shadow-sm">
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {dailyMissions.map((m) => (
                <div key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${m.done ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100"}`}>
                  <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-base ${m.done ? "bg-emerald-100" : "bg-slate-100"}`}>{m.icon}</span>
                  <span className={`text-xs font-medium leading-tight ${m.done ? "text-emerald-700 line-through" : "text-slate-600"}`}>{m.label}</span>
                  {m.done ? <CircleCheckBig className="w-4 h-4 text-emerald-500 ml-auto shrink-0" /> : <CircleAlert className="w-4 h-4 text-slate-300 ml-auto shrink-0" />}
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white p-3">
                <span className="w-9 h-9 shrink-0 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-600 text-xs">+50</span>
                <div className="leading-tight">
                  <p className="text-xs font-bold text-slate-800">Reward Misi</p>
                  <p className="text-[11px] text-slate-500">+50 XP Guru saat semua misi selesai</p>
                </div>
              </div>
            </div>
            <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${(missionsDone / dailyMissions.length) * 100}%` }} />
            </div>
          </div>
        </section>

        {/* ── MAIN GAME ─────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800" id="mainkan">Mainkan Gim</h2>
            <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">SOLO</span>
            <Link href="/guru/game/lobby" className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700">
              Ruang Gim &amp; Tanding <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {SOLO_GAMES.map((game) => {
              const Icon = game.icon;
              const playCount = counts.get(game.title) ?? 0;
              const isTrending = topGameName === game.title && playCount > 0;
              const badge = isTrending
                ? { label: "🔥 Trending", cls: "bg-orange-500" }
                : game.id === "kata-play"
                  ? { label: "⭐ Baru", cls: "bg-violet-500" }
                  : game.id === "benar-salah"
                    ? { label: "🎯 Recommended", cls: "bg-emerald-500" }
                    : null;
              return (
                <Link
                  key={game.id}
                  href={game.href}
                  className="group flex flex-col bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className={`h-20 bg-gradient-to-br ${game.gradient} relative flex items-center justify-center shrink-0`}>
                    <Icon className="w-9 h-9 text-white/80" />
                    {badge && (
                      <span className={`absolute top-2 left-2 ${badge.cls} text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm`}>{badge.label}</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><span>{game.emoji}</span>{game.title}</h3>
                      <span className="text-[9px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold shrink-0">MULAI</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{game.desc}</p>
                    {playCount > 0 && (
                      <div className="mt-2">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${topGameName === game.title ? "bg-amber-400" : "bg-slate-300"}`} style={{ width: `${Math.round((playCount / maxCount) * 100)}%` }} />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">{playCount} kali dimainkan</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── GAME TERPOPULER (Top 5) ───────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Game Terpopuler Minggu Ini</h2>
          </div>
          {popularity.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <ol className="space-y-3">
                {popularity.map(([name, n], i) => {
                  const pct = Math.round((n / totalPlays) * 100);
                  return (
                    <li key={name} className="flex items-center gap-3">
                      <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-amber-700/10 text-amber-800" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                      <span className="text-sm font-semibold text-slate-700 w-32 truncate shrink-0">{name}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${i === 0 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${(n / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 tabular-nums w-12 text-right">{pct}%</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center shadow-sm">
              <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">Belum ada data minggu ini</p>
              <p className="text-xs text-slate-400 mt-1">Setelah guru dan murid bermain gim, peringkat popularitas akan muncul di sini.</p>
            </div>
          )}
        </div>

        {/* ── PROGRESS GURU (Level + Badge progress) ────────── */}
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Medal className="w-4 h-4 text-violet-500" />
              <p className="font-bold text-slate-900 text-sm">Level Guru</p>
              {lb?.myRank != null && (
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> #{lb.myRank}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">XP Guru minggu ini</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{weeklyXp.toLocaleString("id-ID")}</span>
              <span className="text-xs text-slate-400 mb-1">/ {TARGET_MINGGUAN_XP.toLocaleString("id-ID")} target mingguan</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000" style={{ width: `${xpTargetPct}%` }} />
            </div>
            <div className="mt-3 text-[11px] text-slate-400">{xpTargetPct}% tercapai</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Medal className="w-4 h-4 text-violet-500" />
              <p className="font-bold text-slate-900 text-sm">Badge Progress</p>
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">{unlocked}/{totalGuruBadges}</span>
            </div>
            {guruBadges.length > 0 ? (
              <div className="space-y-3">
                {guruBadges.slice(0, 5).map((b) => {
                  const t = b.condition?.target ?? 1;
                  const pct = b.unlocked ? 100 : Math.min(100, Math.round((b.progress / t) * 100));
                  const meta = RARITY_META[b.rarity] ?? { label: "Guru", color: "#8b5cf6", border: "border-violet-200" };
                  const badgeIcon = b.icon?.trim() || "⭐";
                  return (
                    <div key={b.code} className="flex items-center gap-3">
                      <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border ${b.unlocked ? meta.border : "border-slate-100"}`}>
                        <BadgeIcon icon={badgeIcon} size={26} alt={b.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700 truncate">{b.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">{b.unlocked ? "TERBUKA" : `${pct}%`}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full transition-all duration-700 ${b.unlocked ? "bg-violet-400" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ada badge guru — mainkan gim dan aktivitas mengajar untuk membukanya.</p>
            )}
          </div>
        </div>

        {/* ── LEADERBOARD (posisi) ─────────────────────────── */}
        {lb && lb.myRank != null && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-4 shadow-sm flex items-center gap-3 mb-8">
            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-slate-700 flex-1">
              <span className="font-extrabold">Posisimu #{lb.myRank}</span> di peringkat guru nasional.
            </p>
            <Link href="/guru/game/leaderboard" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
              Lihat Papan <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* ── AKTIVITAS MURID ───────────────────────────────── */}
        <section id="aktivitas-murid" className="scroll-mt-24 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Aktivitas Murid</h2>
            <Link href="/guru/data-siswa" className="ml-auto text-[11px] font-bold text-sky-600 hover:underline inline-flex items-center gap-1">
              Kelola Data Siswa <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm text-sm text-slate-400">Memuat aktivitas murid...</div>
          ) : (hub?.studentResults?.length ?? 0) > 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <ul className="divide-y divide-slate-50">
                {(hub?.studentResults ?? []).slice(0, 5).map((res) => (
                  <li key={res.id} className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {res.user?.fullName?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{res.user?.fullName || "Siswa"}</p>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <span>{resultGameEmoji(res)}</span>
                        <span>{resultGameLabel(res)}</span>
                        <span className="text-slate-300">·</span>
                        <span>{relativeDay(res.createdAt)}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700">{res.finalScore} poin</p>
                      <p className="text-[10px] text-slate-400">+{res.xpEarned} XP</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{aktifHariIni} murid bermain hari ini</span>
                {totalMurid > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500">{belumBermain} belum bermain</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-sky-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Belum ada aktivitas gim murid</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Ajak murid bergabung ke kelas lalu bermain gim bersama — aktivitas, skor, dan XP mereka akan tampil di sini.
              </p>
              <Link href="/guru/data-siswa" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition-colors">
                Atur Kelas &amp; Murid
              </Link>
            </div>
          )}
        </section>

        {/* ── RIWAYAT (5 + Lihat Semua) ─────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Riwayat Permainan</h2>
            {(hub?.studentResults?.length ?? 0) > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRiwayat((v) => !v)}
                className="ml-auto text-xs font-bold text-emerald-600 hover:underline"
              >
                {showAllRiwayat ? "Ringkas" : "Lihat Semua"}
              </button>
            )}
          </div>
          {(hub?.studentResults?.length ?? 0) > 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">Siswa</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">Gim</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">Skor</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">Benar</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">Salah</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hub?.studentResults ?? []).slice(0, showAllRiwayat ? undefined : 5).map((res) => (
                      <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {res.user?.fullName?.charAt(0) || "?"}
                            </div>
                            <span className="font-medium text-slate-700 text-xs">{res.user?.fullName || "Siswa"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{resultGameLabel(res)}</td>
                        <td className="px-4 py-3 text-center"><span className="font-bold text-emerald-600">{res.finalScore}</span></td>
                        <td className="px-4 py-3 text-center text-xs text-green-600">{res.correct}</td>
                        <td className="px-4 py-3 text-center text-xs text-red-500">{res.wrong}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {new Date(res.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Belum ada riwayat permainan</p>
              <p className="text-xs text-slate-400 mt-1">Ajak murid bermain gim bersama untuk melihat hasilnya di sini.</p>
              <Link href="/guru/game/lobby" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                <Play size={14} /> Buat Ruang Baru
              </Link>
            </div>
          )}
        </div>

        {/* ── AI INSIGHT (preview profesional) ─────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">AI Insight</h2>
            <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-semibold">Preview · Segera Hadir</span>
          </div>
          <div className="bg-gradient-to-r from-rose-50 via-white to-emerald-50 rounded-xl border border-rose-100 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Rekomendasi Cerdas untuk Kelasmu</p>
                {insight ? (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{insight}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Insight AI akan menghadirkan rekomendasi berdasarkan performa kelas (kosakata, kecepatan membaca,
                    ketepatan) setelah cukup data permainan tersedia.{" "}
                    <span className="font-semibold text-slate-600">Saran awal: minta murid bermain Susun Kata 3x minggu ini.</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── helpers ─────────────────────────────────

function slugToPage(slug: string): string {
  switch (slug) {
    case "TEBAK_KATA": return "tebak-kata";
    case "SUSUN_KATA": return "susun-kata";
    case "BENAR_SALAH": return "benar-salah";
    case "IRAMA_KATA": return "irama-kata";
    case "KATAPLAY": return "kata-play";
    default: return "lari-kata";
  }
}

function HeroChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2.5 border border-white/10">
      {icon}
      <div className="text-xs min-w-0">
        <p className="text-emerald-100/80 truncate">{label}</p>
        <p className="font-bold text-sm">{value}</p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className={`bg-white rounded-xl border ${accent} p-4 shadow-sm`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{icon}<span>{label}</span></div>
      <p className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function insightFromResults(results: StudentResult[]): string | null {
  if (results.length < 5) return null;
  let best = "";
  let bestAcc = -1;
  let worst = "";
  let worstAcc = Infinity;
  const byGame = new Map<string, { correct: number; wrong: number }>();
  for (const res of results) {
    const name = resultGameLabel(res);
    const cur = byGame.get(name) ?? { correct: 0, wrong: 0 };
    cur.correct += res.correct;
    cur.wrong += res.wrong;
    byGame.set(name, cur);
  }
  for (const [name, v] of byGame) {
    const tot = v.correct + v.wrong;
    const acc = tot > 0 ? v.correct / tot : 0;
    if (acc > bestAcc) { bestAcc = acc; best = name; }
    if (acc < worstAcc) { worstAcc = acc; worst = name; }
  }
  if (!best) return null;
  return `Kelas menguasai ${topKindFor(best)} lewat gim ${best} (tingkat benar ${Math.round(bestAcc * 100)}%) dan masih perlu peningkatan pada ${topKindFor(worst) || "ketepatan"}. Saran: mainkan gim ${worst} bersama murid 3x minggu ini.`;
}

function topKindFor(name: string): string {
  if (name.includes("Susun") || name.includes("Tebak") || name.includes("KataPlay")) return "kosakata";
  if (name.includes("Irama") || name.includes("Lari")) return "kecepatan membaca";
  return "ketepatan jawaban";
}