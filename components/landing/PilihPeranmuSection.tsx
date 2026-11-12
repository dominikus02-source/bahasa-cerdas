"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Compass, GraduationCap, BookOpen, Check } from "lucide-react";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer, itemProps } from "@/lib/motion";

const PATHS = [
  {
    id: "untuk-umum",
    key: "umum",
    icon: Compass,
    index: "01",
    title: "Umum",
    eyebrow: "Untuk Umum",
    lead: "Belajar, bertanya, dan berkarya tanpa harus di kelas formal.",
    benefits: [
      "Baca artikel AKSARA dan tanya NARA",
      "Uji kemampuan lewat BIGT dan simulasi UKBI",
      "Jelajahi Toko Karya, tulis dan bagikan karya",
    ],
    cta: "Mulai Jelajah",
    href: "/register?role=umum",
    accent: "text-bc-accent",
    soft: "bg-bc-accent-soft",
    border: "border-bc-accent",
    button: "bg-bc-brand text-bc-on-brand shadow-bc-glow",
  },
  {
    id: "untuk-murid",
    key: "murid",
    icon: BookOpen,
    index: "02",
    title: "Murid",
    eyebrow: "Untuk Murid",
    lead: "Belajar, berlatih, bermain, dan tumbuh dalam satu perjalanan.",
    benefits: [
      "Jalur Cerdas, latihan, dan gim (MAIN BERSAMA, Arena)",
      "Simulasi UKBI/TKA, kumpulkan XP dan lencana",
      "Tulis dan bagikan karya siswa",
    ],
    cta: "Masuk Arena",
    href: "/arena",
    accent: "text-bc-violet",
    soft: "bg-bc-violet-soft",
    border: "border-bc-violet",
    button: "bg-bc-murid text-bc-on-brand shadow-bc-glow",
  },
  {
    id: "untuk-guru",
    key: "guru",
    icon: GraduationCap,
    index: "03",
    title: "Guru",
    eyebrow: "Untuk Guru",
    lead: "Semua perangkat mengajar terhubung dalam satu dasbor.",
    benefits: [
      "Kelola kelas, bank soal, dan buku nilai",
      "Generator Rencana Pembelajaran dan soal HOTS, plus pemeriksa otomatis",
      "Berkumpul di MGMP digital",
    ],
    cta: "Masuk Dasbor Guru",
    href: "/guru/beranda",
    accent: "text-bc-info",
    soft: "bg-bc-info-soft",
    border: "border-bc-info",
    button: "bg-bc-info text-bc-on-brand",
  },
] as const;

export default function PilihPeranmuSection() {
  const [active, setActive] = useState<(typeof PATHS)[number]["key"]>("umum");

  return (
    <section
      id="pilih-peranmu"
      className="relative py-16 lg:py-24 bg-bc-surface overflow-hidden scroll-mt-24"
      aria-labelledby="peran-heading"
    >
      <BatikDecor position="right-top" variant="batik-bg" />

      <div className="section-container relative z-10 min-w-0">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-8 lg:mb-12 min-w-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-bc-accent sm:text-xs">
            Tiga jalur setara
          </p>
          <h2 id="peran-heading" className="mb-4 break-words font-sans text-3xl font-extrabold tracking-tight text-bc-text sm:text-4xl lg:text-5xl">
            Pilih Peranmu
          </h2>
          <p className="text-base text-bc-text-2">
            BahasaCerdas terbuka untuk masyarakat umum, murid, dan guru. Pilih jalurmu, lalu mulai dari sini.
          </p>
        </motion.div>

        <div
          role="group"
          aria-label="Pilih peran"
          className="mb-6 grid grid-cols-3 gap-2 min-w-0"
        >
          {PATHS.map((path) => {
            const Icon = path.icon;
            const selected = active === path.key;
            return (
              <button
                key={path.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setActive(path.key);
                }}
                className={`inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all focus-ring ${
                  selected
                    ? `${path.soft} ${path.border} ${path.accent}`
                    : "border-bc-line bg-bc-surface text-bc-text-2 hover:border-bc-border-strong"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {path.title}
              </button>
            );
          })}
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 min-w-0"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {PATHS.map((path) => {
            const Icon = path.icon;
            const selected = active === path.key;
            return (
              <motion.article
                key={path.key}
                id={path.id}
                {...itemProps}
                aria-label={`Pilihan ${path.title}`}
                className={`scroll-mt-24 relative min-w-0 flex flex-col overflow-hidden rounded-bc-hero border bg-bc-surface p-5 sm:p-7 shadow-bc-1 transition-all ${
                  selected ? `${path.border}` : "border-bc-line"
                }`}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundImage: "var(--bc-grad-brand)" }}
                  aria-hidden="true"
                />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="font-sans text-3xl font-extrabold leading-none tracking-tight text-bc-text-3/80">
                    {path.index}
                  </span>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-bc-icon ${path.soft} ${path.accent}`}>
                    <Icon size={22} aria-hidden="true" />
                  </div>
                </div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${path.accent}`}>{path.eyebrow}</p>
                <h3 className="font-sans text-2xl font-extrabold tracking-tight text-bc-text mb-2">{path.title}</h3>
                <p className="text-sm text-bc-text-2 leading-relaxed mb-5">{path.lead}</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {path.benefits.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-bc-text leading-snug min-w-0">
                      <Check size={16} className={`mt-0.5 shrink-0 ${path.accent}`} aria-hidden="true" />
                      <span className="min-w-0 break-words">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={path.href}
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-bc-ctl px-4 py-2.5 text-sm font-semibold transition-all focus-ring hover:-translate-y-0.5 ${path.button}`}
                >
                  {path.cta}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
