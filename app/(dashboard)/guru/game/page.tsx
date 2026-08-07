"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Trophy,
  Play,
  BarChart3,
  ChevronDown,
  Zap,
  Star,
  Swords,
  History,
  Flame,
  Medal,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";

interface RoomLite {
  name: string | null;
  gameType: string | null;
}

interface ResultRow {
  id: string;
  finalScore: number;
  correct: number;
  wrong: number;
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

const GAME_TYPE_LABELS: Record<string, string> = {
  KUIS_BATTLE: "Kuis Battle",
  TEBAC_KATA: "Tebak Kata",
  KOSAKATA_HARIAN: "Kosakata Harian",
  KATA_SERU: "Kata Seru",
  GOLD_RUSH: "Gold Rush",
  SPEED_BATTLE: "Adu Cepat",
  SURVIVAL: "Survival",
  TIMED_TRIAL: "Timed Trial",
};

function statusOf(result: StudentResult): { label: string; cls: string } {
  const diffH = (Date.now() - new Date(result.createdAt).getTime()) / 3_600_000;
  if (diffH < 24) return { label: "Hari ini", cls: "bg-emerald-100 text-emerald-700" };
  if (diffH < 168) return { label: "Minggu ini", cls: "bg-blue-100 text-blue-700" };
  return { label: "Lama", cls: "bg-slate-100 text-slate-500" };
}

function topGames(results: StudentResult[], myResults: ResultRow[]): { name: string; count: number }[] {
  const weekAgo = Date.now() - 7 * 24 * 3_600_000;
  const counts = new Map<string, number>();
  for (const r of [...results, ...myResults]) {
    if (new Date(r.createdAt).getTime() < weekAgo) continue;
    const key = r.room?.gameType || r.room?.name || "Gim";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name: GAME_TYPE_LABELS[name] || name, count }));
}

