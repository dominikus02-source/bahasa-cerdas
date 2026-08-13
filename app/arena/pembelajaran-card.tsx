"use client"

import Link from "next/link"
import { BookOpen, ChevronRight, GraduationCap, Library } from "lucide-react"

export function PembelajaranCard({
  tugasCount = 0,
  materiCount = 0,
}: {
  tugasCount?: number
  materiCount?: number
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 mb-5 shadow-lg shadow-emerald-500/25">
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 dark:bg-slate-900/5" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 dark:bg-slate-900/5" />
      <div className="absolute top-2 right-12 w-10 h-10 rounded-full bg-emerald-400/10" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 dark:bg-slate-900/20 flex items-center justify-center backdrop-blur-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Ruang Pembelajaran</h1>
            <p className="text-xs text-emerald-200">Fokus belajar & selesaikan tugasmu di sini!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Link
            href="/arena/tugas"
            className="group flex items-start gap-3 bg-white/95 dark:bg-slate-900/95 rounded-xl p-4 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Ruang Tugas</h3>
                {tugasCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                    {tugasCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Tugas & latihan dari Buku Panduan Guru</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
                {tugasCount > 0 ? `${tugasCount} tugas tersedia` : "Lihat semua tugas"} <ChevronRight size={14} />
              </div>
            </div>
          </Link>

          <Link
            href="/arena/materi"
            className="group flex items-start gap-3 bg-white/95 dark:bg-slate-900/95 rounded-xl p-4 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Ruang Materi</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Modul, PPT, PDF, dan video dari guru</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all">
                Lihat Materi <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
