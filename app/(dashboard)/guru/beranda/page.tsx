"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, ShoppingBag, Users, Gamepad2, Wand2, ClipboardCheck,
  TrendingUp, ChevronRight, Star, Plus, Megaphone, BookOpenCheck, FileSpreadsheet, CalendarPlus,
  FileText, Video, Presentation, Database,
  Crown, Zap, Flame, FileUp, Upload, GraduationCap, BarChart3, Brain, LayoutDashboard
} from "lucide-react"
import { useUserStore } from "@/store"
import { Badge } from "@/components/ui/badge"
import { TrialStatusCard } from "@/components/guru/TrialStatusCard"
import { AiCreditBalance } from "@/components/guru/AiCreditBalance"
import { GuruMissionCard } from "@/components/guru/misi/GuruMissionCard"
import BannerProgramGuruCerdas from "@/components/public/BannerProgramGuruCerdas"
import AktivitasAnalytics from "@/components/guru/AktivitasAnalytics"
import GuruBadgeGrid from "@/components/guru/GuruBadgeGrid"

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

function CreateMenu() {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Pengumuman", icon: Megaphone, href: "/guru/kelasku", color: "text-blue-600 bg-blue-50" },
    { label: "Tugas", icon: BookOpenCheck, href: "/guru/tugas-murid", color: "text-emerald-600 bg-emerald-50" },
    { label: "Asesmen", icon: ClipboardCheck, href: "/guru/bank-soal", color: "text-violet-600 bg-violet-50" },
    { label: "Materi", icon: FileSpreadsheet, href: "/guru/materi-ajar", color: "text-amber-600 bg-amber-50" },
    { label: "Event", icon: CalendarPlus, href: "/guru/olimpiade", color: "text-rose-600 bg-rose-50" },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
      >
        <Plus size={16} /> Buat
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 z-20 bg-white rounded-2xl border border-gray-100 shadow-2xl p-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">Apa yang ingin dibuat?</p>
            {items.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${it.color}`}>
                  <it.icon size={16} />
                </span>
                <span className="text-sm font-medium text-gray-700">{it.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function GuruBerandaPage() {  const user = useUserStore()
  const [stats, setStats] = useState<any>({
    totalKarya: 0, totalSiswa: 0, totalKuis: 0, totalTerjual: 0,
    terjualBulanIni: 0, saldo: 0, aiUsage: { rpp: 0, soal: 0 },
  })
  const [nilaiStats, setNilaiStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [social, setSocial] = useState<any>(null)

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([
      fetch("/api/guru/dashboard").then(r => r.ok ? r.json() : Promise.reject("Gagal memuat dashboard")),
      fetch("/api/guru/nilai/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/guru/dashboard/social").then(r => r.ok ? r.json() : null),
    ])
      .then(([dashboardData, nilaiData, socialData]) => {
        if (dashboardData.totalKarya !== undefined) setStats(dashboardData)
        if (nilaiData?.stats) setNilaiStats(nilaiData.stats)
        if (socialData) setSocial(socialData)
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
        <div className="flex gap-2 relative">
          <CreateMenu />
          <Link href="/guru/ai-tools?tool=rpp-modul" className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
            <Wand2 size={16} /> Buat Rencana Pembelajaran
          </Link>
          <Link href="/guru/kelasku" className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all">
            <Users size={16} /> KelasKu
          </Link>
          <Link href="/arena" className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-violet-200 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-all">
            <LayoutDashboard size={16} /> Dasbor Murid
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <GuruMissionCard compact />
        <BannerProgramGuruCerdas />
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

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md">
                <Gamepad2 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalKuis}</p>
                <p className="text-sm text-gray-500">Kuis & Tugas</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-violet-600 font-medium">Aktif</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                <BarChart3 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{nilaiStats.length > 0 ? Math.round(nilaiStats.reduce((a: number, ns: any) => {
                  const vals = Object.values(ns.rataKategoris || {}) as number[];
                  const avg = vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0;
                  return a + avg;
                }, 0) / nilaiStats.length) : "—"}</p>
                <p className="text-sm text-gray-500">Rata-rata Kelas</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-600 font-medium">{nilaiStats.length} kelas aktif</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.aiUsage?.rpp || 0 + stats.aiUsage?.soal || 0}</p>
                <p className="text-sm text-gray-500">Kredit AI</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-amber-600 font-medium">Bulan ini</div>
          </div>
        </div>
      )}

      {social && social.totalMurid > 0 && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Flame size={16} className="text-orange-500" /> Aktivitas Hari Ini
            </h3>
            <Link href="/guru/feed-karya" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Lihat Hasil Karya <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50">
              <p className="text-2xl font-bold text-emerald-700">{social.muridAktifHariIni}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">murid berkarya hari ini</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50">
              <p className="text-2xl font-bold text-rose-600">{social.belumBerkarya}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">murid belum pernah berkarya</p>
            </div>
            <Link href="/guru/feed-karya" className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors block">
              <p className="text-2xl font-bold text-amber-600">{social.likeHariIni}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">like baru</p>
            </Link>
            <div className="p-3 rounded-xl bg-sky-50">
              <p className="text-2xl font-bold text-sky-600">{social.komentarHariIni}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">komentar baru</p>
            </div>
            <div className="p-3 rounded-xl bg-violet-50">
              <p className="text-2xl font-bold text-violet-600">{social.karyaHariIni}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">karya baru</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50">
              <p className="text-2xl font-bold text-orange-600">{social.karyaTrending}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">karya trending</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {social.karyaLike100 > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                <Star size={10} /> {social.karyaLike100} karya melewati 100 like
              </span>
            )}
            {social.tugasSelesaiHariIni > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                <ClipboardCheck size={10} /> {social.tugasSelesaiHariIni} tugas selesai
              </span>
            )}
            {social.belumBerkarya > 0 && (
              <Link href="/guru/feed-karya" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-600 font-semibold hover:bg-rose-200 transition-colors">
                Ajak {social.belumBerkarya} murid mulai berkarya →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AktivitasAnalytics />
        <GuruBadgeGrid />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link href="/guru/pengaturan/premium" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group">          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 group-hover:text-emerald-700">
              <Zap size={16} className="text-amber-500" /> Kredit AI
            </h3>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500" />
          </div>
          <AiCreditBalance />
          {!user.isPremium && !user.isFounder && (
            <p className="mt-2 text-xs text-amber-600 font-medium">Upgrade ke PRO untuk kuota lebih →</p>
          )}
        </Link>

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
                <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">Buat Rencana Pembelajaran</p>
                <p className="text-xs text-gray-500">Dengan AI</p>
              </div>
            </Link>

            <Link href="/guru/bank-soal" className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">Bank Soal</p>
                <p className="text-xs text-gray-500">Buat & kelola soal</p>
              </div>
            </Link>

            <Link href="/guru/penilaian" className="flex items-center gap-3 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                <ClipboardCheck size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700">Penilaian</p>
                <p className="text-xs text-gray-500">Nilai & gradebook</p>
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

            <Link href="/guru/kelasku" className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <GraduationCap size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">KelasKu</p>
                <p className="text-xs text-gray-500">Manajemen kelas</p>
              </div>
            </Link>

            <Link href="/guru/ai-tools" className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                <Brain size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">Alat AI</p>
                <p className="text-xs text-gray-500">Soal, PPT, EYD, dll.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {!loading && (
        <>
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Star size={16} className="text-emerald-500" /> Tips Mengajar
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Wand2 size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gunakan AI untuk menyusun Rencana Pembelajaran</p>
                  <p className="text-xs text-gray-500 mt-0.5">Hemat waktu dengan generator RPP otomatis.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={16} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Pantau nilai siswa secara real-time</p>
                  <p className="text-xs text-gray-500 mt-0.5">Lihat progres kelas di menu Penilaian & Gradebook.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Buat kuis interaktif untuk siswa</p>
                  <p className="text-xs text-gray-500 mt-0.5">Belajar jadi lebih seru dengan kuis multiplayer!</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
