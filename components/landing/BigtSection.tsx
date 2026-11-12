"use client";

import Link from "next/link";
import { BookOpen, Dumbbell, ClipboardCheck, Brain, ArrowRight } from "lucide-react";

const steps = [
  { icon: BookOpen, title: "Belajar", detail: "Materi terarah dan kontekstual" },
  { icon: Dumbbell, title: "Latihan", detail: "Soal adaptif dan bervariasi" },
  { icon: ClipboardCheck, title: "Asesmen", detail: "Ukur kompetensi melalui simulasi" },
  { icon: Brain, title: "Pahami hasil", detail: "Kenali kekuatan dan area peningkatan" },
];
const claims = [
  "Ratusan soal latihan UKBI & TKA dari SD hingga UTBK",
  "Simulasi dengan sistem tanpa kebocoran jawaban",
  "Pengalaman menulis dan berbicara yang dinilai otomatis",
  "Hasil latihan tersimpan sebagai dokumen perkembangan",
];

export default function BigtSection() {
  return (
    <section id="bigt" aria-labelledby="bigt-heading" className="relative isolate overflow-hidden scroll-mt-24 py-14 sm:py-20 lg:py-24" style={{ backgroundColor: "#101b35", color: "#ffffff" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(75,92,210,.25), transparent 60%)" }} />
      <div className="section-container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-9 max-w-2xl text-center sm:mb-12">
          <span className="mb-4 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-xs font-bold tracking-widest" style={{ color: "#fcd34d" }}>BIGT</span>
          <h2 id="bigt-heading" className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ color: "#ffffff" }}>
            Dari belajar hingga <span style={{ color: "#fbbf24" }}>mengukur kemampuan.</span>
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-7 sm:text-base" style={{ color: "#d7e0f1" }}>
            Setelah belajar dan berlatih, murid mengukur kemampuan melalui simulasi UKBI/TKA yang terstruktur — lalu menentukan langkah belajar berikutnya.
          </p>
        </div>
        <div className="mx-auto mb-8 grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, detail }, index) => (
            <div key={title} className="flex min-h-40 flex-col items-center rounded-2xl border p-4 text-center sm:min-h-44 sm:p-5" style={{ backgroundColor: "#1b2a49", borderColor: "#344563" }}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "#34405a", color: "#fbbf24" }}>
                <Icon size={24} aria-hidden="true" />
              </div>
              <span className="mb-1 text-xs font-bold uppercase tracking-wide sm:text-sm" style={{ color: "#ffffff" }}>{index + 1}. {title}</span>
              <p className="text-xs leading-5 sm:text-sm" style={{ color: "#d7e0f1" }}>{detail}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mb-8 grid max-w-4xl gap-3 sm:grid-cols-2">
          {claims.map((claim) => (
            <div key={claim} className="flex items-start gap-3 rounded-xl border px-4 py-3" style={{ borderColor: "#344563", backgroundColor: "#172540" }}>
              <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
              <p className="text-sm leading-6" style={{ color: "#e4eaf5" }}>{claim}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/arena/simulasi" aria-label="Coba simulasi UKBI dan TKA" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-center text-sm font-bold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300" style={{ backgroundColor: "#fbbf24", color: "#172033" }}>
              Coba Simulasi UKBI & TKA <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <p className="text-center text-xs" style={{ color: "#c2cde1" }}>Belajar → Latihan → Asesmen → Pahami hasil → Lanjutkan belajar</p>
        </div>
      </div>
    </section>
  );
}
