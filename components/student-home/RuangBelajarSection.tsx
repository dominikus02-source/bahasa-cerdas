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
          <h2 className="text-xl font-semibold tracking-tight text-[var(--px-text)]">Ruang Belajar</h2>
          <p className="text-xs text-[var(--px-text-faint)]">Kelas, materi, dan tugasmu dalam satu tempat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 border-t section-rule">
        <div className="group section-rule border-b px-2 py-4 flex flex-col gap-3 hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--px-royal)]/10 flex items-center justify-center">
              <Users size={17} className="text-[var(--px-royal)]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-[var(--px-text)]">Kelas</h3>
              <p className="text-xs text-[var(--px-text-faint)] mt-0.5">
                Gabung dan lanjutkan pembelajaran bersama kelasmu.
              </p>
            </div>
          </div>
          <div className="mt-auto pt-1">
            <Link
              href="/murid/gabung-kelas"
              className="px-btn-ghost inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2"
              aria-label="Gabung kelas"
            >
              <School size={14} />
              Buka Kelas
            </Link>
          </div>
        </div>

        <div className="group section-rule border-b px-2 py-4 flex flex-col gap-3 hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <BookOpen size={17} className="text-emerald-700 dark:text-emerald-300" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-[var(--px-text)]">Materi &amp; Tugas</h3>
              <p className="text-xs text-[var(--px-text-faint)] mt-0.5">
                Lihat materi, tugas, dan aktivitas belajarmu.
              </p>
            </div>
          </div>
          <div className="mt-auto pt-1 flex flex-wrap items-center gap-3">
            <Link
              href="/murid/tugasku"
              className="px-btn-ghost inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2"
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
