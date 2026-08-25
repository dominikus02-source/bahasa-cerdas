"use client";

import { BarChart3, Sparkles } from "lucide-react";
import Link from "next/link";
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

/** Map skill to recommended learning action. */
const SKILL_CTA_MAP: Record<string, { href: string; label: string }> = {
  READING: { href: "/arena/jalur-cerdas", label: "Latih membaca" },
  WRITING: { href: "/arena/tulis", label: "Tulis karya" },
  LISTENING: { href: "/arena/jalur-cerdas", label: "Latih mendengarkan" },
  SPEAKING: { href: "/murid/tugasku", label: "Buka tugas praktik" },
  GRAMMAR: { href: "/arena/jalur-cerdas", label: "Latih tata bahasa" },
  VOCABULARY: { href: "/arena/game", label: "Main game kata" },
  LITERATURE: { href: "/arena/feed", label: "Lihat karya" },
};

/** Progress deskriptif dari Learner State; tidak membuat rekomendasi baru. */
export default function SkillRadar({
  skills = null,
  loading = false,
  failed = false,
  className = "",
  limit = 7,
  showRecommendation = false,
  isPremium = false,
}: {
  skills?: LearnerSkillState[] | null;
  loading?: boolean;
  failed?: boolean;
  className?: string;
  limit?: number;
  showRecommendation?: boolean;
  isPremium?: boolean;
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

  // Find the weakest skill for recommendation (lowest accuracy with sufficient evidence)
  const weakestSkill = list.find(
    (skill) => skill.attemptCount >= 3 && skill.accuracy !== null && skill.accuracy < 0.7
  );

  // Find the strongest skill for recognition
  const strongestSkill = list.find(
    (skill) => skill.attemptCount >= 3 && skill.accuracy !== null && skill.accuracy >= 0.7
  );

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
          const isFocus = weakestSkill?.skill === skill.skill;
          return (
            <div key={skill.skill}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={`font-medium ${isFocus ? "text-[var(--px-royal-2)]" : "text-[var(--px-text)]"}`}>
                  {label}
                  {isFocus && <span className="ml-1 text-[10px] text-[var(--px-gold)]">← Fokus</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[var(--px-text-faint)]">
                  <span>{trend}</span>
                  <span className="font-semibold text-[var(--px-text-dim)]">{accuracy === null ? "—" : `${accuracy}%`}</span>
                </span>
              </div>
              <div className="skill-progress-bar h-1.5 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isFocus ? "bg-gradient-to-r from-[var(--px-royal-2)] to-[var(--px-gold)]" : "bg-[var(--px-royal)]"
                  }`}
                  style={{ width: `${accuracy ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium: Show personalized recommendation */}
      {showRecommendation && isPremium && weakestSkill && (
        <div className="mt-4 pt-4 border-t border-[var(--px-border)]">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--px-gold)]" />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-[var(--px-royal-2)] uppercase tracking-[0.12em]">
                Fokus Latihanmu
              </p>
              <p className="text-xs text-[var(--px-text-dim)] mt-1">
                {weakestSkill.accuracy !== null && weakestSkill.accuracy < 0.5
                  ? `Kemampuan ${SKILL_LABELS[weakestSkill.skill]} perlu perhatian lebih. Latihan teratur akan membantu.`
                  : `Kemampuan ${SKILL_LABELS[weakestSkill.skill]} masih bisa berkembang. Coba latih bagian ini.`}
              </p>
              <Link
                href={SKILL_CTA_MAP[weakestSkill.skill]?.href || "/arena/jalur-cerdas"}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--px-royal-2)] hover:opacity-80"
              >
                {SKILL_CTA_MAP[weakestSkill.skill]?.label || "Mulai latihan"}
                <span className="text-[10px]">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Free: Show subtle Premium invitation */}
      {showRecommendation && !isPremium && weakestSkill && (
        <div className="mt-4 pt-4 border-t border-[var(--px-border)]">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--px-text-faint)]" />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-[var(--px-text-faint)] uppercase tracking-[0.12em]">
                Personalisasi
              </p>
              <p className="text-xs text-[var(--px-text-dim)] mt-1">
                Premium bisa membantu menentukan langkah belajar yang paling tepat untukmu.
              </p>
              <Link
                href="/murid/premium"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--px-text-faint)] hover:opacity-80"
              >
                Pelajari Premium
                <span className="text-[10px]">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
