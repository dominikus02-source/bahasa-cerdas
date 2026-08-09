"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardCheck,
  BookMarked,
  Sparkles,
  Store,
  PenLine,
  ArrowRight,
  ArrowLeftRight,
} from "lucide-react";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const tools = [
  { icon: LayoutDashboard, label: "Kelasku", color: "bg-emerald-50 text-emerald-600" },
  { icon: BookOpen, label: "Materi Ajar", color: "bg-red-50 text-primary" },
  { icon: FileText, label: "Bank Soal", color: "bg-amber-50 text-amber-600" },
  { icon: ClipboardCheck, label: "Asesmen", color: "bg-blue-50 text-blue-600" },
  { icon: BookMarked, label: "Buku Nilai", color: "bg-violet-50 text-violet-600" },
  { icon: Sparkles, label: "AI untuk Guru", color: "bg-cyan-50 text-cyan-600" },
  { icon: PenLine, label: "Perangkat Ajar", color: "bg-rose-50 text-rose-600" },
  { icon: Store, label: "Toko Karya", color: "bg-sky-50 text-sky-600" },
];

export default function TeacherSection() {
  return (
    <section id="untuk-guru" className="relative py-20 lg:py-28 bg-zinc-50 overflow-hidden scroll-mt-24" aria-labelledby="guru-heading">
      <BatikDecor position="right-top" variant="batik-bg" />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            className="order-2 lg:order-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.label}
                  variants={fadeInUp}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 hover:shadow transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center`}>
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-700 text-center leading-snug">
                    {t.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            className="order-1 lg:order-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <span className="text-xs font-semibold text-primary">Untuk Guru</span>
            </div>
            <h2 id="guru-heading" className="heading-lg text-zinc-900 mb-5">
              Guru punya ruang untuk{" "}
              <span className="text-primary">mengajar.</span>
            </h2>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed mb-8 max-w-xl">
              Kelas, materi ajar, bank soal, latihan harian, dan penilaian — semua
              terhubung dalam satu dasbor, sehingga guru lebih fokus membimbing murid.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/guru/beranda"
                className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus-ring"
                aria-label="Buka dasbor guru BahasaCerdas"
              >
                Masuk Dasbor Guru
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-zinc-100 bg-white px-6 py-4 text-sm font-semibold text-zinc-700">
            <span className="text-emerald-600">Guru</span>
            <ArrowLeftRight size={16} className="text-zinc-300" aria-hidden="true" />
            <span className="text-primary">BahasaCerdas</span>
            <ArrowLeftRight size={16} className="text-zinc-300" aria-hidden="true" />
            <span className="text-violet-600">Murid</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}