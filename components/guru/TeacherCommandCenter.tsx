"use client"

import Link from "next/link"
import { Users, GraduationCap, ClipboardList, FilePlus2, Sparkles, Crown } from "lucide-react"
import type { ReactNode } from "react"

const fmt = new Intl.NumberFormat("id-ID")

interface CommandCenterProps {
  greeting: string
  fullName: string
  isFounder?: boolean
  totalSiswa: number
  kelasAktif: number
  tugasMenunggu: number
  loading?: boolean
  children?: ReactNode
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
      className="flex items-center gap-3 sm:gap-4 px-0 sm:px-6 first:sm:pl-0 last:sm:pr-0 py-3.5 sm:py-5 rounded-xl sm:rounded-none hover:bg-gray-50/60 transition-colors group"
    >
      <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${m.chip}`}>
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className={`block ${m.prominent ? "text-3xl" : "text-2xl"} font-bold ${m.valueColor} leading-tight`}>
          {m.value}
        </span>
        <span className="block text-sm text-gray-500 leading-tight group-hover:text-gray-700 transition-colors">{m.label}</span>
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
  children,
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
    <section className="relative bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
            <span className="truncate">
              {greeting}, {fullName}
            </span>
            {isFounder && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium shrink-0">
                <Crown size={10} aria-hidden /> Founder
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
            Hari ini kamu memiliki
          </p>
        </div>
        {children}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-gray-100 mt-4 sm:mt-6">
        {metrics.map((m) => (
          <MetricCell key={m.key} m={m} />
        ))}
      </div>

      <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
        <Link
          href="/guru/materi-ajar"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <FilePlus2 size={16} aria-hidden /> Buat Materi
        </Link>
        <Link
          href="/guru/ai-bc"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-violet-200 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-colors"
        >
          <Sparkles size={16} aria-hidden /> AI BC
        </Link>
      </div>
    </section>
  )
}
