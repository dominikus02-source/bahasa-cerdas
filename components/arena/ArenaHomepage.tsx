import type { PlayerRank } from "@prisma/client";
import Link from "next/link";
import { Gamepad2, User } from "lucide-react";
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
      <section aria-label="Akses Arena" className="grid grid-cols-2 gap-3">
        <Link href="/main-bersama/join" className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 transition-colors hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"><Gamepad2 size={19} /></span>
          <span><span className="block text-sm font-extrabold text-slate-900 dark:text-white">Main Bersama</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">Bermain bersama teman.</span></span>
        </Link>
        <Link href="/arena/player" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-violet-200 hover:bg-violet-50/50 dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><User size={19} /></span>
          <span><span className="block text-sm font-extrabold text-slate-900 dark:text-white">Profil</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">Lihat profil pemain.</span></span>
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
