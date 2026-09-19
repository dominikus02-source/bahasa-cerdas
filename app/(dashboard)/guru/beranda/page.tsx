"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, ShoppingBag, Users, Gamepad2, Wand2, ClipboardCheck,
  TrendingUp, ChevronRight, Star,
  FileText, Video, Presentation, Database,
  Zap, Flame, FileUp, Upload, GraduationCap, BarChart3, Brain,
  Plus
} from "lucide-react"
import { useUserStore } from "@/store"
import { Badge } from "@/components/ui/badge"
import TeacherCommandCenter from "@/components/guru/TeacherCommandCenter"
import { TrialStatusCard } from "@/components/guru/TrialStatusCard"

import { GuruMissionCard } from "@/components/guru/misi/GuruMissionCard"
import { NextActionGuru } from "@/components/guru/misi/NextActionGuru"
import { GuruLeaderboardCard } from "@/components/guru/GuruLeaderboardCard"
import { GuruBerkarya } from "@/components/guru/GuruBerkarya"
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status"
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

export default function GuruBerandaPage() {  const user = useUserStore()
  const [stats, setStats] = useState<any>({
    totalKarya: 0, totalSiswa: 0, totalKuis: 0, totalTerjual: 0,
    terjualBulanIni: 0, saldo: 0, aiUsage: { rpp: 0, soal: 0 },
  })
  const [nilaiStats, setNilaiStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [social, setSocial] = useState<any>(null)
  const [misiStatus, setMisiStatus] = useState<MisiGuruStatus | null>(null)

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

  useEffect(() => {
    let aktif = true;
    fetch("/api/guru/misi")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        if (aktif && res?.data) setMisiStatus(res.data);
      })
      .catch(() => {});
    return () => {
      aktif = false;
    };
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

  const isEmptyState = !loading && stats.totalSiswa === 0 && nilaiStats.length === 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {isEmptyState ? (
        /* Empty state: teacher has 0 classes & 0 students */
        <div className="relative bg-white border border-gray-100 rounded-2xl shadow-sm p-8 sm:p-12 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 opacity-60" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg mb-6 mx-auto">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              {greeting}, {user.fullName ?? "Guru"} 👋
            </h1>
            <p className="text-gray-500 max-w-md mx-auto mb-2">
              Mulai dengan membuat kelas. Undang muridmu, lalu mulai mengajar.
            </p>
            <p className="text-sm text-emerald-600 font-medium mb-8">
              ⏳ Guru Pro gratis selama 30 hari
            </p>

            <div className="max-w-sm mx-auto space-y-3">
              <Link
                href="/guru/kelasku"
                className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 text-base"
              >
                <Plus size={18} /> Buat Kelas Pertama
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/guru/ai-tools"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Wand2 size={14} /> Alat AI
                </Link>
                <Link
                  href="/guru/bank-soal"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Database size={14} /> Bank Soal
                </Link>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 text-left max-w-sm mx-auto space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cara kerjanya</p>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p className="text-sm text-gray-600"><span className="font-semibold">Buat kelas</span> — beri nama dan pilih tingkat</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p className="text-sm text-gray-600"><span className="font-semibold">Undang murid</span> — bagikan kode akses via WhatsApp</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p className="text-sm text-gray-600"><span className="font-semibold">Mulai mengajar</span> — buat materi, kuis, atau gunakan AI</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <TeacherCommandCenter
            greeting={greeting}
            fullName={user.fullName ?? "Guru"}
            isFounder={user.isFounder}
            totalSiswa={stats.totalSiswa}
            kelasAktif={nilaiStats.length}
            tugasMenunggu={nilaiStats.reduce((a: number, ns: any) => a + (ns.belumDinilai || 0), 0)}
            loading={loading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 mt-6">
            <GuruLeaderboardCard misiStatus={misiStatus} />
            <div className="flex flex-col gap-4 min-w-0">
              <BannerProgramGuruCerdas />
              <NextActionGuru status={misiStatus} />
            </div>
          </div>

          <div className="mb-6">
            <GuruMissionCard compact external status={misiStatus} />
          </div>

          <div className="mb-6">
            <GuruBerkarya misiStatus={misiStatus} />
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
                    <p className="text-2xl font-bold text-gray-900">{(stats.aiUsage?.rpp || 0) + (stats.aiUsage?.soal || 0)}</p>
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
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
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
                    <p className="text-xs text-gray-500">Soal, EYD, dll.</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {!loading && (
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
          )}
        </>
      )}
    </div>
  )
}
