"use client";

import { BarChart3 } from "lucide-react";
import type { LearnerSkillState } from "@/lib/learner-state/types";

const TREND_LABELS: Record<LearnerSkillState["trend"], string> = {
  IMPROVING: "Meningkat",
  STABLE: "Stabil",
  DECLINING: "Perlu perhatian",
  INSUFFICIENT_DATA: "Belum cukup data",
};

const SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

/** Progress deskriptif dari Learner State; tidak membuat rekomendasi baru. */
export default function SkillRadar({
  skills = null,
  loading = false,
  failed = false,
  className = "",
  limit = 7,
}: {
  skills?: LearnerSkillState[] | null;
  loading?: boolean;
  failed?: boolean;
  className?: string;
  limit?: number;
}) {
  if (failed) {
    return (
      <div className={`px-card p-5 text-center ${className}`}>
        <BarChart3 size={28} className="mx-auto text-violet-300" />
        <p className="mt-2 text-sm font-bold text-[var(--px-text)]">Belum bisa memuat perkembanganmu.</p>
        <p className="mt-1 text-xs text-[var(--px-text-dim)]">Coba lagi setelah data belajar tersedia.</p>
      </div>
    );
  }

  if (loading || !skills) {
    return (
      <div className={`animate-pulse rounded-2xl bg-white/60 dark:bg-slate-800/70 p-5 ${className}`}>
        <div className="mb-4 h-4 w-40 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-2 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const list = skills.slice(0, Math.max(1, limit));
  const hasEvidence = list.some((skill) => skill.attemptCount > 0);

  if (!hasEvidence) {
    return (
      <div className={`px-card p-5 text-center ${className}`}>
        <BarChart3 size={28} className="mx-auto text-violet-300" />
        <p className="mt-2 text-sm font-bold text-[var(--px-text)]">Kemampuan Bahasamu</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--px-text-dim)]">
          Mulai beberapa latihan dulu. Setelah kami mengenal pola belajarmu, perkembanganmu akan terlihat di sini.
        </p>
      </div>
    );
  }

  return (
    <div className={`skill-radar px-card p-5 md:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 size={18} className="text-[var(--px-royal)]" strokeWidth={1.8} />
        <h3 className="text-lg font-semibold tracking-tight text-[var(--px-text)]">Kemampuanmu</h3>
      </div>

      <div className="space-y-3">
        {list.map((skill) => {
          const accuracy = skill.accuracy === null ? null : Math.round(skill.accuracy * 100);
          const label = SKILL_LABELS[skill.skill] ?? skill.label;
          const trend = TREND_LABELS[skill.trend];
          return (
            <div key={skill.skill}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[var(--px-text)]">{label}</span>
                <span className="flex shrink-0 items-center gap-2 text-[var(--px-text-faint)]">
                  <span>{trend}</span>
                  <span className="font-semibold text-[var(--px-text-dim)]">{accuracy === null ? "—" : `${accuracy}%`}</span>
                </span>
              </div>
              <div className="skill-progress-bar h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-[var(--px-royal)] transition-all duration-500"
                  style={{ width: `${accuracy ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
