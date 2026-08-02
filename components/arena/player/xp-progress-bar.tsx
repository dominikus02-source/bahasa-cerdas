"use client";

import { motion } from "framer-motion";
import { formatId } from "./ui";
import type { PlayerProfileView } from "@/lib/gamification/client-types";

/** XP progress bar animasi dengan shimmer + info level. */
export function XpProgressBar({
  profile,
  compact = false,
}: {
  profile: PlayerProfileView;
  compact?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, profile.levelProgress.pct ?? 0));

  return (
    <div className="w-full">
      {!compact && (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
          <span className="text-[var(--px-text-dim)]">
            Level {profile.level}
            <span className="ml-1.5 text-[var(--px-text-faint)]">{profile.rankLabel}</span>
          </span>
          <span className="text-[var(--px-text-dim)]">
            <span className="font-extrabold text-[var(--px-gold)]">{formatId(profile.levelProgress.current)}</span>
            <span className="mx-0.5 text-[var(--px-text-faint)]">/</span>
            {formatId(profile.levelProgress.needed)} XP
          </span>
        </div>
      )}

      <div className="px-xp-track">
        <motion.div
          className="px-xp-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>

      {!compact && (
        <div className="mt-1.5 text-[10px] font-medium text-[var(--px-text-faint)]">
          Sisa {formatId(profile.xpToNextLevel)} XP untuk naik level
        </div>
      )}
    </div>
  );
}
