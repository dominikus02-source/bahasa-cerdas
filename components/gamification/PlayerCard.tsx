"use client";

import { motion } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import type { PlayerProfileView } from "@/lib/gamification/client-types";
import { RankIcon } from "@/components/gamification/RankIcon";
import { RANK_META } from "@/lib/gamification/ranks";
import { formatId } from "@/components/arena/player/ui";

/**
 * PlayerCard — Kartu Pemain resmi BahasaCerdas.
 * Avatar, Rank Icon, Rank Name, Title, Level, XP, Progress Bar, Koin,
 * Badge & Achievement. Dipakai di dashboard, profile, dsb.
 */
export function PlayerCard({
  profile,
  badges,
  achievements,
}: {
  profile: PlayerProfileView;
  badges?: { total: number; unlocked: number };
  achievements?: { total: number; completed: number };
}) {
  const meta = RANK_META[profile.rank as keyof typeof RANK_META] ?? RANK_META.BRONZE;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0e1735] to-[#0b132b] p-5 shadow-xl">
      {/* glow ornamen */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
        style={{ background: meta.color }}
      />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-[var(--px-gold)]/10 blur-2xl" />

      <div className="relative flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--px-royal)] to-purple-500 text-2xl font-black text-white">
              ?
            </div>
          )}
          <span className="absolute -bottom-1 -right-1">
            <RankIcon rank={profile.rank} size={28} glow />
          </span>
        </div>

        {/* Rank Name + Title + Level */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <p className="truncate text-xl font-black text-white">
            {meta.title}
            <span className="ml-1.5 text-sm font-bold text-white/50">Tingkat {profile.level}</span>
          </p>
          <p className="mt-0.5 text-xs font-semibold text-white/60">{formatId(profile.totalXp)} XP total</p>
        </div>

        {/* Koin */}
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--px-gold)]/15 px-3 py-1.5">
          <Coins size={14} className="text-[var(--px-gold)]" />
          <span className="text-sm font-black text-[var(--px-gold)]">{formatId(profile.coin)}</span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="relative mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-white/60">
          <span className="flex items-center gap-1">
            <Sparkles size={11} className="text-[var(--px-gold)]" />
            {formatId(profile.levelProgress.current)} / {formatId(profile.levelProgress.needed)} XP
          </span>
          <span>{formatId(profile.levelProgress.remaining)} XP menuju Tingkat {profile.level + 1}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10 dark:bg-slate-900/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${meta.color}, var(--px-gold))` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, profile.levelProgress.pct * 100)}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      {/* Badge & Achievement ringkas */}
      {(badges || achievements) && (
        <div className="relative mt-4 flex items-center gap-2 text-[11px] font-bold text-white/70">
          {badges && (
            <span className="rounded-full bg-white/5 dark:bg-slate-900/5 px-2.5 py-1">
              🎖️ {badges.unlocked}/{badges.total} Badge
            </span>
          )}
          {achievements && (
            <span className="rounded-full bg-white/5 dark:bg-slate-900/5 px-2.5 py-1">
              🏆 {achievements.completed}/{achievements.total} Pencapaian
            </span>
          )}
        </div>
      )}
    </div>
  );
}
