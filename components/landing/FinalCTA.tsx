"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Sparkles } from "lucide-react";

export default function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden py-16 lg:py-24"
      style={{ background: "linear-gradient(165deg, var(--bc-login-night-via), var(--bc-login-night-to))" }}
      aria-labelledby="cta-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "url('/brand/batik-accent.webp')",
          backgroundSize: "720px",
          backgroundRepeat: "repeat",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--clr-accent) 40%, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--clr-violet) 45%, transparent)" }}
        aria-hidden="true"
      />

      <div className="section-container relative z-10 min-w-0 text-center">
        <motion.div
          className="mx-auto max-w-3xl min-w-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5">
            <Sparkles size={14} className="text-bc-accent" aria-hidden="true" />
            <span className="text-xs font-semibold text-white">
              Gratis untuk Memulai
            </span>
          </div>

          <h2 id="cta-heading" className="mb-6 break-words font-sans text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Bahasa Indonesia sedang bertumbuh.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--bc-grad-brand)" }}
            >
              Mari tumbuh bersamanya.
            </span>
          </h2>

          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/70 lg:text-lg">
            Untuk masyarakat umum yang ingin belajar dan berkarya.
            <br />
            Untuk murid yang ingin belajar lebih seru.
            <br />
            Untuk guru yang ingin mengajar lebih mudah.
          </p>

          <div className="mb-10 flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-bc-ctl bg-bc-brand px-8 py-3.5 text-base font-semibold text-bc-on-brand shadow-bc-glow transition-all duration-200 hover:-translate-y-0.5 focus-ring"
              aria-label="Mulai gratis, daftar sekarang"
            >
              Mulai Gratis
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="#produk"
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-bc-ctl border border-white/15 bg-white/10 px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:bg-white/20 focus-ring"
              aria-label="Jelajahi produk BahasaCerdas"
            >
              Jelajahi BahasaCerdas
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/55">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-bc-accent" aria-hidden="true" />
              Data Aman & Terenkripsi
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-bc-accent" aria-hidden="true" />
              Pembayaran Mudah & Aman
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-bc-accent" aria-hidden="true" />
              AI Membantu, Guru Memutuskan
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
