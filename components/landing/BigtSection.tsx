"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Dumbbell, BarChart3 } from "lucide-react";

const steps = [
  { icon: BookOpen, title: "Belajar", description: "Materi lengkap, modern, dan kontekstual.", accent: "text-violet-600", tint: "bg-violet-100" },
  { icon: Dumbbell, title: "Latihan", description: "Soal variatif dengan pembahasan cerdas.", accent: "text-amber-600", tint: "bg-amber-100" },
  { icon: ClipboardCheck, title: "Asesmen", description: "Uji kompetensi sesuai standar UKBI & TKA.", accent: "text-blue-600", tint: "bg-blue-100" },
  { icon: BarChart3, title: "Pahami hasil", description: "Laporan, analisis, dan rekomendasi belajar personal.", accent: "text-green-600", tint: "bg-green-100" },
];

export default function BigtSection() {
  return (
    <section id="bigt" aria-labelledby="bigt-heading" className="relative isolate scroll-mt-24 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 py-14 text-white sm:py-20 lg:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-72 w-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="section-container relative z-10 mx-auto px-4 sm:px-6">
        <header className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
          <span className="mb-5 inline-flex rounded-full bg-amber-300 px-6 py-2 text-sm font-extrabold tracking-wider text-slate-950 shadow-sm">BIGT</span>
          <h2 id="bigt-heading" className="mb-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Dari belajar hingga <span className="relative inline-block text-amber-300">mengukur kemampuan.<span aria-hidden="true" className="absolute -bottom-1 left-1/4 right-1 h-1 -rotate-2 rounded-full bg-amber-300" /></span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-blue-100 sm:text-base lg:text-lg">
            Sistem pembelajaran terintegrasi untuk belajar, berlatih, asesmen, dan memahami capaian kemampuan Bahasa Indonesia secara komprehensif.
          </p>
        </header>
        <div className="mx-auto mb-9 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {steps.map(({ icon: Icon, title, description, accent, tint }) => (
            <div key={title} className="flex min-h-28 items-center gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 text-slate-950 shadow-xl sm:min-h-36 sm:p-5">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-20 sm:w-20 ${tint} ${accent}`}>
                <Icon size={34} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-base font-extrabold text-slate-950 sm:text-xl">{title}</h3>
                <p className="text-xs leading-5 text-slate-700 sm:text-sm sm:leading-6">{description}</p>
              </div>
              <ArrowRight className="hidden shrink-0 text-blue-700 sm:block" size={20} aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/arena/simulasi" aria-label="Coba simulasi UKBI dan TKA" className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-5 py-4 text-center text-sm font-extrabold text-slate-950 shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-300 sm:text-lg">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"><ArrowRight size={18} aria-hidden="true" /></span>
            Coba Simulasi UKBI &amp; TKA
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <p className="mt-5 text-xs leading-5 text-blue-100">Belajar → Latihan → Asesmen → Pahami hasil → Langkah berikutnya</p>
        </div>
      </div>
      <svg aria-hidden="true" viewBox="0 0 1440 100" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 h-10 w-full text-blue-500/50 sm:h-14">
        <path d="M0 50 C260 -10 430 110 720 62 S1170 10 1440 35 V100 H0Z" fill="currentColor" />
      </svg>
    </section>
  );
}
