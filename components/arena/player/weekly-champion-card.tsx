"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { GlassCard, formatId } from "./ui";
import { getWeeklyChallenge } from "@/lib/weekly-challenge";
import type { PlayerProfileView } from "@/lib/gamification/client-types";

const WEEKLY_XP_TARGET = 500;

/** Tantangan mingguan — target XP + bonus menulis karya tantangan. */
export function WeeklyChampionCard({ profile }: { profile: PlayerProfileView }) {
  const challenge = getWeeklyChallenge();
  const pct = Math.min(100, Math.round((profile.weeklyXp / WEEKLY_XP_TARGET) * 100));

  return (
    <GlassCard className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
          <Crown size={16} className="text-[var(--px-gold)]" />
          Tantangan Mingguan
        </h3>
        <span className="px-chip">{profile.weeklyLabel}</span>
      </div>

      <div className="mb-3 rounded-xl border border-[var(--px-gold)]/25 bg-gradient-to-br from-[var(--px-gold)]/15 to-transparent p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--px-gold)]">Tantangan Menulis</p>
        <p className="mt-1 text-sm font-extrabold text-[var(--px-text)]">{challenge.theme}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--px-text-dim)]">{challenge.prompt}</p>
        <p className="mt-2 inline-flex rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold text-[var(--px-gold)]">
          +{challenge.bonusCoins} koin untuk karya pertama
        </p>
      </div>

      <div className="flex items-center justify-between text-xs font-semibold text-[var(--px-text-dim)]">
        <span>Target XP mingguan</span>
        <span>
          <span className="font-extrabold text-[var(--px-gold)]">{formatId(profile.weeklyXp)}</span>
          <span className="mx-0.5">/</span>
          {formatId(WEEKLY_XP_TARGET)}
        </span>
      </div>
      <div className="px-xp-track mt-1.5 h-2">
        <motion.div
          className="px-xp-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.1 }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--px-text-faint)]">
        {pct >= 100 ? "Target tercapai! Lanjutkan kehebatanmu 🎉" : `Sisa ${formatId(Math.max(0, WEEKLY_XP_TARGET - profile.weeklyXp))} XP menuju target.`}
      </p>
    </GlassCard>
  );
}
