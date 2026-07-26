"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, ShoppingBag, Users, Gamepad2, Wand2, ClipboardCheck,
  TrendingUp, ChevronRight, Star,
  FileText, Video, Presentation, Database,
  Crown, Zap, Flame, FileUp, Upload
} from "lucide-react"
import { useUserStore } from "@/store"
import { Badge } from "@/components/ui/badge"
import { TrialStatusCard } from "@/components/guru/TrialStatusCard"
import { AiCreditBalance } from "@/components/guru/AiCreditBalance"

function jakartaHour(): number {
  // Same instant, same zone, on both server and client — no drift to hydrate over.
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  )
}

function greetingForHour(h: number): string {
  if (h < 11) return "Selamat pagi"
  if (h < 15) return "Selamat siang"
  if (h < 18) return "Selamat sore"
  return "Selamat malam"
}

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 p-5 animate-pulse bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export default function GuruBerandaPage() {
  const user = useUserStore()
  const [stats, setStats] = useState<any>({
    totalKarya: 0, totalSiswa: 0, totalKuis: 0, totalTerjual: 0,
    terjualBulanIni: 0, saldo: 0, aiUsage: { rpp: 0, soal: 0 },
  })
  const [nilaiStats, setNilaiStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([
      fetch("/api/guru/dashboard").then(r => r.ok ? r.json() : Promise.reject("Gagal memuat dashboard")),
      fetch("/api/guru/nilai/stats").then(r => r.ok ? r.json() : null),
    ])
      .then(([dashboardData, nilaiData]) => {
        if (dashboardData.totalKarya !== undefined) setStats(dashboardData)
        if (nilaiData?.stats) setNilaiStats(nilaiData.stats)
      })
      .catch(() => setError("Gagal memuat data dashboard"))
      .finally(() => setLoading(false));
  }, [])

  // Greeting must not be derived from the raw local clock during render.
  // A "use client" component is still server-rendered for the initial HTML, and
  // the server runs in UTC while the reader is in WIB/WITA/WIT — so 15:09 WIB
  // rendered as "Selamat pagi" on the server and "Selamat siang" in the browser.
  // React saw the mismatch, threw hydration error #418, and discarded the whole
  // server render to redo it client-side.
  //
  // The first paint is therefore pinned to Asia/Jakarta, which server and client
  // both compute identically, and the effect below corrects it to the reader's
  // real timezone once hydration is done (a state update after mount is safe).
  const [greeting, setGreeting] = useState(() => greetingForHour(jakartaHour()))

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()))
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400">{greeting},</p>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            {user.fullName}
            {user.isFounder && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                <Crown size={10} /> Founder
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Dasbor Guru - BahasaCerdas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/guru/ai-tools?tool=rpp-modul" className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
            <Wand2 size={16} /> Buat Rencana Pembelajaran
          </Link>
          <Link href="/guru/toko-karya" className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
            <ShoppingBag size={16} /> Upload Karya
          </Link>
          <Link href="/arena" className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-violet-200 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-all">
            <Users size={16} /> Dasbor Murid
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <TrialStatusCard />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center mb-8">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-red-500 underline">Muat ulang</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalKarya}</p>
                <p className="text-sm text-gray-500">Total Karya</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-600 font-medium">+{stats.terjualBulanIni} terjual bulan ini</div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md">
                <Gamepad2 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalKuis}</p>
                <p className="text-sm text-gray-500">Kuis Aktif</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-violet-600 font-medium">Game multiplayer</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center shadow-md">
                <Users size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSiswa}</p>
                <p className="text-sm text-gray-500">Total Siswa</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-600 font-medium">Terdaftar di kelas</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
                <TrendingUp size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatRp(stats.saldo)}</p>
                <p className="text-sm text-gray-500">Saldo</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-amber-600 font-medium">Dari penjualan karya</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Zap size={18} className="text-violet-500" /> Kuota AI
            </h3>
            {!user.isPremium && !user.isFounder && (
              <Link href="/guru/pengaturan/premium" className="text-xs text-emerald-600 font-semibold hover:underline">
                Upgrade
              </Link>
            )}
          </div>

          <AiCreditBalance />

          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p>Setiap generasi AI menggunakan kredit berdasarkan agent.</p>
            <p>Rencana Pembelajaran = 5 kredit, Soal = 3 kredit, PPT = 5 kredit, dll.</p>
          </div>

          {!user.isPremium && !user.isFounder && (
            <Link
              href="/guru/pengaturan/premium"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <Crown size={14} /> Upgrade ke PRO — 500 kredit/bulan
            </Link>
          )}
        </div>

        {!loading && nilaiStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <Link href="/guru/penilaian" className="flex items-center justify-between mb-4 group">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                <ClipboardCheck size={16} className="text-emerald-500" /> Penilaian
              </h3>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500" />
            </Link>
            <div className="space-y-3">
              {nilaiStats.map((ns: any) => {
                const belum = ns.belumDinilai || 0;
                return (
                  <div key={ns.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-gray-700">{ns.name}</span>
                      <span className="text-gray-400 ml-1">({ns.grade})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {Object.entries(ns.rataKategoris || {}).map(([nama, skor]: [string, any]) => (
                        <span key={nama} className={`font-semibold ${skor >= 80 ? "text-emerald-600" : skor >= 60 ? "text-amber-600" : "text-red-500"}`}>
                          {nama}: {skor}
                        </span>
                      ))}
                      {belum > 0 && (
                        <span className="text-red-500 font-semibold">{belum} blm dinilai</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Aksi Cepat</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/guru/ai-tools?tool=rpp-modul" className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Wand2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">Generator Rencana Pembelajaran</p>
                <p className="text-xs text-gray-500">AI powered</p>
              </div>
            </Link>

            <Link href="/guru/bank-soal" className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">Bank Soal</p>
                <p className="text-xs text-gray-500">Upload and HOTS</p>
              </div>
            </Link>

            <Link href="/guru/kuis-game" className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Gamepad2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Kuis Game</p>
                <p className="text-xs text-gray-500">Multiplayer</p>
              </div>
            </Link>

            <Link href="/guru/data-siswa" className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700">Data Siswa</p>
                <p className="text-xs text-gray-500">Monitoring</p>
              </div>
            </Link>

            <Link href="/guru/ai-tools?tool=rpp-modul" className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                <FileUp size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700">Upload Rencana Pembelajaran</p>
                <p className="text-xs text-gray-500">DOCX or PDF</p>
              </div>
            </Link>

            <Link href="/guru/toko-karya" className="flex items-center gap-3 p-4 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center">
                <Upload size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-pink-700">Upload Karya</p>
                <p className="text-xs text-gray-500">Jual di toko</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {!loading && (
        <>
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Karya Ditayangkan</h3>
              <Link href="/guru/toko-karya" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                Lihat Semua <ChevronRight size={12} />
              </Link>
            </div>
            {stats.karyaList && stats.karyaList.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.karyaList.map((karya: any) => (
                  <div key={karya.id} className="rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px]">{karya.type}</Badge>
                      <Badge variant={karya.price > 0 ? "warning" : "success"} className="text-[10px]">
                        {karya.price > 0 ? `Rp ${Number(karya.price).toLocaleString("id")}` : "Gratis"}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 truncate">{karya.title}</h4>
                    {karya.grade && <p className="text-[10px] text-gray-400 mt-1">Kelas {karya.grade}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(karya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-500">Belum ada karya ditayangkan</p>
                <Link href="/guru/toko-karya" className="text-xs text-emerald-600 font-semibold hover:underline mt-1 inline-block">
                  Upload karya pertamamu
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Tips</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Star size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gunakan AI untuk generate soal HOTS</p>
                  <p className="text-xs text-gray-500 mt-0.5">Agar pembelajaran lebih menarik dan tantangan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Publikasikan karya di Toko</p>
                  <p className="text-xs text-gray-500 mt-0.5">Dapat income tambahan dari profesi pendidik.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 size={16} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Ajak siswa bermain kuis multiplayer</p>
                  <p className="text-xs text-gray-500 mt-0.5">Agar belajar jadi lebih seru dan interaktif!</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
