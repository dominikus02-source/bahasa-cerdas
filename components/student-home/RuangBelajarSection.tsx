"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, School, Users } from "lucide-react";

export function RuangBelajarSection() {
  return (
    <section aria-label="Ruang Belajar">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--px-royal-2)]">
            Belajar bersama
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-[var(--px-text)]">
            Ruang Belajar
          </h2>
          <p className="mt-1 text-xs text-[var(--px-text-faint)]">
            Kelas, materi, dan tugasmu dalam satu tempat.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/murid/gabung-kelas"
          className="group px-card px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          aria-label="Buka kelas"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--px-royal)]/10 text-[var(--px-royal)] dark:bg-blue-500/15 dark:text-blue-300">
              <Users size={21} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[var(--px-text)]">Kelas</h3>
                <ArrowRight size={16} className="text-[var(--px-text-faint)] transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--px-text-faint)]">
                Gabung dan lanjutkan pembelajaran bersama kelasmu.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--px-royal-2)]">
                <School size={13} />
                Buka Kelas
              </span>
            </div>
          </div>
        </Link>

        <div className="px-card px-4 py-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <BookOpen size={21} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[var(--px-text)]">Materi &amp; Tugas</h3>
                <ArrowRight size={16} className="text-[var(--px-text-faint)]" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--px-text-faint)]">
                Temukan materi dan selesaikan tugas yang diberikan gurumu.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href="/arena/tugas"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
                  aria-label="Buka tugas"
                >
                  <ClipboardList size={13} />
                  Buka Tugas
                </Link>
                <Link
                  href="/arena/materi"
                  className="text-[11px] font-bold text-[var(--px-text-dim)] hover:text-[var(--px-text)]"
                  aria-label="Lihat materi"
                >
                  Materi →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
