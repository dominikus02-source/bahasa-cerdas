"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Dumbbell, BarChart3 } from "lucide-react";

const steps = [
  { icon: BookOpen, title: "Belajar", description: "Materi lengkap, modern, dan kontekstual.", accent: "#7c3aed", tint: "#ede9fe" },
  { icon: Dumbbell, title: "Latihan", description: "Soal variatif dengan pembahasan cerdas.", accent: "#ea8a00", tint: "#fff1da" },
  { icon: ClipboardCheck, title: "Asesmen", description: "Uji kompetensi sesuai standar UKBI & TKA.", accent: "#1467e9", tint: "#e2efff" },
  { icon: BarChart3, title: "Pahami hasil", description: "Laporan, analisis, dan rekomendasi belajar personal.", accent: "#16a34a", tint: "#dcfce7" },
];

export default function BigtSection() {
  return (
    <section id="bigt" aria-labelledby="bigt-heading" className="relative isolate scroll-mt-24 overflow-hidden py-14 sm:py-20 lg:py-24" style={{ background: "radial-gradient(ellipse at 85% 12%, #1351b7 0%, #092c76 43%, #061b55 100%)", color: "#fff" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-72 w-96 rounded-full opacity-20 blur-3xl" style={{ background: "#4f9aff" }} />
      <div className="section-container relative z-10 mx-auto px-4 sm:px-6">
        <header className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
          <span className="mb-5 inline-flex rounded-full px-6 py-2 text-sm font-extrabold tracking-wider shadow-sm" style={{ background: "#ffcf3b", color: "#101b3d" }}>BIGT</span>
          <h2 id="bigt-heading" className="mb-5 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl" style={{ color: "#fff" }}>
            Dari belajar hingga <span className="relative inline-block" style={{ color: "#ffca2c" }}>mengukur kemampuan.<span aria-hidden="true" className="absolute -bottom-1 left-1/4 right-1 h-1 rounded-full" style={{ background: "#ffca2c", transform: "rotate(-2deg)" }} /></span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 sm:text-base lg:text-lg" style={{ color: "#e0eaff" }}>
            Sistem pembelajaran terintegrasi untuk belajar, berlatih, asesmen, dan memahami capaian kemampuan Bahasa Indonesia secara komprehensif.
          </p>
        </header>
        <div className="mx-auto mb-9 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {steps.map(({ icon: Icon, title, description, accent, tint }) => (
            <div key={title} className="flex min-h-28 items-center gap-4 rounded-[1.5rem] border p-4 shadow-xl sm:min-h-36 sm:p-5" style={{ background: "linear-gradient(145deg,#ffffff,#f0f5ff)", borderColor: "#dce7ff", color: "#091a46" }}>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-20 sm:w-20" style={{ background: tint, color: accent }}>
                <Icon size={34} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-base font-extrabold sm:text-xl" style={{ color: "#091a46" }}>{title}</h3>
                <p className="text-xs leading-5 sm:text-sm sm:leading-6" style={{ color: "#334466" }}>{description}</p>
              </div>
              <ArrowRight className="hidden shrink-0 sm:block" size={20} style={{ color: "#536b9c" }} aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/arena/simulasi" aria-label="Coba simulasi UKBI dan TKA" className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-center text-sm font-extrabold shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-300 sm:text-lg" style={{ background: "linear-gradient(100deg,#ffc226,#ffda48,#ffbb16)", color: "#101b35" }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#15234b", color: "#fff" }}><ArrowRight size={18} aria-hidden="true" /></span>
            Coba Simulasi UKBI &amp; TKA
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <p className="mt-5 text-xs leading-5" style={{ color: "#dbe6ff" }}>Belajar → Latihan → Asesmen → Pahami hasil → Langkah berikutnya</p>
        </div>
      </div>
      <svg aria-hidden="true" viewBox="0 0 1440 100" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 h-10 w-full sm:h-14">
        <path d="M0 50 C260 -10 430 110 720 62 S1170 10 1440 35 V100 H0Z" fill="#1761dc" opacity=".6" />
        <path d="M0 70 C300 10 490 110 780 78 S1200 45 1440 15 V100 H0Z" fill="#2a80f4" opacity=".45" />
      </svg>
    </section>
  );
}
