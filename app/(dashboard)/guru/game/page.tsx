"use client";

import Link from "next/link";

const BattleIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 11l5-5 5 5M7 13l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SetupIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const QuestionIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StudentIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// Solo games icons
const DashIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SusunIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7V4h16v3M4 7h16M4 12h16M4 17h16M9 12h6M9 17h6" strokeLinecap="round"/></svg>;
const TebakIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 115.36 1.36 3 3 0 01-2.36 3.64M12 17v-2"/></svg>;
const PuzzleIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6zM9 9h6v6H9z" strokeLinecap="round"/></svg>;
const PantunIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l16 16M4 20L20 4" strokeLinecap="round"/><path d="M9 9h.01M14 10h.01M10 14h.01M15 15h.01" strokeLinecap="round"/></svg>;
const KoreksiIcon = () => <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round"/></svg>;

const GAMES = [
  {
    id: "battle",
    title: "Kuis Battle",
    subtitle: "Buat Ruang Gim",
    desc: "Buat ruang gim dan ajak siswa untuk bermain Kuis Battle secara multiplayer! Bisa untuk pembelajaran di kelas.",
    Icon: BattleIcon,
    gradient: "from-emerald-500 via-green-600 to-teal-700",
    href: "/guru/game/lobby",
    status: "LIVE",
    badge: "MULTIPLAYER",
    badgeColor: "bg-emerald-500",
    players: "2-8 Pemain",
    time: "~5 menit",
  },
  {
    id: "setup",
    title: "Atur Gim",
    subtitle: "Pengaturan Game",
    desc: "Atur jumlah soal, waktu per soal, dan tingkat kesulitan untuk режим gim yang kamu buat.",
    Icon: SetupIcon,
    gradient: "from-blue-500 via-cyan-600 to-indigo-700",
    href: "#",
    status: "COMING_SOON",
    players: "Custom",
    time: "Fleksibel",
  },
  {
    id: "question",
    title: "Bank Soal Gim",
    subtitle: "Soal untuk Game",
    desc: "Siapkan dan kelola soal-soal yang akan digunakan dalam режим gim Kuis Battle.",
    Icon: QuestionIcon,
    gradient: "from-amber-500 via-orange-600 to-yellow-700",
    href: "/guru/bank-soal",
    status: "LIVE",
    players: "Semua Kelas",
    time: "Tersedia",
  },
  {
    id: "student",
    title: "Monitoring Siswa",
    subtitle: "Lihat Aktivitas",
    desc: "Lihat aktivitas dan progres siswa dalam игра Kuis Battle. Pantau skor danAchievement mereka.",
    Icon: StudentIcon,
    gradient: "from-violet-500 via-purple-600 to-pink-700",
    href: "/guru/data-siswa",
    status: "LIVE",
    players: "Semua Siswa",
    time: "Real-time",
  },
];

const SOLO_GAMES = [
  {
    id: "dash",
    title: "Lari Kata",
    subtitle: "Solo - Lari Cepat",
    desc: "Jawab 20 soal dalam 60 detik! Makin cepat + rentetan tinggi = makin banyak XP.",
    Icon: DashIcon,
    gradient: "from-violet-500 via-purple-600 to-violet-800",
    href: "/guru/game/lari-kata",
    status: "LIVE",
    badge: "SOLO",
    badgeColor: "bg-violet-500",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "susun",
    title: "Susun Kata",
    subtitle: "Solo - Teka-teki",
    desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kosakatamu!",
    Icon: SusunIcon,
    gradient: "from-emerald-500 via-emerald-600 to-teal-700",
    href: "/guru/game/susun-kata",
    status: "LIVE",
    badge: "SOLO",
    badgeColor: "bg-emerald-500",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "tebak",
    title: "Tebak Kata",
    subtitle: "Solo - Tebak Kata",
    desc: "Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.",
    Icon: TebakIcon,
    gradient: "from-blue-500 via-blue-600 to-indigo-700",
    href: "/guru/game/tebak-kata",
    status: "LIVE",
    badge: "SOLO",
    badgeColor: "bg-blue-500",
    players: "Solo",
    time: "~3 menit",
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

export default function GuruGameHubPage() {
  const liveGames = GAMES.filter(g => g.status === "LIVE");
  const comingSoon = GAMES.filter(g => g.status === "COMING_SOON");
  const soloGames = SOLO_GAMES.filter(g => g.status === "LIVE");
  const soloComingSoon = SOLO_GAMES.filter(g => g.status === "COMING_SOON");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Kuis Battle Guru</h1>
              <p className="text-emerald-200 text-sm">Kelola dan buat gim interaktif untuk siswa</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {liveGames.length} Fitur Aktif
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <svg className="w-3 h-3 text-blue-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Untuk Pembelajaran
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Active Games */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Menu Utama</h2>
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
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">AKTIF</span>
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

        {/* Solo Games for Guru */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Gim Solo (Bermain Sendiri)</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {soloGames.map((game) => (
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
                    <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">LANGSUNG</span>
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

        {/* Solo Coming Soon */}
        {soloComingSoon.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              <h2 className="text-lg font-bold text-slate-800">Gim Solo Segera Hadir</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {soloComingSoon.map((game) => (
                <div key={game.id} className="relative bg-white/50 rounded-2xl border border-slate-100 overflow-hidden opacity-70">
                  <div className={`h-20 bg-gradient-to-br ${game.gradient} relative overflow-hidden flex items-center justify-center`}>
                    <game.Icon />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="bg-black/50 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">SEGERA HADIR</span>
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
        )}

        {/* Coming Soon */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
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