"use client";

import Link from "next/link";
import { BookOpen, ClipboardList, School, Users } from "lucide-react";

export function RuangBelajarSection() {
  return (
    <section aria-label="Ruang Belajar">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-royal-2)]">
            Ruang Belajar
          </p>
          <h2 className="text-lg font-extrabold text-[var(--px-text)]">Ruang Belajar</h2>
          <p className="text-xs text-[var(--px-text-faint)]">Kelas, materi, dan tugasmu dalam satu tempat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group px-card px-5 py-6 relative overflow-hidden ring-1 ring-slate-900/10 dark:ring-white/10 hover:bg-slate-900/[0.08] dark:bg-white/[0.08] transition-colors flex flex-col gap-3">
          <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-[var(--px-royal)]/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <span className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--px-royal)] to-[var(--px-royal-2)] flex items-center justify-center shadow-lg shadow-[var(--px-royal)]/30">
              <Users size={22} className="text-slate-900 dark:text-white" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[var(--px-text)]">Kelas</h3>
              <p className="text-xs text-[var(--px-text-faint)] mt-0.5">
                Gabung dan lanjutkan pembelajaran bersama kelasmu.
              </p>
            </div>
          </div>
          <div className="relative mt-auto pt-1">
            <Link
              href="/murid/gabung-kelas"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-full px-5 py-2.5 shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-[1.03]"
              aria-label="Gabung kelas"
            >
              <School size={14} />
              Buka Kelas
            </Link>
          </div>
        </div>

        <div className="group px-card px-5 py-6 relative overflow-hidden ring-1 ring-slate-900/10 dark:ring-white/10 hover:bg-slate-900/[0.08] dark:bg-white/[0.08] transition-colors flex flex-col gap-3">
          <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <span className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <BookOpen size={22} className="text-slate-900 dark:text-white" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[var(--px-text)]">Materi &amp; Tugas</h3>
              <p className="text-xs text-[var(--px-text-faint)] mt-0.5">
                Lihat materi, tugas, dan aktivitas belajarmu.
              </p>
            </div>
          </div>
          <div className="relative mt-auto pt-1 flex flex-wrap items-center gap-3">
            <Link
              href="/murid/tugasku"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-full px-5 py-2.5 shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-[1.03]"
              aria-label="Buka tugas"
            >
              <ClipboardList size={14} />
              Buka Tugas
            </Link>
            <Link
              href="/arena/materi"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--px-text-dim)] hover:text-[var(--px-text)] transition-colors"
              aria-label="Lihat materi"
            >
              Materi
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
