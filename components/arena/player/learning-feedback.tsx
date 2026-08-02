"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, TrendingUp } from "lucide-react";
import { GlassCard } from "./ui";
import type { PlayerProfileView } from "@/lib/gamification/client-types";

/** Feedback & rekomendasi belajar berdasarkan progres pemain. */
export function LearningFeedback({ profile }: { profile: PlayerProfileView }) {
  const feedback = buildFeedback(profile);

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--px-royal)] to-[var(--px-royal-2)]">
          <Lightbulb size={16} className="text-white" />
        </div>
        <h3 className="text-base font-extrabold text-[var(--px-text)]">Kabar Belajarmu</h3>
      </div>

      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-start gap-3 rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3"
        >
          <TrendingUp size={18} className="mt-0.5 shrink-0 text-[var(--px-mint)]" />
          <div>
            <p className="text-sm font-bold text-[var(--px-text)]">{feedback.headline}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--px-text-dim)]">{feedback.detail}</p>
          </div>
        </motion.div>

        {feedback.tips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-[var(--px-gold)]/25 bg-[var(--px-gold)]/5 p-3"
          >
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--px-gold)]">Saran</p>
            <ul className="space-y-1.5">
              {feedback.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--px-text-dim)]">
                  <ArrowRight size={13} className="mt-0.5 shrink-0 text-[var(--px-gold)]" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </GlassCard>
  );
}

function buildFeedback(profile: PlayerProfileView): { headline: string; detail: string; tips: string[] } {
  if (profile.level >= 30) {
    return {
      headline: "Luar biasa! Kamu sudah veteran Bahasa.",
      detail: `Level ${profile.level} dengan pangkat ${profile.rankLabel} — terus pertahankan konsistensi belajar harianmu.`,
      tips: [
        "Ajak temanmu untuk bertanding di leaderboard mingguan.",
        "Bantu rekanmu belajar lewat karya-karya terbaikmu.",
      ],
    };
  }
  if (profile.level >= 15) {
    return {
      headline: "Progresmu mengagumkan!",
      detail: `Kamu di level ${profile.level} (${profile.rankLabel}). Rutinitas belajarmu sudah terbentuk dengan baik.`,
      tips: [
        "Selesaikan misi harian untuk bonus koin tambahan.",
        `Kumpulkan ${Math.max(1, 500 - profile.weeklyXp)} XP lagi untuk target mingguan.`,
      ],
    };
  }
  if (profile.level >= 5) {
    return {
      headline: "Kamu mulai terbiasa belajar!",
      detail: `Sudah di level ${profile.level} — jangan berhenti. Setiap latihan kecil menambah XP besar.`,
      tips: [
        "Selesaikan 1 misi harian tiap hari agar streak tetap hidup.",
        "Buka Jalur Cerdas untuk latihan terarah sesuai levelmu.",
      ],
    };
  }
  return {
    headline: "Ayo mulai petualangan belajarmu!",
    detail: "Kamu baru memulai. Tiap latihan, kuis, dan karya memberi XP untuk menaikkan level.",
    tips: [
      "Mulai dari Jalur Cerdas untuk memahami dasar bahasa Indonesia.",
      "Tulis karya pertamamu dan raih koin.",
      "Kembali setiap hari untuk membangun streak.",
    ],
  };
}
