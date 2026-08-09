"use client";

import { BookOpen, Dumbbell, Gamepad2, PenLine, TrendingUp, RefreshCw, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const loop = [
  { icon: BookOpen, title: "BELAJAR", desc: "Materi & Jalur Cerdas" },
  { icon: Dumbbell, title: "BERLATIH", desc: "Latihan & soal" },
  { icon: Gamepad2, title: "BERMAIN", desc: "Gim & kompetisi" },
  { icon: PenLine, title: "BERKARYA", desc: "Tulis & bagikan karya" },
  { icon: TrendingUp, title: "BERTUMBUH", desc: "XP, lencana, ranking" },
  { icon: RefreshCw, title: "KEMBALI BELAJAR", desc: "Lanjut langkah berikutnya" },
];

const journeyBlocks = [
  "Pembelajaran",
  "Latihan",
  "Progres",
  "XP",
  "Tantangan",
  "Karya",
  "Pengakuan",
  "Kompetisi",
  "Asesmen",
  "Langkah berikutnya",
];

export default function LearningLoopSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-white overflow-hidden" aria-labelledby="loop-heading">
      <motion.div
        className="text-center max-w-2xl mx-auto mb-14 lg:mb-20 px-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Perjalanan Belajar</span>
          </div>
          <h2 id="loop-heading" className="heading-lg text-zinc-900 mb-5">
            Belajar tidak berhenti{" "}
            <span className="text-primary">ketika soal selesai.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Setiap aktivitas di BahasaCerdas menjadi bagian dari perjalanan yang membangun
            kemampuan, progres, dan motivasi untuk terus melangkah ke tahap berikutnya.
          </p>
      </motion.div>

      {/* Loop steps */}
      <div className="section-container">
        <motion.ol
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {loop.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === loop.length - 1;
            return (
              <motion.li key={step.title} variants={fadeInUp} transition={{ duration: 0.45, ease: "easeOut" }} className="relative">
                <div className={`h-full rounded-2xl border p-5 flex flex-col items-center text-center transition-all duration-300 ${
                  isLast
                    ? "bg-zinc-900 border-zinc-900 text-white"
                    : "bg-zinc-50 border-zinc-100 hover:border-primary/30 hover:shadow-md"
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                    isLast ? "bg-primary text-white" : "bg-primary-light text-primary"
                  }`}>
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <span className={`text-xs font-bold tracking-wider mb-1 ${isLast ? "text-white" : "text-zinc-900"}`}>
                    {step.title}
                  </span>
                  <span className={`text-[11px] leading-snug ${isLast ? "text-zinc-400" : "text-zinc-500"}`}>
                    {step.desc}
                  </span>
                  {!isLast && (
                    <ArrowRight
                      size={16}
                      className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 z-10"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>

      {/* Journey blocks */}
      <motion.div
        className="section-container mt-12"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      >
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2">
          {journeyBlocks.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-50 border border-zinc-100 text-xs font-semibold text-zinc-600"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
              {b}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}