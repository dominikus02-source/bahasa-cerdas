"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Compass,
  Gamepad2,
  PenLine,
  ArrowRight,
} from "lucide-react";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const experiences = [
  {
    icon: Compass,
    title: "Jalur Cerdas",
    description: "Belajar Bahasa Indonesia dari dasar hingga mahir, langkah demi langkah dengan misi harian.",
    color: "bg-red-50 text-primary",
  },
  {
    icon: Gamepad2,
    title: "Arena & Gim",
    description: "Latihan, gim kata, dan liga mingguan — bermain sambil mengasah kemampuan.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: PenLine,
    title: "Menulis & Berkarya",
    description: "Tulis puisi, cerpen, atau pantun dan tampilkan di portofoliomu.",
    color: "bg-amber-50 text-amber-600",
  },
];

export default function StudentSection() {
  return (
    <section id="untuk-murid" className="relative py-20 lg:py-28 bg-white overflow-hidden scroll-mt-24" aria-labelledby="murid-heading">
      <BatikDecor position="left-bottom" variant="batik-header" />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <span className="text-xs font-semibold text-primary">Untuk Murid</span>
            </div>
            <h2 id="murid-heading" className="heading-lg text-zinc-900 mb-5">
              Murid punya perjalanan untuk{" "}
              <span className="text-primary">belajar.</span>
            </h2>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed mb-8 max-w-xl">
              Belajar, berlatih, bermain, berkarya, dan melihat perkembangan diri dalam
              satu perjalanan — dengan sistem yang membuat kamu ingin terus melangkah.
            </p>
            <Link
              href="/arena"
              className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus-ring"
              aria-label="Masuk ke Arena untuk murid"
            >
              Masuk Arena
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </motion.div>

          <motion.div
            className="grid gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {experiences.map((e) => {
              const Icon = e.icon;
              return (
                <motion.div
                  key={e.title}
                  variants={fadeInUp}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="p-6 rounded-2xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 hover:bg-white transition-all duration-300"
                >
                  <div className={`w-11 h-11 rounded-xl ${e.color} flex items-center justify-center mb-4`}>
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-bold text-zinc-900 mb-1.5">{e.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{e.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}