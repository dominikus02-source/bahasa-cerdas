"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Clock } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative py-20 lg:py-32 bg-zinc-900 overflow-hidden" aria-labelledby="cta-heading">
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
              Gratis untuk Memulai — Tanpa Kartu Kredit
            </span>
          </div>

          <h2 id="cta-heading" className="heading-lg text-white mb-6">
            Siap Merevolusi Cara{" "}
            <span className="text-amber-400">Anda Mengajar</span>?
          </h2>

          <p className="text-base lg:text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl mx-auto">
            Jadilah bagian dari gerakan literasi digital untuk 350.000+ guru
            Bahasa Indonesia. Hemat waktu persiapan, tingkatkan kualitas
            pembelajaran.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 focus-ring"
              aria-label="Mulai gratis 30 hari, daftar sekarang"
            >
              Mulai Gratis 30 Hari
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all duration-200 focus-ring"
              aria-label="Masuk ke akun BahasaCerdas"
            >
              Masuk ke Akun Saya
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-400" aria-hidden="true" />
              Data Aman & Terenkripsi
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-400" aria-hidden="true" />
              Batal Kapan Saja
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" aria-hidden="true" />
              Tanpa Kartu Kredit
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
