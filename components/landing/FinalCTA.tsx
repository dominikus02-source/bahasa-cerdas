"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Sparkles } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative py-16 lg:py-24 bg-zinc-900 overflow-hidden" aria-labelledby="cta-heading">
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

      <div className="section-container relative z-10 text-center">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
            <Sparkles size={14} className="text-amber-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-amber-400">
              Gratis untuk Memulai
            </span>
          </div>

          <h2 id="cta-heading" className="heading-lg text-white mb-6">
            Bahasa Indonesia sedang bertumbuh.{" "}
            <span className="text-amber-400">Mari tumbuh bersamanya.</span>
          </h2>

          <p className="text-base lg:text-lg text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto">
            Untuk guru yang ingin mengajar lebih mudah.
            <br />
            Untuk siswa yang ingin belajar lebih seru.
            <br />
            Untuk pembelajaran Indonesia yang terus berkembang.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 focus-ring"
              aria-label="Mulai gratis, daftar sekarang"
            >
              Mulai Gratis
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="#ekosistem"
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all duration-200 focus-ring"
              aria-label="Jelajahi ekosistem BahasaCerdas"
            >
              Jelajahi BahasaCerdas
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-400" aria-hidden="true" />
              Data Aman & Terenkripsi
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-400" aria-hidden="true" />
              Pembayaran Mudah & Aman
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" aria-hidden="true" />
              AI Membantu, Guru Memutuskan
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}