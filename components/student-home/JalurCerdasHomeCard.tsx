"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Sparkles, Target, Zap } from "lucide-react";

export function JalurCerdasHomeCard() {
  return (
    <section aria-label="Jalur Cerdas">
      <Link
        href="/arena/jalur-cerdas"
        className="group relative block overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#09142f] via-[#14265a] to-[#243b9b] p-5 shadow-[0_20px_50px_-28px_rgba(43,75,255,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-28px_rgba(43,75,255,0.95)] sm:p-6"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 shadow-lg shadow-cyan-500/20">
              <BookOpenCheck size={28} className="text-white drop-shadow" strokeWidth={2.2} />
              <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#14265a] bg-[#ffd24a] text-[#1b1205]">
                <Sparkles size={12} strokeWidth={3} />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-cyan-200 ring-1 ring-white/10">
                  Jalur belajar utama
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[9px] font-extrabold text-emerald-200 ring-1 ring-emerald-300/15">
                  <CheckCircle2 size={11} />
                  Bertahap
                </span>
              </div>

              <h2 className="mt-2 text-[22px] font-extrabold tracking-tight text-white sm:text-2xl">
                Jalur Cerdas
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-blue-100/80">
                Belajar Bahasa Indonesia selangkah demi selangkah, dari dasar sampai makin mahir.
                Tinggal lanjutkan unit berikutnya.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-blue-100/70">
                <span className="inline-flex items-center gap-1.5">
                  <Target size={13} className="text-cyan-300" />
                  Latihan terarah
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={13} className="text-[#ffd24a]" />
                  Dapatkan XP
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpenCheck size={13} className="text-fuchsia-300" />
                  Progres tersimpan
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffd24a] to-[#ffb020] px-5 py-3 text-sm font-extrabold text-[#1b1205] shadow-lg shadow-amber-500/20 transition-transform group-hover:translate-x-0.5 sm:w-auto">
              Lanjutkan
              <ArrowRight size={17} strokeWidth={2.5} />
            </span>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2" aria-hidden="true">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan-300 to-blue-400" />
          <div className="h-1.5 rounded-full bg-white/15" />
          <div className="h-1.5 rounded-full bg-white/15" />
        </div>
        <p className="relative mt-2 text-[10px] font-semibold text-blue-100/55">
          Jalur Cerdas selalu tersedia dari Beranda saat kamu ingin belajar.
        </p>
      </Link>
    </section>
  );
}
