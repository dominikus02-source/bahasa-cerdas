"use client"

import Link from "next/link"
import { BookOpen, FileText, ChevronRight } from "lucide-react"

export function PembelajaranCard({
  tugasCount = 0,
  materiCount = 0,
}: {
  tugasCount?: number
  materiCount?: number
}) {
  return (
    <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-3xl p-5 md:p-6 text-white shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Ruang Pembelajaran</h2>
          <p className="text-sm text-emerald-100">Fokus belajar dari tugas dan materi guru</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/arena/tugas"
          className="bg-white/10 backdrop-blur rounded-2xl p-4 hover:bg-white/20 transition-all active:scale-[0.97] flex flex-col"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-emerald-200" />
            <span className="text-sm font-semibold">Ruang Tugas</span>
          </div>
          <p className="text-[11px] text-emerald-100 leading-tight mb-3">
            Tugas, kuis & latihan dari guru
          </p>
          <div className="flex items-center justify-between mt-auto">
            {tugasCount > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-bold">
                {tugasCount} tertunda
              </span>
            ) : (
              <span className="text-[11px] text-emerald-200">Tidak ada tugas baru</span>
            )}
            <ChevronRight className="w-4 h-4 text-white/60" />
          </div>
        </Link>

        <Link
          href="/arena/materi"
          className="bg-white/10 backdrop-blur rounded-2xl p-4 hover:bg-white/20 transition-all active:scale-[0.97] flex flex-col"
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-emerald-200" />
            <span className="text-sm font-semibold">Ruang Materi</span>
          </div>
          <p className="text-[11px] text-emerald-100 leading-tight mb-3">
            Modul, bahan ajar & materi belajar
          </p>
          <div className="flex items-center justify-between mt-auto">
            {materiCount > 0 ? (
              <span className="text-[11px] text-emerald-200">{materiCount} materi tersedia</span>
            ) : (
              <span className="text-[11px] text-emerald-200">Jelajahi materi</span>
            )}
            <ChevronRight className="w-4 h-4 text-white/60" />
          </div>
        </Link>
      </div>
    </div>
  )
}
