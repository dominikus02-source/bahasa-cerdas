"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer, sectionProps, itemProps } from "@/lib/motion";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      containerRef.current.style.setProperty("--mouse-x", String(x));
      containerRef.current.style.setProperty("--mouse-y", String(y));
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      className="relative min-h-[90vh] lg:min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-white via-white to-zinc-50"
      aria-labelledby="hero-heading"
    >
      <BatikDecor position="top-right" variant="batik-bg" />
      <BatikDecor position="bottom-left" variant="batik-header" className="opacity-[0.02]" />

      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />

      <div
        ref={containerRef}
        className="section-container relative z-10 pt-24 lg:pt-32 pb-16 lg:pb-24"
        style={{ "--mouse-x": "0", "--mouse-y": "0" } as React.CSSProperties}
      >
        <motion.div
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          variants={staggerContainer}
          {...sectionProps}
        >
          <div className="max-w-2xl">
            <motion.div {...itemProps}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-6">
                <Sparkles size={14} className="text-primary" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary">
                  Platform AI Bahasa Indonesia — Live
                </span>
              </div>
            </motion.div>

            <motion.h1
              id="hero-heading"
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="heading-xl text-zinc-900 mb-6 leading-[1.08]"
            >
              Bahasa Indonesia yang{" "}
              <span className="text-primary">akhirnya</span>
              <br />
              <span className="text-zinc-500 text-3xl sm:text-4xl lg:text-5xl block mt-2">
                menyenangkan — untuk guru & siswa.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              className="text-base lg:text-lg text-zinc-500 leading-relaxed mb-8 max-w-xl"
            >
              Satu ekosistem: guru buat RPP dalam 30 detik, siswa nulis, bersaing,
              dan berkembang lewat AI + gamifikasi. Dirancang untuk Kurikulum Merdeka.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
              className="mb-8"
            >
              <p className="text-sm text-zinc-500 font-medium">
                Dibuat oleh <span className="text-zinc-700 font-semibold">guru Bahasa Indonesia</span>, untuk guru
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                href="/register?role=guru"
                className="group relative inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 focus-ring"
                aria-label="Daftar sebagai guru"
              >
                Daftar sebagai Guru
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/register?role=siswa"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all duration-200 focus-ring"
                aria-label="Daftar sebagai siswa"
              >
                Daftar sebagai Siswa
              </Link>
            </motion.div>
          </div>

          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
            className="relative hidden lg:block"
            aria-hidden="true"
          >
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/10 border border-zinc-200 bg-white">
                <div className="aspect-[4/3] relative overflow-hidden bg-zinc-100">
                  <Image
                    src="/arena-fitur.png"
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-contain object-left-top"
                    priority
                  />
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 w-80 rounded-xl overflow-hidden shadow-lg shadow-zinc-900/10 border border-zinc-200 bg-white">
                  <Image
                    src="/dasbor-guru.png"
                    alt=""
                    width={320}
                    height={173}
                    className="w-full h-auto object-contain"
                    priority
                  />
                <div className="px-3 py-2 bg-white">
                  <p className="text-xs font-semibold text-zinc-700">Dasbor Guru</p>
                </div>
              </div>

              <div className="absolute -top-3 -right-3 px-4 py-2 rounded-xl bg-white border border-zinc-100 shadow-lg shadow-zinc-900/5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="text-xs font-semibold text-zinc-700">Live &bull; Platform aktif</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" aria-hidden="true" />
    </section>
  );
}
