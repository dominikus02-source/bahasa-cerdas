import type { PlayerRank } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, Coins, Gamepad2, User } from "lucide-react";
import { GAME_REGISTRY, featuredGame } from "@/lib/arena/game-registry";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import ArenaPlayerHero from "@/components/arena/ArenaPlayerHero";
import ArenaGameHub from "@/components/arena/ArenaGameHub";
import ArenaLeaderboard from "@/components/arena/ArenaLeaderboard";
import ArenaRankProgress from "@/components/arena/ArenaRankProgress";
import ArenaDailyTargets from "@/components/arena/ArenaDailyTargets";
import ArenaComingSoon from "@/components/arena/ArenaComingSoon";

const arenaShortcuts = [
  {
    href: "/main-bersama/join",
    title: "Main Bersama",
    description: "Gabung ruang dan seru-seruan bareng teman.",
    action: "Gabung permainan",
    icon: Gamepad2,
    color: "from-violet-600 to-fuchsia-700 text-white border-violet-400/40 shadow-violet-500/20 focus-visible:ring-violet-500",
    iconColor: "bg-white/20 text-white",
    actionColor: "bg-white/15 text-white",
  },
  {
    href: "/arena/toko-koin",
    title: "Toko Koin",
    description: "Tukar koinmu dengan item favorit.",
    action: "Jelajahi toko",
    icon: Coins,
    color: "from-amber-300 to-orange-400 text-amber-950 border-amber-200/60 shadow-amber-500/20 focus-visible:ring-amber-500",
    iconColor: "bg-white/40 text-amber-950",
    actionColor: "bg-white/30 text-amber-950",
  },
  {
    href: "/arena/player",
    title: "Profil",
    description: "Lihat pencapaian, level, dan peringkatmu.",
    action: "Lihat profil",
    icon: User,
    color: "from-sky-600 to-indigo-700 text-white border-sky-400/40 shadow-sky-500/20 focus-visible:ring-sky-500",
    iconColor: "bg-white/20 text-white",
    actionColor: "bg-white/15 text-white",
  },
];

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
  badgeKind?: import("@/lib/account/identity").IdentityBadge | null;
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
      <section aria-label="Akses Arena" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {arenaShortcuts.map(({ href, title, description, action, icon: Icon, color, iconColor, actionColor }) => (
          <Link
            key={href}
            href={href}
            className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 motion-safe:transition-[transform,box-shadow] motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.98] ${color}`}
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <span className="relative flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3 lg:flex-row lg:items-center">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/20 ${iconColor}`}>
                <Icon size={28} strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-black tracking-tight">{title}</span>
                <span className="mt-1 block text-sm font-medium leading-relaxed">{description}</span>
              </span>
            </span>
            <span className={`relative mt-5 flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-extrabold ${actionColor}`}>
              {action}
              <ArrowRight size={18} aria-hidden="true" className="shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
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
