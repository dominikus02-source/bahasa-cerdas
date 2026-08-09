"use client";

import { Network, Gauge, ClipboardCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, sectionProps } from "@/lib/motion";

const principles = [
  {
    number: "01",
    icon: Network,
    title: "Ekosistem",
    description:
      "Guru, murid, kelas, materi, latihan, karya, komunitas, dan asesmen saling terhubung dalam satu platform.",
    color: "bg-red-50 text-primary",
  },
  {
    number: "02",
    icon: Gauge,
    title: "Perjalanan Belajar",
    description:
      "Murid tidak hanya menyelesaikan soal. Mereka membangun perjalanan kemampuan dari dasar hingga mahir.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    number: "03",
    icon: ClipboardCheck,
    title: "Keterlibatan",
    description:
      "XP, lencana, pencapaian, tantangan, kompetisi, dan papan peringkat membuat progres terasa nyata.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    number: "04",
    icon: Sparkles,
    title: "Asesmen",
    description:
      "Pengalaman belajar dapat terhubung dengan pengukuran kemampuan melalui ekosistem BIGT.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function WhatIsSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-zinc-50" aria-labelledby="apa-itu-heading">
      <motion.div
        className="text-center max-w-2xl mx-auto mb-16 lg:mb-20 px-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
          <span className="text-xs font-semibold text-primary">
            Apa Itu BahasaCerdas?
          </span>
        </div>
        <h2 id="apa-itu-heading" className="heading-lg text-zinc-900 mb-5">
          Bukan sekadar tempat belajar.{" "}
          <span className="text-primary">Bukan sekadar alat AI.</span>
        </h2>
        <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
          BahasaCerdas adalah ekosistem belajar Bahasa Indonesia — tempat guru
          mengajar, murid berkembang, dan karya tumbuh dalam satu platform yang
          saling terhubung.
        </p>
      </motion.div>

      <div className="section-container">
        <motion.div
          className="grid md:grid-cols-2 gap-6 lg:gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {principles.map((p) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.number}
                variants={fadeInUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="group relative p-8 lg:p-10 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${p.color} flex items-center justify-center`}>
                    <Icon size={26} aria-hidden="true" />
                  </div>
                  <span className="text-4xl font-display font-bold text-zinc-100 group-hover:text-primary/20 transition-colors">
                    {p.number}
                  </span>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-bold text-zinc-900 mb-3">
                  {p.title}
                </h3>
                <p className="text-base text-zinc-500 leading-relaxed">
                  {p.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}