export default function GuruGameHubPage() {
  const [data, setData] = useState<GameHubData | null>(null);
  const [badges, setBadges] = useState<BadgesData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRiwayat, setShowRiwayat] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/guru/game-hub").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/player/badges").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/guru/leaderboard").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([hub, bd, lb]) => {
        setData(hub);
        setBadges(bd);
        setLeaderboard(lb);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalHasil = (data?.studentResults?.length || 0) + (data?.myResults?.length || 0);
  const muridAktif = new Set(data?.studentResults?.map((r) => r.user?.id).filter(Boolean)).size || 0;
  const guruBadges = badges?.badges?.filter((b) => b.code.startsWith("guru-")) || [];
  const guruUnlocked = guruBadges.filter((b) => b.unlocked).length;
  const populer = topGames(data?.studentResults || [], data?.myResults || []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      {/* Hero — ringkas (-35% tinggi) */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/20 rounded-full blur-[90px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 lg:py-7">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold">Gim Guru</h1>
              <p className="text-emerald-200 text-xs lg:text-sm">Bermain gim seperti murid, kumpulkan XP dan lencana guru</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick Action */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/guru/game#solo" className="group flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0"><Play className="w-4 h-4 text-white" /></div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm">Main Sekarang</p>
              <p className="text-[11px] text-slate-400 truncate">Lanjutkan dari gim solo</p>
            </div>
          </Link>
          <Link href="/guru/game#solo" className="group flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0"><Flame className="w-4 h-4 text-white" /></div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm">Tantangan Hari Ini</p>
              <p className="text-[11px] text-slate-400 truncate">Raih XP gim harian</p>
            </div>
          </Link>
          <Link href="/guru/game/achievement" className="group flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-violet-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0"><Star className="w-4 h-4 text-white" /></div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm">Badge Saya</p>
              <p className="text-[11px] text-slate-400 truncate">{loading ? "..." : `${guruUnlocked}/${guruBadges.length} lencana terbuka`}</p>
            </div>
          </Link>
        </div>

        {/* Statistik Guru */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"><BookOpen className="w-3.5 h-3.5" /> Soal Tersedia</div>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{loading ? "..." : data?.questionCount || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"><BarChart3 className="w-3.5 h-3.5" /> Hasil Tercatat</div>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{loading ? "..." : totalHasil}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"><Users className="w-3.5 h-3.5" /> Murid Aktif</div>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{loading ? "..." : muridAktif}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"><Medal className="w-3.5 h-3.5" /> Lencana Guru</div>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {loading ? "..." : leaderboard?.myRank != null ? `#${leaderboard.myRank}` : `${guruUnlocked} terbuka`}
            </p>
          </div>
        </div>

        {/* Mainkan Gim — CTA utama */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800" id="solo">Mainkan Gim</h2>
            <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">SOLO</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { id: "lari-kata", title: "Lari Kata", desc: "Jawab 20 soal dalam 60 detik! Makin cepat dan rentetan tinggi, makin banyak XP.", href: "/guru/game/lari-kata", gradient: "from-violet-500 via-purple-600 to-violet-800", icon: Zap },
              { id: "benar-salah", title: "Benar atau Salah", desc: "Kuis kilat 60 detik! Tentukan pernyataan yang muncul benar atau salah.", href: "/guru/game/benar-salah", gradient: "from-emerald-400 via-teal-500 to-cyan-600", icon: Star },
              { id: "susun-kata", title: "Susun Kata", desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kosakata Anda!", href: "/guru/game/susun-kata", gradient: "from-emerald-500 via-emerald-600 to-teal-700", icon: BookOpen },
              { id: "tebak-kata", title: "Tebak Kata", desc: "Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.", href: "/guru/game/tebak-kata", gradient: "from-blue-500 via-blue-600 to-indigo-700", icon: Swords },
              { id: "irama-kata", title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk hanya yang sesuai aturan level.", href: "/guru/game/irama-kata", gradient: "from-orange-500 via-rose-500 to-red-600", icon: Zap },
              { id: "menara", title: "Menara Cerdas", desc: "Panjat menara dengan soal pelajaran murid! Jawab benar untuk naik.", href: "/guru/game/menara", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: Trophy },
              { id: "kata-play", title: "KataPlay", desc: "Belajar membaca dari nol! 4 tingkat, puluhan soal seru.", href: "/guru/game/kata-play", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: BookOpen },
            ].map((game) => {
              const Icon = game.icon;
              return (
                <Link key={game.id} href={game.href} className="group flex flex-col bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className={`h-20 bg-gradient-to-br ${game.gradient} relative overflow-hidden flex items-center justify-center shrink-0`}>
                    <Icon className="w-9 h-9 text-white/80" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm">{game.title}</h3>
                      <span className="text-[9px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold shrink-0">MULAI</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{game.desc}</p>
                    <div className="flex items-center gap-3 mt-auto pt-3 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> ~3 menit</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Game Terpopuler Minggu Ini */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Game Terpopuler Minggu Ini</h2>
          </div>
          {populer.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {populer.map((g, i) => {
                const max = populer[0].count;
                return (
                  <div key={g.name} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-800">{g.name}</span>
                      <span className="text-xs font-bold text-emerald-600">{g.count}x</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-400" : "bg-amber-700"}`} style={{ width: `${max ? Math.round((g.count / max) * 100) : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center shadow-sm">
              <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">Belum ada data minggu ini</p>
              <p className="text-xs text-slate-400 mt-1">Setelah guru dan murid bermain gim, peringkat popularitas akan tampil di sini.</p>
            </div>
          )}
        </div>

        {/* Progress Guru — Peringkat + Lencana */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Progress Guru</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/guru/game/leaderboard" className="group bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-amber-500" />
                <p className="font-bold text-slate-900 text-sm">Peringkat Guru</p>
                {leaderboard?.myRank != null && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">#Peringkat {leaderboard.myRank}</span>
                )}
              </div>
              {loading ? (
                <div className="text-xs text-slate-400 py-2">Memuat...</div>
              ) : leaderboard && leaderboard.entries.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.entries.slice(0, 3).map((e, i) => (
                    <div key={e.userId} className="flex items-center gap-2 text-xs">
                      <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {e.fullName?.charAt(0) || "G"}
                      </div>
                      <span className="font-medium text-slate-700 truncate">{e.fullName || "Guru"}</span>
                      <span className="ml-auto font-bold text-emerald-600">{e.xp.toLocaleString("id-ID")} XP</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">Belum ada peringkat — mainkan gim untuk mulai mengumpulkan XP Guru.</p>
              )}
            </Link>
            <Link href="/guru/game/achievement" className="group bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Medal className="w-4 h-4 text-violet-500" />
                <p className="font-bold text-slate-900 text-sm">Lencana Guru</p>
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">{guruUnlocked}/{guruBadges.length}</span>
              </div>
              {loading ? (
                <div className="text-xs text-slate-400 py-2">Memuat...</div>
              ) : guruBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {guruBadges.slice(0, 6).map((b) => {
                    const badgeIcon = b.icon?.trim() || "⭐";
                    return (
                      <span key={b.code} className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg font-semibold border ${b.unlocked ? "bg-violet-50 text-violet-700 border-violet-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                        <BadgeIcon icon={badgeIcon} size={16} alt={b.name} />
                        <span>{b.name}</span>
                      </span>
                    );
                  })}
                  {guruBadges.length > 6 && (
                    <span className="text-[10px] text-slate-400 self-center">+{guruBadges.length - 6} lainnya</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">Belum ada lencana guru — kumpulkan XP Guru untuk membukanya.</p>
              )}
            </Link>
          </div>
        </div>

        {/* Aktivitas Murid — Pemantauan */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Aktivitas Murid</h2>
          </div>
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">Memuat aktivitas murid...</p>
            </div>
          ) : data && data.studentResults.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <ul className="divide-y divide-slate-50">
                {data.studentResults.slice(0, 5).map((r) => {
                  const st = statusOf(r);
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {r.user?.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.user?.fullName || "Siswa"}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {r.user?.profile?.school || "Sekolah belum diisi"} · {r.room?.name || GAME_TYPE_LABELS[r.room?.gameType || ""] || "Gim"}
                        </p>
                      </div>
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-xs font-bold text-slate-700">{r.finalScore} poin</p>
                        <p className="text-[10px] text-slate-400">+{r.xpEarned} XP</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ${st.cls}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{muridAktif} murid tercatat bermain</span>
                <Link href="/guru/data-siswa" className="text-xs text-emerald-600 font-semibold hover:underline">
                  Kelola Data Siswa
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Belum ada aktivitas gim murid</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Ajak murid bergabung ke kelas lalu bermain gim bersama — aktivitas, skor, dan XP mereka akan tampil di sini.
              </p>
              <Link href="/guru/game/lobby" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                <Play size={14} /> Buat Ruang Gim
              </Link>
            </div>
          )}
        </div>

        {/* Riwayat Permainan — toggle */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowRiwayat((v) => !v)}
            className="w-full flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0"><History className="w-4 h-4 text-white" /></div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-sm">Riwayat Permainan</p>
                <p className="text-[11px] text-slate-400">{loading ? "..." : totalHasil} hasil tercatat — klik untuk melihat</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showRiwayat ? "rotate-180" : ""}`} />
          </button>

          {showRiwayat && (
            <div className="mt-4">
              {loading ? (
                <div className="text-center py-8 text-slate-400">Memuat...</div>
              ) : data && data.studentResults.length > 0 ? (
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
                        {data.studentResults.map((r) => (
                          <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {r.user?.fullName?.charAt(0) || "?"}
                                </div>
                                <span className="font-medium text-slate-700 text-xs">{r.user?.fullName || "Siswa"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{r.room?.name || GAME_TYPE_LABELS[r.room?.gameType || ""] || "Gim"}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-emerald-600">{r.finalScore}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-green-600">{r.correct}</td>
                            <td className="px-4 py-3 text-center text-xs text-red-500">{r.wrong}</td>
                            <td className="px-4 py-3 text-right text-xs text-slate-400">
                              {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
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
          )}
        </div>

        {/* Insight AI */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Insight AI</h2>
          </div>
          <div className="bg-gradient-to-br from-violet-50 via-white to-emerald-50 rounded-xl border border-violet-100 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Analitik cerdas untuk kelas Anda</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Insight AI akan menghadirkan rekomendasi gim berdasarkan performa kelas, prediksi murid yang perlu
                  perhatian, dan ringkasan tren literasi otomatis. Fitur ini sedang disiapkan — pantau terus pembaruan
                  BahasaCerdas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
