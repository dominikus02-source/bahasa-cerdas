"use client"

// ─── Teacher Command Center (Hero `/guru/beranda`) ───────────
// Tiga zona: TOP (greeting + role/access), MIDDLE (3 metric),
// BOTTOM (action bar 4 aksi: Buat Materi, AI BC, Main Bersama,
// Dasbor Murid). Dasbor Murid tidak lagi berdiri sendiri di kanan
// atas (children dihapus). Main Bersama = featured: accent surface +
// label "Live" — noticeable tanpa membuat aksi lain terasa mati.
// Visual: gradient mint BC sangat halus + soft glow; bukan game
// screen, tetap elevated dashboard. Motion menghormati reduced-motion.

import Link from "next/link"
import {
  Users, GraduationCap, ClipboardList, FilePlus2, Sparkles, Crown,
  MonitorPlay, ArrowRight, Play,
} from "lucide-react"
import { AiCreditBalance } from "@/components/guru/AiCreditBalance"

const fmt = new Intl.NumberFormat("id-ID")

interface CommandCenterProps {
  greeting: string
  fullName: string
  isFounder?: boolean
  totalSiswa: number
  kelasAktif: number
  tugasMenunggu: number
  loading?: boolean
}

interface Metric {
  key: string
  label: string
  caption: string
  value: string
  href: string
  icon: typeof Users
  chip: string
  valueColor: string
  prominent?: boolean
}

function MetricCell({ m }: { m: Metric }) {
  const Icon = m.icon
  return (
    <Link
      key={m.key}
      href={m.href}
      className="flex items-center gap-3 sm:gap-4 px-0 sm:px-6 first:sm:pl-0 last:sm:pr-0 py-3.5 sm:py-5 rounded-xl sm:rounded-none hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 transition-colors group"
    >
      <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${m.chip}`}>
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className={`block ${m.prominent ? "text-3xl" : "text-2xl"} font-bold ${m.valueColor} leading-tight tabular-nums`}>
          {m.value}
        </span>
        <span className="block text-sm text-gray-600 leading-tight group-hover:text-gray-800 transition-colors">{m.label}</span>
        <span className="block text-[11px] mt-0.5 text-gray-400">{m.caption}</span>
      </span>
    </Link>
  )
}

export default function TeacherCommandCenter({
  greeting,
  fullName,
  isFounder,
  totalSiswa,
  kelasAktif,
  tugasMenunggu,
  loading,
}: CommandCenterProps) {
  const metrics: Metric[] = [
    {
      key: "tugas",
      label: "Tugas Menunggu",
      caption: "perlu dinilai",
      value: loading ? "—" : fmt.format(tugasMenunggu),
      href: "/guru/penilaian",
      icon: ClipboardList,
      chip: "bg-amber-50 text-amber-600",
      valueColor: "text-amber-700",
      prominent: true,
    },
    {
      key: "kelas",
      label: "Kelas Aktif",
      caption: "sedang dikelola",
      value: loading ? "—" : fmt.format(kelasAktif),
      href: "/guru/kelasku",
      icon: GraduationCap,
      chip: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-700",
    },
    {
      key: "siswa",
      label: "Siswa",
      caption: "di ekosistemmu",
      value: loading ? "—" : fmt.format(totalSiswa),
      href: "/guru/data-siswa",
      icon: Users,
      chip: "bg-violet-50 text-violet-600",
      valueColor: "text-violet-700",
    },
  ]

  return (
    <section
      aria-label="Ringkasan mengajar"
      className="relative overflow-hidden rounded-2xl border border-blue-100/80 dark:border-blue-950/70 shadow-sm p-5 sm:p-7 bg-white"
    >
      {/* Permukaan berlapis: gradient mint sangat halus + glow lembut.
          Tipografi tetap kontras penuh (§E — bukan game screen). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#f5f9ff] dark:bg-[#0b1d34]"
      />
      <div
        aria-hidden
        className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-200/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 left-1/4 w-40 h-40 rounded-full bg-violet-200/15 blur-3xl"
      />

      <div className="relative">
        {/* ── TOP: greeting + badge — tanpa tombol di area atas ── */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
            <span className="truncate">
              {greeting}, {fullName}
            </span>
            {isFounder && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium shrink-0">
                <Crown size={10} aria-hidden /> Founder
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" aria-hidden />
              Hari ini kamu memiliki
            </p>
            <AiCreditBalance />
          </div>
        </div>

        {/* ── MIDDLE: 3 metric (hierarki angka, tile, separator) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-emerald-100/70 mt-4 sm:mt-6">
          {metrics.map((m) => (
            <MetricCell key={m.key} m={m} />
          ))}
        </div>

        {/* ── BOTTOM: action bar 4 aksi (desktop 1 row, mobile 2×2) ── */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-blue-100/70 dark:border-blue-950/70">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Featured — Main Bersama: accent surface + label Live */}
            <Link
              href="/guru/game/main-bersama"
              className="group relative inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 hover:from-blue-800 hover:to-blue-600 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute -right-4 -top-6 w-16 h-16 rounded-full bg-white/15 blur-md motion-safe:group-hover:scale-110 transition-transform"
              />
              <span className="w-8 h-8 shrink-0 rounded-lg bg-white/20 flex items-center justify-center">
                <MonitorPlay size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-tight">Main Bersama</span>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                  <span className="relative flex w-1.5 h-1.5 shrink-0" aria-hidden>
                    <span className="absolute inline-flex w-full h-full rounded-full bg-amber-300 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-amber-300" />
                  </span>
                  LANGSUNG
                </span>
              </span>
              <ArrowRight size={14} className="shrink-0 opacity-70 group-hover:translate-x-0.5 motion-safe:transition-transform" aria-hidden />
            </Link>

            {/* Sekunder — aksi rutin, surface netral dengan identitas warna */}
            <Link
              href="/guru/materi-ajar"
              className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-blue-200 text-gray-800 text-sm font-semibold hover:bg-blue-50/70 hover:border-blue-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <span className="w-8 h-8 shrink-0 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FilePlus2 size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">Buat Materi</span>
            </Link>

            <Link
              href="/guru/ai-bc"
              className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-violet-200 text-gray-800 text-sm font-semibold hover:bg-violet-50/70 hover:border-violet-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              <span className="w-8 h-8 shrink-0 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                <Sparkles size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">AI BC</span>
            </Link>

            <Link
              href="/murid/beranda"
              className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-blue-200 text-gray-800 text-sm font-semibold hover:bg-blue-50/70 hover:border-blue-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <span className="w-8 h-8 shrink-0 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <GraduationCap size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">Dasbor Murid</span>
              <Play size={12} className="shrink-0 text-blue-400" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
