"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Coins, Flame, Shield, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import type { PlayerRank } from "@prisma/client";
import { RankIcon } from "@/components/gamification/RankIcon";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { RANK_META } from "@/lib/gamification/ranks";
import type { BadgeView } from "@/lib/gamification/client-types";

/**
 * PlayerStatusBar — HUD statistik pemain (Level/XP/Koin/Streak/Rank) plus
 * strip lencana mini. Data nyata dari parent; tanpa angka rekayasa.
 */
export default function PlayerStatusBar({
  level,
  xp,
  coins,
  streak,
  rank,
  badges,
  totalUnlocked,
  badgesHref,
}: {
  level: number;
  xp: number;
  coins: number;
  streak: number | null;
  rank: PlayerRank;
  /** Lencana milik pemain (unlocked) — maks 5 dirender. */
  badges: BadgeView[];
  totalUnlocked: number;
  badgesHref: string;
}) {
  const meta = RANK_META[rank];
  const mini = useMemo(() => badges.slice(0, 5), [badges]);
  const extra = Math.max(0, totalUnlocked - mini.length);

  // Warna rank SILVER/GOLD/DIAMOND sangat terang (dirancang untuk kartu navy);
  // di light mode diberi filter gelap — pola sama dengan label crest ProfileHero.
  const { resolvedTheme } = useTheme();
  const rankLabelFilter = resolvedTheme === "dark" ? undefined : "brightness(0.6)";

  const cell =
    "flex items-center gap-2.5 px-4 py-3.5 min-w-0";

  return (
    <div
      aria-label="Status pemain"
      className="bc-card-premium mb-6 rounded-2xl shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 overflow-hidden"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-900/[0.07] dark:divide-white/[0.07]">
        <div className={cell}>
          <Shield size={17} className="text-violet-600 dark:text-violet-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-white/45">Level</p>
            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums leading-tight">{level}</p>
          </div>
        </div>

        <div className={cell}>
          <Sparkles size={17} className="text-amber-600 dark:text-amber-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-white/45">XP</p>
            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums leading-tight truncate">
              {xp.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className={cell}>
          <Coins size={17} className="text-yellow-600 dark:text-yellow-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-white/45">Koin</p>
            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums leading-tight truncate">
              {coins.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className={cell}>
          <Flame size={17} className={streak ? "text-orange-600 dark:text-orange-400" : "text-slate-900/30 dark:text-white/30"} shrink-0 />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-white/45">Streak</p>
            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums leading-tight">{streak ?? 0}</p>
          </div>
        </div>

        <div className={`${cell} items-center`}>
          <div className="shrink-0">
            <RankIcon rank={rank} size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-white/45 truncate">
              Rank
            </p>
            <p className="text-base font-black leading-tight truncate" style={{ color: meta?.color ?? "#94a3b8", filter: rankLabelFilter }}>
              {meta?.label ?? rank}
            </p>
          </div>
        </div>

        <Link
          href={badgesHref}
          className={`${cell} col-span-2 lg:col-span-1 items-center hover:bg-slate-900/[0.06] dark:bg-white/[0.06] transition-colors`}
          aria-label={`Lencana terbuka ${totalUnlocked}`}
        >
          <Trophy size={17} className="text-emerald-600 dark:text-emerald-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-white/45">Lencana</p>
            <div className="flex items-center gap-1.5">
              {mini.length > 0 ? (
                mini.map((b) => (
                  <span key={b.id} title={b.name} className="inline-flex">
                    <BadgeIcon icon={b.icon} size={20} />
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-700 dark:text-white/40">Belum ada</span>
              )}
              {extra > 0 && (
                <span
                  aria-hidden
                  className="rounded-full bg-slate-900/5 dark:bg-slate-900/10 border-slate-900/10 dark:border-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-800 dark:text-white/70 tabular-nums"
                >
                  +{extra}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}