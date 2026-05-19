"use client";

import Link from "next/link";
import { Swords, Zap, Puzzle, Brain, MessageCircle, Gauge, Gamepad2, Sparkles, Users, Clock, Star, Trophy } from "lucide-react";

const GAMES = [
  {
    id: "battle",
    title: "Kuis Tempur",
    subtitle: "Multipemain Langsung",
    desc: "Adu cepat menjawab soal Bahasa Indonesia secara langsung melawan teman sekelas! 10 soal, siapa tercepat & terbanyak menang.",
    emoji: "⚔️",
    gradient: "from-red-500 via-red-600 to-rose-700",
    href: "/murid/game/lobby",
    status: "LIVE" as const,
    players: "2-8 Pemain",
    time: "~5 menit",
    badge: "POPULER",
    badgeColor: "bg-red-500",
  },
  {
    id: "dash",
    title: "Lari Kata",
    subtitle: "Lari Cepat Solo",
    desc: "Jawab 20 soal dalam 60 detik! Makin cepat + rentetan tinggi = makin banyak Poin Pengalaman. Buktikan kecepatanmu!",
    emoji: "⚡",
    gradient: "from-violet-500 via-purple-600 to-violet-800",
    href: "/murid/katastra/dash",
    status: "LIVE" as const,
    players: "Solo",
    time: "~3 menit",
    badge: "BARU",
    badgeColor: "bg-emerald-500",
  },
  {
    id: "susun",
    title: "Susun Kata",
    subtitle: "Teka-teki Kata",
    desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kemampuan kosakatamu dalam waktu terbatas.",
    emoji: "🔤",
    gradient: "from-emerald-500 via-emerald-600 to-teal-700",
    href: "/murid/game/susun-kata",
    status: "LIVE" as const,
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "tebak",
    title: "Tebak Kata",
    subtitle: "Tebak Kata",
    desc: "Deskripsi muncul, tebak katanya! Semakin cepat menebak, semakin tinggi skormu.",
    emoji: "🤔",
    gradient: "from-blue-500 via-blue-600 to-indigo-700",
    href: "/murid/game/tebak-kata",
    status: "LIVE" as const,
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "duel",
    title: "Duel Kata",
    subtitle: "Pertarungan 1 Lawan 1",
    desc: "Tantang temanmu duel 1v1! Giliran menjawab, siapa paling benar dia juara. Seru dan menegangkan!",
    emoji: "🤺",
    gradient: "from-orange-500 via-orange-600 to-red-700",
    href: "#",
    status: "COMING_SOON" as const,
    players: "2 Pemain",
    time: "~5 menit",
  },
  {
    id: "puzzle",
    title: "Teka-teki Makna",
    subtitle: "Koneksi Harian",
    desc: "16 kata, 4 grup, 1 tema. Tebak hubungan antar kata. Teka-teki baru setiap hari!",
    emoji: "🧩",
    gradient: "from-cyan-500 via-cyan-600 to-blue-700",
    href: "#",
    status: "COMING_SOON" as const,
    players: "Solo",
    time: "~5 menit",
  },
  {
    id: "pantun",
    title: "Raja Pantun",
    subtitle: "Menulis Kreatif",
    desc: "Lengkapi pantun dengan pilihan kata terbaik. Makin kreatif dan benar, makin tinggi skor!",
    emoji: "🎭",
    gradient: "from-pink-500 via-pink-600 to-rose-700",
    href: "#",
    status: "COMING_SOON" as const,
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "koreksi",
    title: "Koreksi Cepat",
    subtitle: "Berburu Kesalahan",
    desc: "Cari dan perbaiki kesalahan dalam kalimat. Mode lari cepat! Cocok untuk yang jago EYD/PUEBI.",
    emoji: "🔍",
    gradient: "from-amber-500 via-amber-600 to-yellow-700",
    href: "#",
    status: "COMING_SOON" as const,
    players: "Solo",
    time: "~3 menit",
  },
];

export default function GameHubPage() {
  const liveGames = GAMES.filter(g => g.status === "LIVE");
  const comingSoon = GAMES.filter(g => g.status === "COMING_SOON");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Gamepad2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Gim Bahasa Indonesia</h1>
              <p className="text-violet-200 text-sm">Belajar sambil bermain — asyik dan nagih!</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <Zap size={12} className="text-yellow-300" /> {liveGames.length} Gim Aktif
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <Clock size={12} className="text-green-300" /> {comingSoon.length} Segera Hadir
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <Users size={12} className="text-blue-300" /> Multipemain & Solo
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
                {/* Colored top bar */}
                <div className={`h-24 bg-gradient-to-br ${game.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute -bottom-4 -right-4 text-5xl opacity-30 group-hover:scale-125 group-hover:opacity-40 transition-all duration-300">
                    {game.emoji}
                  </div>
                  {game.badge && (
                    <div className={`absolute top-2 left-2 ${game.badgeColor} text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg`}>
                      {game.badge}
                    </div>
                  )}
                  <div className="relative z-10 p-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                      <span className="text-lg">{game.emoji}</span>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{game.title}</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{game.subtitle}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">LANGSUNG</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{game.desc}</p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Users size={10} /> {game.players}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {game.time}
                    </span>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-100 group-hover:ring-violet-200 transition-all pointer-events-none" />
              </Link>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={16} className="text-violet-400" />
            <h2 className="text-lg font-bold text-slate-800">Segera Hadir</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {comingSoon.map((game) => (
              <div
                key={game.id}
                className="relative bg-white/50 rounded-2xl border border-slate-100 overflow-hidden opacity-70 cursor-not-allowed"
              >
                <div className={`h-20 bg-gradient-to-br ${game.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute -bottom-3 -right-3 text-4xl opacity-20">{game.emoji}</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/40 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      SEGERA HADIR
                    </span>
                  </div>
                  <div className="relative z-10 p-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <span className="text-base">{game.emoji}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-700 text-sm">{game.title}</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{game.subtitle}</p>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{game.desc}</p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><Users size={10} /> {game.players}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {game.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats footer */}
        <div className="mt-10 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trophy size={18} className="text-violet-500" />
            <span className="font-bold text-slate-700 text-sm">Mainkan dan kumpulkan Poin Pengalaman!</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-extrabold text-violet-600">{GAMES.length}</p>
              <p className="text-[10px] text-slate-500">Total Gim</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-violet-600">{liveGames.length}</p>
              <p className="text-[10px] text-slate-500">Gim Aktif</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-violet-600">SD-SMA</p>
              <p className="text-[10px] text-slate-500">Kurikulum Merdeka</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
