"use client";

import Link from "next/link";
import { MULTIPLAYER_ENABLED } from "@/lib/features";

// Better inline SVG icons for games
const BattleIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 11l5-5 5 5M7 13l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const DashIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SusunIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7V4h16v3M4 7h16M4 12h16M4 17h16M9 12h6M9 17h6" strokeLinecap="round"/></svg>;
const TebakIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 115.36 1.36 3 3 0 01-2.36 3.64M12 17v-2"/></svg>;
const DuelIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 5l4.5 14-9.5 4.5L5 19l4.5-14z" strokeLinecap="round"/><path d="M12 5l4.5 14" strokeLinecap="round"/></svg>;
const PuzzleIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6zM9 9h6v6H9z" strokeLinecap="round"/></svg>;
const PantunIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l16 16M4 20L20 4" strokeLinecap="round"/><path d="M9 9h.01M14 10h.01M10 14h.01M15 15h.01" strokeLinecap="round"/></svg>;
const KoreksiIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round"/></svg>;

const GAMES = [
  {
    id: "battle",
    title: "Kuis Tempur",
    subtitle: "Multipemain Langsung",
    desc: "Adu cepat menjawab soal Bahasa Indonesia secara langsung melawan teman sekelas! 10 soal, siapa tercepat & terbanyak menang.",
    Icon: BattleIcon,
    gradient: "from-red-500 via-red-600 to-rose-700",
    href: "/murid/game/lobby",
    status: "LIVE",
    badge: "POPULER",
    badgeColor: "bg-red-500",
    players: "2-8 Pemain",
    time: "~5 menit",
  },
  {
    id: "katastra",
    title: "Katastra",
    subtitle: "Pusat Gim Kata",
    desc: "Taklukkan kata, kuasai bahasa! Lari Kata, Duel Kata, dan Teka-teki Makna dalam satu tempat.",
    Icon: DashIcon,
    gradient: "from-violet-500 via-purple-600 to-violet-800",
    href: "/murid/katastra",
    status: "LIVE",
    badge: "BARU",
    badgeColor: "bg-emerald-500",
    players: "Solo + Multi",
    time: "~3-5 menit",
  },
  {
    id: "dash",
    title: "Lari Kata",
    subtitle: "Lari Cepat Solo",
    desc: "Jawab 20 soal dalam 60 detik! Makin cepat + rentetan tinggi = makin banyak Poin Pengalaman. Buktikan kecepatanmu!",
    Icon: DashIcon,
    gradient: "from-violet-500 via-purple-600 to-violet-800",
    href: "/murid/katastra/dash",
    status: "LIVE",
    badge: "BARU",
    badgeColor: "bg-emerald-500",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "susun",
    title: "Susun Kata",
    subtitle: "Teka-teki Kata",
    desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kemampuan kosakatamu dalam waktu terbatas.",
    Icon: SusunIcon,
    gradient: "from-emerald-500 via-emerald-600 to-teal-700",
    href: "/murid/game/susun-kata",
    status: "LIVE",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "tebak",
    title: "Tebak Kata",
    subtitle: "Tebak Kata",
    desc: "Deskripsi muncul, tebak katanya! Semakin cepat menebak, semakin tinggi skormu.",
    Icon: TebakIcon,
    gradient: "from-blue-500 via-blue-600 to-indigo-700",
    href: "/murid/game/tebak-kata",
    status: "LIVE",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "duel",
    title: "Duel Kata",
    subtitle: "Pertarungan 1 Lawan 1",
    desc: "Tantang temanmu duel 1v1! Giliran menjawab, siapa paling benar dia juara. Seru dan menegangkan!",
    Icon: DuelIcon,
    gradient: "from-orange-500 via-orange-600 to-red-700",
    href: "#",
    status: "COMING_SOON",
    players: "2 Pemain",
    time: "~5 menit",
  },
  {
    id: "puzzle",
    title: "Teka-teki Makna",
    subtitle: "Koneksi Harian",
    desc: "16 kata, 4 grup, 1 tema. Tebak hubungan antar kata. Teka-teki baru setiap hari!",
    Icon: PuzzleIcon,
    gradient: "from-cyan-500 via-cyan-600 to-blue-700",
    href: "#",
    status: "COMING_SOON",
    players: "Solo",
    time: "~5 menit",
  },
  {
    id: "pantun",
    title: "Raja Pantun",
    subtitle: "Menulis Kreatif",
    desc: "Lengkapi pantun dengan pilihan kata terbaik. Makin kreatif dan benar, makin tinggi skor!",
    Icon: PantunIcon,
    gradient: "from-pink-500 via-pink-600 to-rose-700",
    href: "#",
    status: "COMING_SOON",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "koreksi",
    title: "Koreksi Cepat",
    subtitle: "Berburu Kesalahan",
    desc: "Cari dan perbaiki kesalahan dalam kalimat. Mode lari cepat! Cocok untuk yang jago EYD/PUEBI.",
    Icon: KoreksiIcon,
    gradient: "from-amber-500 via-amber-600 to-yellow-700",
    href: "#",
    status: "COMING_SOON",
    players: "Solo",
    time: "~3 menit",
  },
];

export default function GameHubPage() {
  // Multiplayer server offline → move Kuis Tempur into the "Segera Hadir" section.
  const gamesList = GAMES.map(g =>
    g.id === "battle" && !MULTIPLAYER_ENABLED
      ? { ...g, status: "COMING_SOON", subtitle: "Segera Hadir" }
      : g
  );
  const liveGames = gamesList.filter(g => g.status === "LIVE");
  const comingSoon = gamesList.filter(g => g.status === "COMING_SOON");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Gim Bahasa Indonesia</h1>
              <p className="text-violet-200 text-sm">Belajar sambil bermain — asyik dan nagih!</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {liveGames.length} Gim Aktif
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <svg className="w-3 h-3 text-green-300" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 4 4 0 011 8 1 1 0 10-2 0z"/></svg>
              {comingSoon.length} Segera Hadir
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Active Games */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Mainkan Sekarang</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {liveGames.map((game) => (
              <Link
                key={game.id}
                href={game.href}
                className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`h-24 bg-gradient-to-br ${game.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <game.Icon />
                  </div>
                  {game.badge && (
                    <div className={`absolute top-2 left-2 ${game.badgeColor} text-white text-[9px] font-bold px-2 py-0.5 rounded-full`}>
                      {game.badge}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{game.title}</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{game.subtitle}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">LANGSUNG</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{game.desc}</p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">{game.players}</span>
                    <span className="text-[10px] text-slate-400">{game.time}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            <h2 className="text-lg font-bold text-slate-800">Segera Hadir</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {comingSoon.map((game) => (
              <div key={game.id} className="relative bg-white/50 rounded-2xl border border-slate-100 overflow-hidden opacity-70">
                <div className={`h-20 bg-gradient-to-br ${game.gradient} relative overflow-hidden flex items-center justify-center`}>
                  <game.Icon />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="bg-black/50 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      SEGERA HADIR
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-700 text-sm">{game.title}</h3>
                  <p className="text-[10px] text-slate-400">{game.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}