"use client";

import {
  FileText,
  ScrollText,
  MessageSquareText,
  SpellCheck,
  Star,
  BrainCircuit,
} from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer, sectionProps, itemProps } from "@/lib/motion";

const tools = [
  {
    icon: FileText,
    title: "Generator RPP",
    description:
      "Hasilkan RPP lengkap dengan tujuan pembelajaran, kegiatan, dan asesmen sesuai Kurikulum Merdeka dalam 30 detik.",
    color: "bg-red-50 text-primary",
    href: "/guru/ai-tools",
  },
  {
    icon: ScrollText,
    title: "Generator Soal HOTS",
    description:
      "Buat soal HOTS + kisi-kisi + rubrik penilaian otomatis. Tinggal masukkan topik, AI kerjakan sisanya.",
    color: "bg-amber-50 text-amber-600",
    href: "/guru/ai-tools",
  },
  {
    icon: Star,
    title: "Pemeriksa Otomatis",
    description:
      "Nilai tugas esai, karangan, dan jawaban terbuka siswa secara otomatis dengan analisis bahasa cerdas.",
    color: "bg-emerald-50 text-emerald-600",
    href: "/guru/ai-tools/grading",
  },
  {
    icon: SpellCheck,
    title: "Koreksi EYD & PUEBI",
    description:
      "Deteksi dan perbaiki kesalahan ejaan, tanda baca, dan penulisan sesuai EYD/PUEBI terbaru.",
    color: "bg-blue-50 text-blue-600",
    href: "/guru/ai-tools/eyd",
  },
  {
    icon: MessageSquareText,
    title: "Analisis Teks",
    description:
      "Analisis struktur, kebahasaan, dan kaidah teks. Cocok untuk pembelajaran teks prosedur, eksplanasi, dan lainnya.",
    color: "bg-violet-50 text-violet-600",
    href: "/guru/ai-tools/text-analysis",
  },
  {
    icon: BrainCircuit,
    title: "Asisten AI BC",
    description:
      "Tanya apapun tentang Bahasa Indonesia, dapatkan jawaban instan. Bantuan mengajar 24/7 dengan AI.",
    color: "bg-cyan-50 text-cyan-600",
    href: "/ai-bc",
  },
];

export default function AIToolsSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-white overflow-hidden" aria-labelledby="ai-heading">
      <BatikDecor position="left-bottom" variant="batik-header" />

      <div className="section-container relative z-10">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16 lg:mb-20"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">
              Alat AI Unggulan
            </span>
          </div>
          <h2 id="ai-heading" className="heading-lg text-zinc-900 mb-5">
            Alat AI Canggih untuk{" "}
            <span className="text-primary">Mempermudah Mengajar</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Hemat waktu hingga 10x lipat dengan 6 alat AI yang dirancang khusus
            untuk guru Bahasa Indonesia.
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.div key={tool.title} variants={fadeInUp} transition={{ duration: 0.5, ease: "easeOut" }}>
                <Link
                  href={tool.href}
                  className="group relative p-6 lg:p-8 rounded-2xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 card-hover block focus-ring"
                  aria-label={`${tool.title} — ${tool.description}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-zinc-900 mb-2.5 group-hover:text-primary transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Coba Sekarang <ChevronRight size={16} aria-hidden="true" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
