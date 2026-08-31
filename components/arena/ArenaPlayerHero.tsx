import Link from "next/link";
import { Coins, Flame, Play, Sparkles, Zap } from "lucide-react";
import type { PlayerRank } from "@prisma/client";
import UserAvatar from "@/components/arena/UserAvatar";
import { RankIcon } from "@/components/gamification/RankIcon";
import { RankChip } from "@/components/gamification/RankChip";
import { nameColorStyle } from "@/lib/cosmetics";
import { getLevelProgress } from "@/lib/gamification/levels";
import { RANK_META, nextRankOf } from "@/lib/gamification/ranks";

type Props = { fullName: string; nickname: string | null; avatar: string | null; xp: number; level: number; rank: PlayerRank; streak: number; coins: number; equippedFrame: string | null; equippedNameColor: string | null; gameHref: string; gameName: string };

function motivation(streak: number, xp: number, level: number, rank: PlayerRank) {
  const progress = getLevelProgress(xp);
  const nextRank = nextRankOf(rank);
  if (streak > 0) return { title: `${streak} hari berturut-turut!`, body: "Jangan biarkan streak-mu putus. Satu permainan hari ini sudah berarti." };
  if (nextRank) return { title: `Menuju ${RANK_META[nextRank].title}`, body: `Naik ke Level ${RANK_META[nextRank].minLevel} untuk membuka rank berikutnya.` };
  if (progress.remaining > 0) return { title: `${progress.remaining.toLocaleString("id-ID")} XP lagi`, body: `Sedikit lagi menuju Level ${level + 1}.` };
  return { title: "Kamu sudah di puncak", body: "Pertahankan posisimu dan kuasai papan juara." };
}

export default function ArenaPlayerHero(props: Props) {
  const progress = getLevelProgress(props.xp);
  const copy = motivation(props.streak, props.xp, props.level, props.rank);
  const displayName = props.nickname || props.fullName;
  const rankMeta = RANK_META[props.rank];
  const progressLabel = progress.needed > 0 ? `${progress.current.toLocaleString("id-ID")} / ${progress.needed.toLocaleString("id-ID")} XP` : "Level maksimum";
  return <section className="arena-player-hero relative overflow-hidden rounded-[32px] text-white shadow-[0_24px_70px_rgba(76,29,149,0.28)]">
    <div className="arena-player-hero-orb arena-player-hero-orb-one" /><div className="arena-player-hero-orb arena-player-hero-orb-two" />
    <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-center lg:p-10">
      <div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-violet-200"><Sparkles size={13} /> Player headquarters</p>
        <div className="mt-5 flex items-center gap-4 sm:gap-5"><Link href="/arena/player" aria-label="Buka profil pemain" className="shrink-0 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"><UserAvatar name={props.fullName} avatar={props.avatar} frame={props.equippedFrame} size={76} gradient="from-violet-300 to-fuchsia-500" textClassName="text-2xl" className="ring-4 ring-white/20 shadow-xl" /></Link><div className="min-w-0"><h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl" style={nameColorStyle(props.equippedNameColor, true) ?? undefined}>{displayName}</h1><div className="mt-2 flex flex-wrap items-center gap-2"><RankChip rank={props.rank} size={16} /><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-violet-100">Level {props.level}</span></div></div></div>
        <div className="mt-6 max-w-xl rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-sm"><div className="flex items-end justify-between gap-3 text-xs font-bold"><span className="text-violet-100">Progress Level {props.level}</span><span className="tabular-nums text-white">{progressLabel}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-white transition-[width] duration-700" style={{ width: `${progress.needed ? Math.round(progress.pct * 100) : 100}%` }} /></div><p className="mt-3 text-sm font-semibold text-violet-100">{copy.title}</p><p className="mt-1 text-xs leading-relaxed text-violet-200">{copy.body}</p></div>
        <div className="mt-5 flex flex-wrap gap-2.5"><span className="inline-flex items-center gap-2 rounded-xl border border-orange-200/20 bg-orange-400/15 px-3 py-2 text-xs font-bold text-orange-100"><Flame size={15} className="text-orange-300" /> {props.streak} hari streak</span><Link href="/arena/toko-koin" className="inline-flex items-center gap-2 rounded-xl border border-amber-200/20 bg-amber-300/15 px-3 py-2 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-300/25"><Coins size={15} className="text-amber-300" /> {props.coins.toLocaleString("id-ID")} koin</Link></div>
        <Link href={props.gameHref} className="arena-play-cta mt-7 inline-flex min-h-13 w-full max-w-[320px] items-center justify-center gap-3 rounded-2xl bg-white px-7 py-3.5 text-[15px] font-black text-violet-800 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(250,204,21,.22),0_0_0_1px_rgba(250,204,21,.35)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto sm:max-w-none sm:justify-start"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition-colors group-hover:bg-violet-200"><Play size={17} fill="currentColor" /></span><span>Mulai Bermain</span></Link>
      </div>
      <div className="arena-rank-art relative mx-auto flex w-full max-w-[220px] flex-col items-center justify-center rounded-[28px] border border-white/15 bg-white/[0.09] p-6 text-center backdrop-blur-sm lg:min-h-[290px]"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Rank saat ini</span><div className="mt-4 rounded-full bg-white/10 p-4 shadow-[0_0_45px_rgba(250,204,21,0.25)]"><RankIcon rank={props.rank} size={98} glow /></div><p className="mt-4 text-xl font-black">{rankMeta.title}</p><p className="text-sm font-bold" style={{ color: rankMeta.color }}>{rankMeta.label}</p><span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-violet-100"><Zap size={12} className="text-amber-300" /> {props.xp.toLocaleString("id-ID")} XP total</span></div>
    </div>
  </section>;
}
