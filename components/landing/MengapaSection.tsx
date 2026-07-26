"use client";

import { Sparkles, Users, ShoppingBag, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer, sectionProps, itemProps } from "@/lib/motion";

const reasons = [
  {
    icon: Sparkles,
    title: "AI Canggih untuk Guru",
    description:
      "Hasilkan Rencana Pembelajaran, soal HOTS, dan materi ajar dalam hitungan detik dengan AI yang dilatih khusus untuk kurikulum Bahasa Indonesia.",
    color: "bg-red-50 text-primary",
  },
  {
    icon: Users,
    title: "Komunitas MGMP Digital",
    description:
      "Bergabung dengan guru Bahasa Indonesia lain untuk diskusi, kolaborasi, dan berbagi inspirasi mengajar.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: ShoppingBag,
    title: "Toko Karya Guru",
    description:
      "Jual Rencana Pembelajaran, modul, dan materi ajar Anda. Dapatkan penghasilan tambahan sambil berbagi karya terbaik dengan sesama guru.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Gamepad2,
    title: "Belajar Jadi Seru",
    description:
      "Kuis multiplayer, tebak kata, dan game edukasi interaktif yang membuat siswa antusias belajar Bahasa Indonesia.",
    color: "bg-violet-50 text-violet-600",
  },
];

export default function MengapaSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-zinc-50" aria-labelledby="mengapa-heading">
      <BatikDecor position="right-top" variant="batik-bg" />

      <div className="section-container relative z-10">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">
              Mengapa BahasaCerdas?
            </span>
          </div>
          <h2 id="mengapa-heading" className="heading-lg text-zinc-900 mb-5">
            Platform Lengkap untuk{" "}
            <span className="text-primary">Guru Bahasa Indonesia</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Semua yang Anda butuhkan dalam satu platform. Dari persiapan mengajar
            hingga pengembangan karir.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6 lg:gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {reasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.title}
                variants={fadeInUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="group relative p-8 lg:p-10 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover"
              >
                <div className={`w-14 h-14 rounded-2xl ${reason.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={28} aria-hidden="true" />
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-bold text-zinc-900 mb-3">
                  {reason.title}
                </h3>
                <p className="text-base text-zinc-500 leading-relaxed">
                  {reason.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
