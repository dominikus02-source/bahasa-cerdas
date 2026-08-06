"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Users, Trophy, Clock, Play, BarChart3, ChevronRight, Zap, Star, Swords } from "lucide-react";

interface GameHubData {
  questionCount: number;
  myResults: any[];
  studentResults: any[];
  activeRooms: any[];
}

export default function GuruGameHubPage() {
  const [data, setData] = useState<GameHubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guru/game-hub")
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Gim Guru</h1>
              <p className="text-emerald-200 text-sm">Arena Guru — bermain gim BahasaCerdas seperti murid, dapatkan XP dan lencana guru</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <BookOpen className="w-3 h-3 text-yellow-300" />
              {loading ? "..." : data?.questionCount || 0} Soal Tersedia
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs">
              <BarChart3 className="w-3 h-3 text-blue-300" />
              {loading ? "..." : (data?.studentResults?.length || 0) + (data?.myResults?.length || 0)} Hasil Tercatat
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Menu (management/battlepad) — dipertahankan per ADDENDUM */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Menu Utama</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Kuis Battle — create room */}
            <Link href="/guru/game/lobby" className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-24 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 relative overflow-hidden flex items-center justify-center">
                <Swords className="w-10 h-10 text-white/80" />
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">BUAT RUANG</div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Kuis Battle</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Buat Ruang Gim</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">AKTIF</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">Buat ruang gim, pilih mode, dan undang siswa bermain. Tersedia {data?.questionCount || 0} soal.</p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">2-8 Pemain</span>
                  <span className="text-[10px] text-slate-400">~5 menit</span>
                </div>
              </div>
            </Link>

              {/* Ruang Aktif */}
            <div className="relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-24 bg-gradient-to-br from-blue-500 via-cyan-600 to-indigo-700 relative overflow-hidden flex items-center justify-center">
                <Play className="w-10 h-10 text-white/80" />
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {data?.activeRooms?.length || 0} AKTIF
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Ruang Aktif</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Sedang Bermain</p>
                  </div>
                  <Link href="/guru/game/lobby" className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold hover:bg-blue-200">LIHAT</Link>
                </div>
                {data != null && data.activeRooms != null && data.activeRooms.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {data.activeRooms.slice(0, 3).map((r: any) => (
                      <div key={r.id} className="text-xs text-slate-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {r.name} — {r.code}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Belum ada ruang aktif. Buat ruang baru untuk mulai.</p>
                )}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">Waktu nyata</span>
                  <span className="text-[10px] text-slate-400">Multiplayer</span>
                </div>
              </div>
            </div>

            {/* Bank Soal Gim — show question stats */}
            <Link href="/guru/game/lobby" className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-24 bg-gradient-to-br from-amber-500 via-orange-600 to-yellow-700 relative overflow-hidden flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-white/80" />
                <div className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{loading ? "..." : data?.questionCount || 0} SOAL</div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Bank Soal Gim</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Soal untuk Gim</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">TERSEDIA</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{data?.questionCount || 0} soal tersedia dalam bank soal gim. Pilih soal untuk mode Kuis Battle.</p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">Semua Kelas</span>
                  <span className="text-[10px] text-slate-400">Tersedia</span>
                </div>
              </div>
            </Link>

            {/* Monitoring Siswa — show student activity */}
            <Link href="/guru/data-siswa" className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-24 bg-gradient-to-br from-violet-500 via-purple-600 to-pink-700 relative overflow-hidden flex items-center justify-center">
                <Users className="w-10 h-10 text-white/80" />
                <div className="absolute top-2 left-2 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{loading ? "..." : data?.studentResults?.length || 0} HASIL</div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Pemantauan Siswa</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Aktivitas Gim</p>
                  </div>
                  <Link href="/guru/data-siswa" className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold hover:bg-violet-200">SISWA</Link>
                </div>
                {data != null && data.studentResults != null && data.studentResults.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {data.studentResults.slice(0, 3).map((r: any) => (
                      <div key={r.id} className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[8px] font-bold text-violet-700 shrink-0">
                          {r.user?.fullName?.charAt(0) || "?"}
                        </span>
                        <span className="truncate">{r.user?.fullName || "Siswa"}</span>
                        <span className="ml-auto font-semibold text-violet-700">{r.finalScore}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Belum ada aktivitas gim. Ajak siswa bermain!</p>
                )}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">Semua Siswa</span>
                  <span className="text-[10px] text-slate-400">Waktu nyata</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Riwayat Game Siswa */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-800">Riwayat Gim Siswa</h2>
            </div>
            <Link href="/guru/data-siswa" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Memuat...</div>
          ) : data != null && data.studentResults != null && data.studentResults.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
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
                    {data.studentResults.map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {r.user?.fullName?.charAt(0) || "?"}
                            </div>
                            <span className="font-medium text-slate-700 text-xs">{r.user?.fullName || "Siswa"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.room?.name || r.room?.gameType || "Gim"}</td>
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
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada riwayat gim siswa</p>
              <p className="text-xs text-slate-400 mt-1">Ajak siswa bermain Kuis Battle untuk melihat hasilnya di sini.</p>
              <Link href="/guru/game/lobby" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                <Play size={14} /> Buat Ruang Baru
              </Link>
            </div>
          )}
        </div>

        {/* Gim Sendiri */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800" id="solo">Gim Solo (Bermain Sendiri)</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: "lari-kata", title: "Lari Kata", desc: "Jawab 20 soal dalam 60 detik! Makin cepat + rentetan tinggi = makin banyak XP.", href: "/guru/game/lari-kata", gradient: "from-violet-500 via-purple-600 to-violet-800", icon: Zap },
              { id: "benar-salah", title: "Benar atau Salah", desc: "Kuis kilat 60 detik! Tentukan jawaban yang muncul benar atau salah.", href: "/guru/game/benar-salah", gradient: "from-emerald-400 via-teal-500 to-cyan-600", icon: Star },
              { id: "susun-kata", title: "Susun Kata", desc: "Huruf-huruf acak! Susun menjadi kata yang benar. Uji kosakatamu!", href: "/guru/game/susun-kata", gradient: "from-emerald-500 via-emerald-600 to-teal-700", icon: BookOpen },
              { id: "tebak-kata", title: "Tebak Kata", desc: "Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.", href: "/guru/game/tebak-kata", gradient: "from-blue-500 via-blue-600 to-indigo-700", icon: Swords },
              { id: "irama-kata", title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk hanya yang sesuai aturan level. Refleks + klasifikasi kata.", href: "/guru/game/irama-kata", gradient: "from-orange-500 via-rose-500 to-red-600", icon: Zap },
              { id: "menara", title: "Menara Cerdas", desc: "Panjat menara dengan soal dari pelajaran murid! Jawab benar untuk naik, jaga 3 nyawa.", href: "/guru/game/menara", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: Trophy },
              { id: "kata-play", title: "KataPlay", desc: "Belajar membaca dari nol! 4 tingkat, puluhan soal seru — cocok untuk kelas awal.", href: "/guru/game/kata-play", gradient: "from-violet-500 via-purple-600 to-fuchsia-700", icon: BookOpen },
            ].map((game) => {
              const Icon = game.icon;
              return (
                <Link key={game.id} href={game.href} className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`h-24 bg-gradient-to-br ${game.gradient} relative overflow-hidden flex items-center justify-center`}>
                    <Icon className="w-10 h-10 text-white/80" />
                    <div className="absolute top-2 left-2 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">SENDIRI</div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{game.title}</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Bermain Sendiri</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">MULAI</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{game.desc}</p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400">Sendiri</span>
                      <span className="text-[10px] text-slate-400">~3 menit</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/guru/game/leaderboard" className="group bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 hover:shadow-xl transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Trophy className="w-5 h-5 text-white" /></div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Peringkat Guru</p>
                <p className="text-[10px] text-slate-400">Papan peringkat XP & lencana guru</p>
              </div>
            </Link>
            <Link href="/guru/game/achievement" className="group rounded-2xl border border-slate-100 bg-white p-4 flex items-center gap-3 hover:shadow-xl transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><Star className="w-5 h-5 text-white" /></div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Lencana Guru</p>
                <p className="text-[10px] text-slate-400">Lencana dan pencapaian guru</p>
              </div>
            </Link>
            <Link href="/guru/game/lobby" className="group rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:shadow-xl transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Kuis Battle</p>
                <p className="text-[10px] text-slate-400">Buat ruang gim, kuis antar pemain</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
