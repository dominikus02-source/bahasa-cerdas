import type { PlayerRank } from "@prisma/client";
import Link from "next/link";
import { Coins, Gamepad2, User } from "lucide-react";
import { GAME_REGISTRY, featuredGame } from "@/lib/arena/game-registry";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import ArenaPlayerHero from "@/components/arena/ArenaPlayerHero";
import ArenaGameHub from "@/components/arena/ArenaGameHub";
import ArenaLeaderboard from "@/components/arena/ArenaLeaderboard";
import ArenaRankProgress from "@/components/arena/ArenaRankProgress";
import ArenaDailyTargets from "@/components/arena/ArenaDailyTargets";
import ArenaComingSoon from "@/components/arena/ArenaComingSoon";

type Quest = {
  id: string;
  questType: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardCoins: number;
};

export interface ArenaHomepageProps {
  fullName: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  streak: number;
  coins: number;
  equippedFrame: string | null;
  equippedNameColor: string | null;
  quests: Quest[];
}

/**
 * Player HQ — server component that composes real data into
 * play → compete → progress → discover experience.
 *
 * Game registry filtering is done at module scope (static data).
 * Level/rank are pure computations from XP. No client state needed.
 */
export default function ArenaHomepage(props: ArenaHomepageProps) {
  const level = levelFromXp(props.xp);
  const rank = rankFromLevel(level) as PlayerRank;
  const featured = featuredGame();
  const liveGames = GAME_REGISTRY.filter(
    (game) =>
      !game.unpublished &&
      game.id !== featured.id &&
      (!game.multiplayer || Boolean(game.soloSaatOffline)),
  ).slice(0, 6);
  const comingSoonGames = GAME_REGISTRY.filter(
    (game) => game.multiplayer && !game.soloSaatOffline,
  );

  return (
    <div className="arena-page arena-hq mx-auto w-full max-w-[1280px] space-y-10 px-4 py-5 md:px-6 md:py-7">
      <ArenaPlayerHero
        {...props}
        level={level}
        rank={rank}
        gameHref={featured.href}
        gameName={featured.title}
      />
      <section aria-label="Akses Arena" className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Link
          href="/main-bersama/join"
          className="group relative min-w-0 overflow-hidden rounded-[24px] border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-[0_10px_28px_rgba(124,58,237,.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(124,58,237,.14)] dark:border-violet-400/15 dark:from-violet-950/45 dark:via-slate-950 dark:to-fuchsia-950/35"
        >
          <span aria-hidden className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-violet-300/25 blur-2xl dark:bg-violet-500/15" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 ring-4 ring-white/70 dark:ring-violet-950/50">
              <Gamepad2 size={21} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-600 dark:text-violet-300">Bermain</span>
              <span className="mt-0.5 block text-[15px] font-extrabold text-slate-950 dark:text-white">Main Bersama</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">Bermain bersama teman.</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-violet-600 shadow-sm ring-1 ring-violet-100 transition-transform group-hover:translate-x-0.5 dark:bg-white/10 dark:ring-white/10">
              <span className="text-lg leading-none">›</span>
            </span>
          </div>
        </Link>

        <Link
          href="/arena/toko-koin"
          className="group relative min-w-0 overflow-hidden rounded-[24px] border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-[0_10px_28px_rgba(245,158,11,.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(245,158,11,.14)] dark:border-amber-400/15 dark:from-amber-950/35 dark:via-slate-950 dark:to-orange-950/30"
        >
          <span aria-hidden className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-amber-300/25 blur-2xl dark:bg-amber-500/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 ring-4 ring-white/70 dark:ring-amber-950/50">
              <Coins size={21} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600 dark:text-amber-300">Hadiah</span>
              <span className="mt-0.5 block text-[15px] font-extrabold text-slate-950 dark:text-white">Toko Koin</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">Tukarkan koinmu dengan item.</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-amber-600 shadow-sm ring-1 ring-amber-100 transition-transform group-hover:translate-x-0.5 dark:bg-white/10 dark:ring-white/10">
              <span className="text-lg leading-none">›</span>
            </span>
          </div>
        </Link>

        <Link
          href="/arena/player"
          className="group relative min-w-0 overflow-hidden rounded-[24px] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-violet-50/60 p-4 shadow-[0_10px_28px_rgba(71,85,105,.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_16px_34px_rgba(124,58,237,.10)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30"
        >
          <span aria-hidden className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-700 to-violet-600 text-white shadow-lg shadow-violet-500/15 ring-4 ring-white/80 dark:ring-slate-900">
              <User size={21} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">Akun</span>
              <span className="mt-0.5 block text-[15px] font-extrabold text-slate-950 dark:text-white">Profil</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">Lihat profil pemain.</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:translate-x-0.5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              <span className="text-lg leading-none">›</span>
            </span>
          </div>
        </Link>
      </section>
      <ArenaGameHub featured={featured} games={liveGames} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <ArenaLeaderboard />
        <div className="space-y-5">
          <ArenaRankProgress level={level} rank={rank} />
          <ArenaDailyTargets quests={props.quests} streak={props.streak} />
        </div>
      </div>
      <ArenaComingSoon games={comingSoonGames} />
    </div>
  );
}
