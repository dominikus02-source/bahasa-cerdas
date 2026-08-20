"use client";

import { motion } from "framer-motion";
import { Flame, Coins, Sparkles } from "lucide-react";
import { formatId, InitialAvatar, RankIcon } from "./ui";
import { XpProgressBar } from "./xp-progress-bar";
import { nameColorStyle, getBadgeStyle } from "@/lib/cosmetics";
import type { PlayerProfileView } from "@/lib/gamification/client-types";

/** Header profil pemain — avatar, nama, rank, level, XP, koin, streak. */
export function PlayerHeader({
  name,
  profile,
  loading = false,
}: {
  name: string;
  profile: PlayerProfileView | null;
  loading?: boolean;
}) {
  if (loading || !profile) return <PlayerHeaderSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-card px-5 py-4"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {profile.avatar ? (
            <img src={profile.avatar} alt={name} className="h-16 w-16 rounded-2xl border-2 border-white/25 object-cover" />
          ) : (
            <InitialAvatar name={name} size={64} className="rounded-2xl" />
          )}
          <div className="absolute -bottom-2 -right-2">
            <RankIcon rank={profile.rank} size={34} ring />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-extrabold text-[var(--px-text)]" style={nameColorStyle(profile.equippedNameColor, true)}>{name}</h2>
            {profile.equippedBadge && (() => { const badge = getBadgeStyle(profile.equippedBadge); return badge ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                <badge.Icon size={11} />
                {badge.label}
              </span>
            ) : null; })()}
            {profile.title && (
              <span className="px-chip shrink-0">
                <Sparkles size={12} className="text-[var(--px-gold)]" />
                {profile.title}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold" style={{ color: profile.rankColor }}>
            {profile.rankLabel} · {profile.rankTitle} · Tingkat {profile.level}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="px-chip">
              <Coins size={13} className="text-[var(--px-gold)]" />
              <span className="text-[var(--px-gold)]">{formatId(profile.coin)}</span>
            </span>
            <span className="px-chip">
              <Flame size={13} className="px-flame text-orange-500 dark:text-orange-400" />
              <span className="text-orange-600 dark:text-orange-300">{profile.streak} hari</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <XpProgressBar profile={profile} />
      </div>
    </motion.div>
  );
}

export function PlayerHeaderSkeleton() {
  return (
    <div className="px-card px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="px-skeleton h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="px-skeleton h-4 w-1/3 rounded-lg" />
          <div className="px-skeleton h-3 w-1/4 rounded-lg" />
          <div className="flex gap-2">
            <div className="px-skeleton h-6 w-16 rounded-full" />
            <div className="px-skeleton h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="px-skeleton h-3 w-2/3 rounded-lg" />
        <div className="px-skeleton h-3 rounded-full" />
      </div>
    </div>
  );
}
