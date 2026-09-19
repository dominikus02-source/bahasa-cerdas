"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Play,
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
  Gamepad2,
  BellRing,
  Clock,
  BarChart3,
  Grid3x3,
  Lightbulb,
  Hash,
  Music,
  Landmark,
  Puzzle,
  BookMarked,
  Scale,
} from "lucide-react";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { RARITY_META } from "@/lib/gamification/client-types";

interface RoomLite {
  name: string | null;
  gameType: string | null;
}

interface SessionLite {
  joinedAt: string | null;
  finishedAt: string | null;
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
  session: SessionLite | null;
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
  total?: number;
  totalPages?: number;
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
  { id: "kuis-tempur", title: "Kuis Tempur", desc: "Bertahan di arena melawan bot! Jawab benar untuk menyerang, salah kamu yang terluka.", href: "/guru/game/kuis-tempur", gradient: "from-red-500 via-rose-600 to-red-800", icon: Swords },
  { id: "lari-kata", title: "Lari Kata", desc: "Jawab 20 soal dalam 60 detik! Makin cepat dan rentetan tinggi, makin banyak XP.", href: "/guru/game/lari-kata", gradient: "from-violet-500 via-purple-600 to-violet-800", icon: Zap },
  { id: "benar-salah", title: "Benar atau Salah", desc: "Kuis kilat 60 detik! Tentukan pernyataan yang muncul benar atau salah.", href: "/guru/game/benar-salah", gradient: "from-emerald-400 via-teal-500 to-cyan-600", icon: Scale },
  { id: "susun-kata", title: "Susun Kata", desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kosakata Anda!", href: "/guru/game/susun-kata", gradient: "from-emerald-500 via-emerald-600 to-teal-700", icon: Puzzle },
  { id: "tebak-kata", title: "Tebak Kata", desc: "Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.", href: "/guru/game/tebak-kata", gradient: "from-blue-500 via-blue-600 to-indigo-700", icon: Lightbulb },
  { id: "irama-kata", title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk hanya yang sesuai aturan level.", href: "/guru/game/irama-kata", gradient: "from-orange-500 via-rose-500 to-red-600", icon: Music },
  { id: "menara", title: "Menara Cerdas", desc: "Panjat menara dengan soal pelajaran murid! Jawab benar untuk naik.", href: "/guru/game/menara", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: Landmark },
  { id: "kata-play", title: "KataPlay", desc: "Belajar membaca dari nol! 4 tingkat, puluhan soal seru.", href: "/guru/game/kata-play", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: BookMarked },
  { id: "teka-teki-silang", title: "Teka-Teki Silang", desc: "Isi kotak, asah kosakata! 12 level, soal baru tiap main.", href: "/guru/game/teka-teki-silang", gradient: "from-sky-500 via-cyan-600 to-sky-800", icon: Hash },
];

const GAME_TYPE_LABEL: Record<string, string> = {
  RIMBA_KATA: "Kuis Tempur",
  TEBAK_KATA: "Tebak Kata",
  SUSUN_KATA: "Susun Kata",
  BENAR_SALAH: "Benar atau Salah",
  IRAMA_KATA: "Irama Kata",
  KATAPLAY: "KataPlay",
  TEKA_TEKI_SILANG: "Teka-Teki Silang",
};

const resultGameLabel = (r: { room: RoomLite | null }): string =>
  r.room?.name || r.room?.gameType || "Gim";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Status waktu ringkas: Baru saja / Hari ini / Kemarin / tanggal
const timeStatusLabel = (iso: string): string => {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - t;
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) return "Baru saja";
  const start = startOfToday();
  const dayDiff = Math.floor((start - t) / 86_400_000);
  if (dayDiff <= 0) return "Hari ini";
  if (dayDiff === 1) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

const timeStatusTone = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) return "text-emerald-600 dark:text-emerald-400";
  return "text-slate-400 dark:text-slate-500";
};

