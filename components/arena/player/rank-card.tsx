"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { GlassCard, RankIcon, formatId } from "./ui";
import type { PlayerProfileView } from "@/lib/gamification/client-types";

/** Kartu rank — rank saat ini + title + progres ke rank berikutnya. */
export function RankCard({ profile }: { profile: PlayerProfileView }) {
  const nextLevel = Math.min(100, profile.level + 1);
  const nextRank = profile.rankTitle;

  return (
    <GlassCard pressable className="p-4">
      <div className="flex items-center gap-3">
        <RankIcon rank={profile.rank} size={52} ring />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--px-text-faint)]">Pangkat</p>
          <p className="text-lg font-extrabold leading-tight" style={{ color: profile.rankColor }}>
            {profile.rankLabel}
          </p>
          <p className="text-[11px] font-semibold text-[var(--px-text-dim)]">
            {profile.rankTitle} · Level {profile.level} · {formatId(profile.totalXp)} total XP
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-[var(--px-text-faint)]" />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[var(--px-text-dim)]">
        <span>
          Rank berikutnya: <span className="text-[var(--px-text)]">{nextRank}</span>
        </span>
        <span>Level {nextLevel}</span>
      </div>
      <div className="px-xp-track mt-1.5 h-2">
        <motion.div
          className="px-xp-fill"
          initial={{ width: 0 }}
          animate={{ width: `${profile.levelProgress.pct}%` }}
          transition={{ duration: 0.8, delay: 0.15 }}
        />
      </div>
    </GlassCard>
  );
}
