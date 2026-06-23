"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const stats = [
  {
    value: "Live",
    color: "text-primary",
    label: "Platform aktif dalam beta terbatas",
    sub: "Sejak 2026 · Versi Beta",
  },
  {
    value: "57K+",
    color: "text-primary",
    label: "Baris kode produksi yang sudah berjalan",
    sub: "52+ Database Models",
  },
  {
    value: "21.600+",
    color: "text-primary",
    label: "Item konten berkualitas siap diakses",
    sub: "Materi Kelas VII–XII",
  },
  {
    value: "350K+",
    color: "text-amber-500",
    label: "Guru Bahasa Indonesia yang bisa kami jangkau",
    sub: "Target Pasar Nasional",
  },
];

export default function TrustBar() {
  return (
    <section className="relative py-12 lg:py-16 bg-white border-y border-zinc-100" aria-label="Statistik platform">
      <div className="section-container">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden border border-zinc-200"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.value}
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white px-6 py-7 text-center"
            >
              <div className={`font-display text-4xl font-normal leading-none mb-2 ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-zinc-500 text-sm leading-snug mb-2">
                {stat.label}
              </div>
              <div className={`text-xs font-bold tracking-wider uppercase ${stat.color} opacity-70`}>
                {stat.sub}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-center text-zinc-400 text-xs mt-4">
          * Platform dalam fase beta terbatas. Angka mencerminkan infrastruktur teknis aktual, bukan jumlah pengguna.
        </p>
      </div>
    </section>
  );
}