// Durasi bermain dari sesi gim (joinedAt → finishedAt)
const formatDurasi = (s: SessionLite | null): string => {
  if (!s?.joinedAt || !s?.finishedAt) return "—";
  const ms = new Date(s.finishedAt).getTime() - new Date(s.joinedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const det = totalSec % 60;
  if (m <= 0) return `${det} detik`;
  return `${m}m ${det}d`;
};

export default function GuruGameHubPage() {
  const [hub, setHub] = useState<GameHubData | null>(null);
  const [badges, setBadges] = useState<BadgesData | null>(null);
  const [lb, setLb] = useState<LeaderboardData | null>(null);
  const [xpHist, setXpHist] = useState<XpHistoryEntry[]>([]);
  const [user, setUser] = useState<GuruUser | null>(null);
  const [siswa, setSiswa] = useState<SiswaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/guru/game-hub?limit=100").then((r) => (r.ok ? r.json() : null)),
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
  const studentResults = hub?.studentResults ?? [];
  const studentResultsToday = studentResults.filter((x) => new Date(x.createdAt).getTime() >= dayStart);
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
  let lastGame: { title: string; href: string } | null = null;
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
      lastGame = { title, href };
    }
    if (lastGame) break;
  }
  if (!lastGame && (hub?.myResults?.length ?? 0) > 0) {
    const latest = hub!.myResults[0];
    lastGame = { title: resultGameLabel(latest), href: "/guru/game/lari-kata" };
    bestScore = Math.max(bestScore, latest.finalScore);
  }
  lastGame = lastGame ?? { title: "Lari Kata", href: "/guru/game/lari-kata" };

  // Ringkasan Aktivitas Kelas
  const avgScore =
    studentResultsToday.length > 0
      ? Math.round(studentResultsToday.reduce((s, r) => s + r.finalScore, 0) / studentResultsToday.length)
      : 0;

  // Game paling populer (semua hasil tersedia)
  const counts = new Map<string, number>();
  for (const res of [...studentResults, ...(hub?.myResults ?? [])]) {
    const key = resultGameLabel(res);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const popularity = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = popularity[0]?.[1] ?? 1;
  const topGameName = popularity[0]?.[0] ?? null;

  // Murid Teraktif Hari Ini (Top 5)
  const topPerformers = [...studentResultsToday]
    .sort((a, b) => b.finalScore - a.finalScore || b.xpEarned - a.xpEarned)
    .filter((r, i, arr) => arr.findIndex((x) => x.user?.id === r.user?.id) === i)
    .slice(0, 5);

  // Misi harian adaptif
  const dailyMissions = [
    { id: "main-1", label: "Main 1 game hari ini", done: playedMeToday >= 1, icon: Gamepad2 },
    { id: "main-5", label: "5 murid bermain hari ini", done: aktifHariIni >= 5, icon: Users },
    { id: "cetak-baru", label: "Cetak skor baru (melebihi rekor terbaikmu)", done: false, icon: Target },
  ];
  const missionsDone = dailyMissions.filter((m) => m.done).length;

  // Badge berikutnya
  const nextBadge = guruBadges.find((b) => !b.unlocked);
  const nextBadgePct =
    nextBadge && nextBadge.condition?.target
      ? Math.min(100, Math.round((nextBadge.progress / nextBadge.condition.target) * 100))
      : 100;

  // AI Insight preview
  const insight = insightFromResults(studentResults);

  const kelasPct = totalMurid > 0 ? Math.round((aktifHariIni / totalMurid) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* ── HERO: dashboard ringkas ─────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-8 w-48 h-48 bg-teal-300/10 rounded-full blur-[60px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Dasbor Aktivitas Guru</p>
                  <h1 className="text-lg lg:text-xl font-extrabold truncate">
                    Halo, {loading ? "Guru" : (user?.nickname || user?.fullName || "Guru")}
                  </h1>
                </div>
              </div>
              <p className="mt-1.5 text-emerald-100/90 text-xs leading-relaxed">
                Ringkasan aktivitas gim kamu dan kelas — buka setiap hari untuk melihat perkembangan.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 px-3.5 py-2">
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 96 96" className="w-16 h-16 -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="10" />
                  <circle
                    cx="48" cy="48" r="40" fill="none" stroke="#fff" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(xpTargetPct / 100) * 251.3} 251.3`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-extrabold leading-none">{xpTargetPct}%</span>
                  <span className="text-[7px] text-emerald-100 mt-0.5">Target</span>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-[9px] text-emerald-200 font-semibold uppercase tracking-wide">XP Minggu Ini</p>
                <p className="text-xl font-extrabold tabular-nums leading-tight">+{weeklyXp.toLocaleString("id-ID")}</p>
                <p className="text-[9px] text-emerald-200 mt-0.5">Target {TARGET_MINGGUAN_XP.toLocaleString("id-ID")} XP Guru</p>
              </div>
            </div>
          </div>

          {/* Hero stat chips (satu-satunya section statistik utama) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
            <HeroChip icon={<Medal className="w-4 h-4 text-purple-300" />} label="Lencana Terbuka" value={loading ? "..." : `${unlocked} dari ${totalGuruBadges}`} />
            <HeroChip icon={<Users className="w-4 h-4 text-sky-300" />} label="Murid Aktif Hari Ini" value={loading ? "..." : String(aktifHariIni)} />
            <HeroChip icon={<TrendingUp className="w-4 h-4 text-green-300" />} label="Aktivitas Hari Ini" value={loading ? "..." : (studentResultsToday.length + playedMeToday).toString()} />
            <HeroChip icon={<Trophy className="w-4 h-4 text-amber-300" />} label="Peringkat Guru" value={loading ? "..." : lb?.myRank ? `#${lb.myRank}` : "—"} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── QUICK ACTION ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <Link href={lastGame.href} className="group flex flex-col bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0"><Play className="w-4 h-4 text-white" /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide dark:text-slate-500">Main Sekarang</p>
                <p className="font-bold text-slate-900 text-sm truncate dark:text-slate-100">{lastGame.title}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-auto dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Skor Terbaik</span> {bestScore.toLocaleString("id-ID")}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 group-hover:gap-2 transition-all">
              Main Lagi <ArrowRight size={12} />
            </span>
          </Link>

          {/* Tantangan / Misi */}
          <a
            href="#misi-hari-ini"
            className="group bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col dark:bg-slate-900 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0"><Flame className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide dark:text-slate-500">Tantangan Hari Ini</p>
                <p className="font-bold text-slate-900 text-sm dark:text-slate-100">Misi harian &amp; reward</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-auto dark:text-slate-400">{missionsDone}/3 misi selesai</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 group-hover:gap-2 transition-all">
              Ke Misi <ArrowRight size={12} />
            </span>
          </a>

          {/* Lencana Saya */}
          <Link href="/guru/game/achievement" className="group bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0"><Medal className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide dark:text-slate-500">Lencana Saya</p>
                <p className="font-bold text-slate-900 text-sm dark:text-slate-100">{unlocked} dari {totalGuruBadges} Lencana</p>
              </div>
            </div>
            {nextBadge ? (
              <div className="mt-auto">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${nextBadgePct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-500">{nextBadgePct}% menuju {nextBadge.name}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-auto dark:text-slate-400">Semua lencana guru terbuka!</p>
            )}
          </Link>
        </div>

        {/* ── MISI HARIAN ───────────────────────────────────── */}
        <section id="misi-hari-ini" className="scroll-mt-24 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Misi Hari Ini</h2>
            <span className="ml-auto text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold dark:bg-orange-900/40 dark:text-orange-300">{missionsDone}/{dailyMissions.length}</span>
          </div>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {dailyMissions.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs transition-colors ${
                        m.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                      }`}
                    >
                      {m.done ? <CircleCheckBig className="w-4 h-4" /> : <m.icon className="w-4 h-4" />}
                    </span>
                    <span className={`text-xs font-medium leading-tight ${m.done ? "text-emerald-600 line-through dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>{m.label}</span>
                    <span className="ml-auto text-[10px] font-bold text-amber-600 shrink-0 dark:text-amber-400">+20 XP</span>
                  </li>
                ))}
              </ul>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3 dark:bg-slate-800">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${(missionsDone / dailyMissions.length) * 100}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">Selesaikan semua misi untuk <span className="font-bold text-amber-600 dark:text-amber-400">+50 XP Guru</span>.</p>
            </div>
          )}
        </section>

        {/* ── MAIN BERSAMA (entry — kuis kelas, DI ATAS gim solo) ── */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-teal-600 via-emerald-700 to-teal-900 rounded-2xl p-5 text-white relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-400/20 rounded-full blur-[70px]" />
            <div className="absolute bottom-0 left-6 w-28 h-28 bg-teal-300/10 rounded-full blur-[50px]" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Main Bersama</p>
                  <h3 className="font-extrabold text-slate-50 leading-snug">Ajak seluruh kelas bermain langsung dengan soal BahasaCerdas.</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 border border-white/20">Jelajah Kata</span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 border border-white/20">Kota Cahaya</span>
                  </div>
                </div>
              </div>
              <Link
                href="/guru/game/main-bersama"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-sm hover:bg-emerald-50 hover:shadow transition-colors"
              >
                <Play className="w-4 h-4" /> Mulai Bersama
              </Link>
            </div>
          </div>
        </div>

        {/* ── MAIN GAME ─────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100" id="mainkan">Mainkan Gim</h2>
            <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold dark:bg-violet-900/40 dark:text-violet-300">SOLO</span>
            <Link href="/guru/game/lobby" className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700">
              Ruang Gim &amp; Tanding <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {SOLO_GAMES.map((game) => {
                const Icon = game.icon;
                const playCount = counts.get(game.title) ?? 0;
                const isTrending = topGameName === game.title && playCount > 0;
                const badge = isTrending
                  ? { label: "Populer", cls: "bg-orange-500" }
                  : game.id === "kata-play"
                    ? { label: "Baru", cls: "bg-violet-500" }
                    : game.id === "benar-salah"
                      ? { label: "Direkomendasikan", cls: "bg-emerald-500" }
                      : null;
                return (
                  <Link
                    key={game.id}
                    href={game.href}
                    className="group flex flex-col bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 dark:bg-slate-900 dark:border-slate-800"
                  >
                    <div className={`h-16 bg-gradient-to-br ${game.gradient} relative flex items-center justify-center shrink-0`}>
                      <Icon className="w-7 h-7 text-white/80" />
                      {badge && (
                        <span className={`absolute top-1.5 left-1.5 ${badge.cls} text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm`}>{badge.label}</span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-sm dark:text-slate-100">{game.title}</h3>
                        <span className="text-[9px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold shrink-0 dark:bg-violet-900/40 dark:text-violet-300">MULAI</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{game.desc}</p>
                      {playCount > 0 && (
                        <div className="mt-2">
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                            <div className={`h-full rounded-full transition-all duration-700 ${topGameName === game.title ? "bg-amber-400" : "bg-slate-300 dark:bg-slate-600"}`} style={{ width: `${Math.round((playCount / maxCount) * 100)}%` }} />
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 dark:text-slate-500">{playCount} kali dimainkan</p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PROGRESS GURU (Level + Badge progress) ────────── */}
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Medal className="w-4 h-4 text-violet-500" />
              <p className="font-bold text-slate-900 text-sm dark:text-slate-100">Level Guru</p>
              {lb?.myRank != null && (
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold flex items-center gap-1 dark:bg-amber-900/40 dark:text-amber-300">
                  <Trophy className="w-3 h-3" /> #{lb.myRank}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2 dark:text-slate-500">XP Guru minggu ini</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums dark:text-slate-100">{weeklyXp.toLocaleString("id-ID")}</span>
              <span className="text-xs text-slate-400 mb-1 dark:text-slate-500">/ {TARGET_MINGGUAN_XP.toLocaleString("id-ID")} target</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2 dark:bg-slate-800">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000" style={{ width: `${xpTargetPct}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{xpTargetPct}% tercapai</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Sisa {(TARGET_MINGGUAN_XP - weeklyXp).toLocaleString("id-ID")} XP menuju level berikutnya</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Medal className="w-4 h-4 text-violet-500" />
              <p className="font-bold text-slate-900 text-sm dark:text-slate-100">Perkembangan Lencana</p>
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold dark:bg-violet-900/40 dark:text-violet-300">{unlocked}/{totalGuruBadges}</span>
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
                      <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border ${b.unlocked ? meta.border : "border-slate-100 dark:border-slate-800"}`}>
                        <div className={b.unlocked ? "" : "grayscale opacity-60"}><BadgeIcon icon={badgeIcon} size={26} alt={b.name} /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold truncate ${b.unlocked ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>{b.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2 dark:text-slate-500">{b.unlocked ? "TERBUKA" : `${pct}%`}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 dark:bg-slate-800">
                          <div className={`h-full rounded-full transition-all duration-700 ${b.unlocked ? "bg-violet-400" : "bg-slate-300 dark:bg-slate-600"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada badge guru — mainkan gim dan aktivitas mengajar untuk membukanya.</p>
            )}
          </div>
        </div>

        {/* ── RINGKASAN AKTIVITAS KELAS + MURID TERAKTIF ────── */}
        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          {/* Ringkasan Aktivitas Kelas */}
          <section className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Ringkasan Aktivitas Kelas</h2>
              {totalMurid > 0 && !loading && (
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold dark:bg-emerald-900/40 dark:text-emerald-300">
                  {aktifHariIni}/{totalMurid} aktif
                </span>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-32" />
            ) : totalMurid === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada murid di kelas</p>
                <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Tambahkan murid ke kelas agar aktivitas gim mereka tampil di sini.</p>
                <Link href="/guru/data-siswa" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                  Kelola Murid
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniStat icon={<Users className="w-4 h-4 text-sky-500" />} label="Murid Aktif" value={`${aktifHariIni} dari ${totalMurid}`} />
                  <MiniStat icon={<Clock className="w-4 h-4 text-orange-500" />} label="Belum Bermain" value={String(belumBermain)} />
                  <MiniStat icon={<BarChart3 className="w-4 h-4 text-emerald-500" />} label="Rata-rata Skor" value={avgScore > 0 ? avgScore.toLocaleString("id-ID") : "—"} />
                  <MiniStat icon={<Gamepad2 className="w-4 h-4 text-violet-500" />} label="Gim Terpopuler" value={topGameName ?? "—"} />
                </div>

                {/* Progress kelas */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 dark:text-slate-400">
                    <span className="font-semibold">Keterlibatan kelas</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{kelasPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000" style={{ width: `${kelasPct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    {aktifHariIni} dari {totalMurid} murid sudah bermain hari ini{belumBermain > 0 ? ` — ${belumBermain} belum bermain` : ""}.
                  </p>
                </div>

                {belumBermain > 0 && (
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <a
                      href="#aktivitas-murid"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <BellRing className="w-3.5 h-3.5" /> Kirim Pengingat
                    </a>
                    <Link href="/guru/game/history" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                      Lihat Semua Aktivitas <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Murid Teraktif Hari Ini */}
          <section className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Murid Teraktif Hari Ini</h2>
            </div>
            {loading ? (
              <Skeleton className="h-40" />
            ) : topPerformers.length > 0 ? (
              <ol className="space-y-2.5">
                {topPerformers.map((res, i) => (
                  <li key={res.id} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                        i === 0
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : i === 1
                            ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            : i === 2
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {res.user?.fullName?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 truncate dark:text-slate-200">{res.user?.fullName || "Siswa"}</p>
                      <p className="text-[10px] text-slate-400 truncate dark:text-slate-500">
                        {resultGameLabel(res)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">{res.finalScore}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{res.xpEarned} XP</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-center py-6">
                <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada yang bermain hari ini</p>
                <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Ajak murid bermain gim — skor terbaik hari ini akan tampil di sini.</p>
              </div>
            )}
          </section>
        </div>

        {/* ── AKTIVITAS GIM MURID (preview + riwayat gabungan) ── */}
        <section id="aktivitas-murid" className="scroll-mt-24 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Aktivitas Gim Murid</h2>
            <Link href="/guru/game/history" className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline dark:text-sky-400">
              Lihat Semua Aktivitas <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-64" />
          ) : studentResults.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                {studentResults.slice(0, 5).map((res) => (
                  <Fragment key={res.id}>
                    <li
                      className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/40 transition-colors cursor-pointer dark:hover:bg-slate-800/60"
                      onClick={() => setExpandedActivity((cur) => (cur === res.id ? null : res.id))}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {res.user?.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-100">{res.user?.fullName || "Siswa"}</p>
                        <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 dark:text-slate-500">
                          {resultGameLabel(res)}
                          <span>{resultGameLabel(res)}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className={timeStatusTone(res.createdAt)}>{timeStatusLabel(res.createdAt)}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">{res.finalScore} poin</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{res.xpEarned} XP</p>
                      </div>
                    </li>
                    {expandedActivity === res.id && (
                      <li className="bg-sky-50/60 px-4 py-3 dark:bg-slate-800/60">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span><b className="text-green-600 dark:text-green-400">{res.correct}</b> benar</span>
                          <span><b className="text-red-500 dark:text-red-400">{res.wrong}</b> salah</span>
                          <span><b className="text-slate-700 dark:text-slate-200">{res.maxStreak}</b> rentetan maks</span>
                          <span><b className="text-emerald-600 dark:text-emerald-400">+{res.xpEarned}</b> XP</span>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /><b className="text-slate-700 dark:text-slate-200">{formatDurasi(res.session)}</b> durasi</span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <History className="w-3 h-3" />
                            {new Date(res.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </li>
                    )}
                  </Fragment>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between dark:border-slate-800">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">{aktifHariIni} murid bermain hari ini</span>
                <Link href="/guru/game/history" className="text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                  Semua Aktivitas →
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3 dark:bg-slate-800">
                <Users className="w-6 h-6 text-sky-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada aktivitas gim murid</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto dark:text-slate-500">
                Ajak murid bergabung ke kelas lalu bermain gim bersama — aktivitas, skor, dan XP mereka akan tampil di sini.
              </p>
              <Link href="/guru/game/lobby" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition-colors">
                <Play size={14} /> Buat Ruang Baru
              </Link>
            </div>
          )}
        </section>

        {/* ── AI INSIGHT (kartu rekomendasi) ───────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Analisis AI</h2>
            <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-semibold dark:bg-rose-900/40 dark:text-rose-300">Pratinjau · Segera Hadir</span>
          </div>
          <div className="bg-gradient-to-r from-rose-50 via-white to-emerald-50 rounded-xl border border-rose-100 p-5 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm dark:text-slate-100">Rekomendasi Cerdas untuk Kelasmu</p>
                {insight ? (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed dark:text-slate-400">{insight}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed dark:text-slate-400">
                    Analisis AI akan menghadirkan rekomendasi berdasarkan performa kelas (kosakata, kecepatan membaca,
                    ketepatan) setelah cukup data permainan tersedia.{" "}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Saran awal: minta murid bermain Susun Kata 3x minggu ini.</span>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="#aktivitas-murid"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <BellRing className="w-3.5 h-3.5" /> Kirim Pengingat
              </a>
              <Link href="/guru/game/leaderboard" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Lihat Ranking <ArrowRight size={12} />
              </Link>
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
    case "RIMBA_KATA": return "kuis-tempur";
    case "TEBAK_KATA": return "tebak-kata";
    case "SUSUN_KATA": return "susun-kata";
    case "BENAR_SALAH": return "benar-salah";
    case "IRAMA_KATA": return "irama-kata";
    case "KATAPLAY": return "kata-play";
    case "TEKA_TEKI_SILANG": return "teka-teki-silang";
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

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 dark:bg-slate-800/60 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wide dark:text-slate-500">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-sm font-extrabold text-slate-800 truncate dark:text-slate-100" title={value}>{value}</p>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`} />;
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
