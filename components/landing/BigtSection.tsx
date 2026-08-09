"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Dumbbell,
  ClipboardCheck,
  Brain,
  MoveRight,
  ArrowRight,
} from "lucide-react";

const bigtSteps = [
  { icon: BookOpen, label: "BELAJAR" },
  { icon: Dumbbell, label: "LATIHAN" },
  { icon: ClipboardCheck, label: "ASESMEN" },
  { icon: Brain, label: "MEMAHAMI KEMAMPUAN" },
  { icon: ArrowRight, label: "LANGKAH BELAJAR BERIKUTNYA" },
];

const claims = [
  "Ratusan soal latihan UKBI & TKA dari SD hingga UTBK",
  "Simulasi dengan sistem tanpa kebocoran jawaban",
  "Pengalaman menulis dan berbicara yang dinilai otomatis",
  "Hasil latihan tersimpan sebagai dokumen perkembangan",
];

export default function BigtSection() {
  return (
    <section id="bigt" className="relative py-20 lg:py-28 bg-zinc-900 overflow-hidden scroll-mt-24" aria-labelledby="bigt-heading">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
        style={{
          backgroundImage: "url('/batik bg bc.png')",
          backgroundSize: "400px",
          backgroundRepeat: "repeat",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-60" aria-hidden="true" />

      <div className="section-container relative z-10">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14 lg:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
            <span className="text-xs font-semibold text-amber-400">BIGT</span>
          </div>
          <h2 id="bigt-heading" className="heading-lg text-white mb-5">
            Dari belajar hingga{" "}
            <span className="text-amber-400">mengukur kemampuan.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-400 leading-relaxed">
            Setelah belajar dan berlatih, murid mengukur kemampuan melalui simulasi
            UKBI/TKA yang terstruktur — dan melanjutkan langkah berikutnya.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row items-stretch justify-center gap-3 lg:gap-2 mb-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
{bigtSteps.map((s, i) => {
            const Icon = s.icon;
            const isLast = i === bigtSteps.length - 1;
            return (
              <div key={s.label} className="flex-1 flex items-center justify-center gap-1">
                <div
                  className={`w-full rounded-2xl px-4 py-5 text-center flex flex-col items-center gap-2 ${
                    isLast
                      ? "bg-amber-400 text-zinc-900"
                      : "bg-white/5 border border-white/10 text-white"
                  }`}
                >
                  <Icon size={20} className={isLast ? "text-zinc-900" : "text-amber-400"} aria-hidden="true" />
                  <span className={`text-[11px] font-bold tracking-wide ${isLast ? "text-zinc-900" : "text-zinc-200"}`}>
                    {s.label}
                  </span>
                </div>
                {!isLast && (
                  <MoveRight size={14} className="text-zinc-600 shrink-0 hidden lg:block" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        >
          {claims.map((claim) => (
            <div key={claim} className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-zinc-300 leading-relaxed">{claim}</p>
            </div>
          ))}
        </motion.div>

        <div className="text-center">
          <Link
            href="/arena/simulasi"
            className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 focus-ring"
            aria-label="Coba simulasi UKBI dan TKA"
          >
            Coba Simulasi UKBI & TKA
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}