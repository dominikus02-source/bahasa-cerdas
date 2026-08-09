"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  GraduationCap,
  UserRound,
  Library,
  BookOpen,
  Dumbbell,
  Gamepad2,
  PenLine,
  Sparkles,
  Users,
  Compass,
  HeartHandshake,
} from "lucide-react";

const components = [
  { icon: Library, label: "Kelas" },
  { icon: BookOpen, label: "Materi" },
  { icon: Dumbbell, label: "Latihan" },
  { icon: Compass, label: "Jalur Cerdas" },
  { icon: Gamepad2, label: "Arena" },
  { icon: PenLine, label: "Karya" },
  { icon: Users, label: "Kompetisi" },
  { icon: Sparkles, label: "Asesmen" },
  { icon: HeartHandshake, label: "BIGT" },
];

const nodeMotion = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export default function HeroEcosystemVisual() {
  return (
    <div className="relative" aria-hidden="true">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
        className="relative rounded-3xl border border-zinc-200/70 bg-white/80 backdrop-blur-xl shadow-2xl shadow-zinc-900/10 p-5 sm:p-7"
      >
        {/* Head */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-zinc-400">
            Satu Ekosistem
          </p>
          <span className="relative flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Aktif
          </span>
        </div>

        {/* Guru — Platform — Murid */}
        <div className="relative flex items-center justify-between gap-2 py-6">
          <svg
            className="absolute left-0 right-0 top-1/2 w-full h-8 -translate-y-1/2 pointer-events-none"
            viewBox="0 0 400 32"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M60 16 H 120 M 280 16 H 340"
              stroke="#dc2626"
              strokeOpacity="0.25"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <path d="M 130 8 C 170 8 170 24 200 16" stroke="#dc2626" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 6" />
            <path d="M 270 8 C 230 8 230 24 200 16" stroke="#dc2626" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 6" />
          </svg>

          <motion.div {...nodeMotion} transition={{ ...nodeMotion.transition, delay: 0.45 }} className="relative">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl shadow-primary/30">
                <GraduationCap size={30} className="text-white" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold text-zinc-700">Guru</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.45 }}
            className="relative z-10"
          >
<div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-zinc-900 text-white shadow-2xl shadow-zinc-900/30 min-w-[7.5rem]">
              <div className="relative w-9 h-9">
                <Image src="/BC-logo.png" alt="" fill sizes="36px" className="object-contain" />
              </div>
              <span className="text-sm font-bold leading-tight text-center">
                BahasaCerdas
              </span>
            </div>
          </motion.div>

          <motion.div {...nodeMotion} transition={{ ...nodeMotion.transition, delay: 0.55 }} className="relative">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-xl shadow-violet-500/30">
                <UserRound size={30} aria-hidden="true" />
              </div>
              <span className="text-xs font-bold text-zinc-700">Murid</span>
            </div>
          </motion.div>
        </div>

        {/* Ecosystem components */}
        <div className="flex flex-wrap justify-center gap-2 pt-4 border-t border-zinc-100">
          {components.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.span
                key={c.label}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.5 + i * 0.06 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-600 shadow-sm"
              >
                <Icon size={13} className="text-primary" aria-hidden="true" />
                {c.label}
              </motion.span>
            );
          })}
        </div>
      </motion.div>

      {/* Floating accent */}
      <motion.div
        className="absolute -top-4 -left-3 z-10 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-primary/30"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        Belajar &bull; Berlatih &bull; Berkarya
      </motion.div>
    </div>
  );
}