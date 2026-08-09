"use client";

import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Gamepad2,
  PenLine,
  ArrowUpRight,
  ArrowLeftRight,
} from "lucide-react";
import { motion } from "framer-motion";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer, sectionProps } from "@/lib/motion";

const pillars = [
  {
    icon: BookOpen,
    label: "BELAJAR",
    title: "Pengalaman belajar terstruktur",
    description:
      "Jalur Cerdas, materi ajar, dan buku panduan — dari dasar hingga mahir, langkah demi langkah.",
    href: "/arena/jalur-cerdas",
    color: "bg-red-50 text-primary",
    chip: "Jalur Cerdas · Materi · Buku Panduan",
  },
  {
    icon: GraduationCap,
    label: "MENGAJAR",
    title: "Ruang untuk mengajar",
    description:
      "Kelasku, bank soal, latihan harian, dan penilaian — semua terpusat untuk guru.",
    href: "/guru/beranda",
    color: "bg-emerald-50 text-emerald-600",
    chip: "Kelasku · Bank Soal · Buku Nilai",
  },
  {
    icon: Gamepad2,
    label: "BERLATIH & BERMAIN",
    title: "Latihan yang terasa seperti bermain",
    description:
      "Latihan soal, gim edukasi, liga mingguan, dan simulasi UKBI/TKA dalam satu arena.",
    href: "/arena",
    color: "bg-violet-50 text-violet-600",
    chip: "Arena · Gim · Simulasi · Liga",
  },
  {
    icon: PenLine,
    label: "BERKARYA & BERTUMBUH",
    title: "Bahasa Indonesia untuk mencipta",
    description:
      "Karya siswa, Toko Karya untuk guru, komunitas, dan perkembangan kemampuan yang terus diakui.",
    href: "/marketplace",
    color: "bg-amber-50 text-amber-600",
    chip: "Karya Siswa · Toko Karya · Komunitas",
  },
];

export default function EcosystemSection() {
  return (
    <section id="ekosistem" className="relative py-14 lg:py-20 bg-zinc-50 scroll-mt-24" aria-labelledby="ekosistem-heading">
      <BatikDecor position="right-top" variant="batik-bg" />

      <div className="section-container relative z-10">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-10 lg:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Ekosistem</span>
          </div>
          <h2 id="ekosistem-heading" className="heading-lg text-zinc-900 mb-5">
            Satu ekosistem.{" "}
            <span className="text-primary">Banyak cara untuk berkembang.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            BahasaCerdas adalah ekosistem belajar Bahasa Indonesia yang menghubungkan guru,
            murid, kelas, materi, latihan, permainan, karya, komunitas, dan asesmen dalam
            satu platform. Belajar, berlatih, bermain, berkarya, dan bertumbuh — di satu
            tempat.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6 lg:gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <motion.div key={p.label} variants={fadeInUp} transition={{ duration: 0.5, ease: "easeOut" }}>
                <Link
                  href={p.href}
                  className="group relative p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover block focus-ring"
                  aria-label={`${p.label} — ${p.title}. ${p.description}`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${p.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={24} aria-hidden="true" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-100 text-[11px] font-bold tracking-widest text-zinc-500">
                      {p.label}
                    </span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-display font-bold text-zinc-900 mb-3 group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-base text-zinc-500 leading-relaxed mb-5">
                    {p.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">{p.chip}</span>
                    <ArrowUpRight size={18} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-zinc-100 bg-white px-6 py-4 text-sm font-semibold text-zinc-700">
            <span className="text-emerald-600">Guru mengajar</span>
            <ArrowLeftRight size={16} className="text-zinc-300" aria-hidden="true" />
            <span className="text-primary">BahasaCerdas menghubungkan</span>
            <ArrowLeftRight size={16} className="text-zinc-300" aria-hidden="true" />
            <span className="text-violet-600">Murid belajar</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}