"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight, Flame, Coins, Trophy, Zap, Gamepad2, Target,
  Medal, Play, Clock, Users, Sparkles, Crown, Loader2,
} from "lucide-react";
import type { PlayerRank } from "@prisma/client";
import {
  GAME_REGISTRY, featuredGame,
  type GameDefinition,
} from "@/lib/arena/game-registry";
import { RANK_META, RANK_BANDS, nextRankOf, rankFromLevel } from "@/lib/gamification/ranks";
import { levelFromXp, getLevelProgress } from "@/lib/gamification/levels";
import UserAvatar from "@/components/arena/UserAvatar";
import { RankChip } from "@/components/gamification/RankChip";
import { RankIcon } from "@/components/gamification/RankIcon";
import { nameColorStyle } from "@/lib/cosmetics";
import type { LeaderboardPeriod } from "@/lib/gamification/leaderboard";
import type { LeaderboardEntryView } from "@/lib/gamification/client-types";

// ─── Props ────────────────────────────────────────────────────────────
export interface ArenaHomepageProps {
  userId: string;
  fullName: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  streak: number;
  coins: number;
  equippedBackground: string | null;
  equippedFrame: string | null;
  equippedBadge: string | null;
  equippedNameColor: string | null;
  equippedNameplate: string | null;
  weeklyXp: number;
  seasonXp: number;
  isFounder: boolean;
}

// ─── Contextual hero copy ─────────────────────────────────────────────
function heroCopy(streak: number, xp: number, level: number, rank: string): { title: string; subtitle: string } {
  const lp = getLevelProgress(xp);
  if (streak >= 7) {
    return { title: `${streak} hari berturut-turut!`, subtitle: "Jangan biarkan streak-mu putus. Main hari ini!" };
  }
  if (streak >= 3) {
    return { title: `Streak ${streak} hari aktif`, subtitle: "Kamu sedang dalam jalur yang panas. Lanjutkan!" };
  }
  if (lp.remaining > 0 && lp.remaining <= 500) {
    return { title: `${lp.remaining} XP lagi ke Level ${level + 1}`, subtitle: "Hampir sampai. Satu game lagi bisa cukup!" };
  }
  const nr = nextRankOf(rank as PlayerRank);
  if (nr) {
    const nrMeta = RANK_META[nr];
    return { title: "Siap naik peringkat?", subtitle: `Terus belajar untuk mencapai ${nrMeta?.title ?? nr}.` };
  }
  return { title: "Arena sedang menunggumu", subtitle: "Pilih gim, kumpulkan XP, dan buktikan kemampuanmu." };
}

// ─── Section 1: Player Header ─────────────────────────────────────────
// TIER 1 — identity + progression. Compact but information-dense.
function PlayerHeader({ user, level, rank, xp }: {
  user: ArenaHomepageProps; level: number; rank: string; xp: number;
}) {
  const lp = getLevelProgress(xp);
  const rankMeta = RANK_META[rank as keyof typeof RANK_META];

  return (
    <section className="relative rounded-3xl bg-white dark:bg-[#16122A] border border-gray-100 dark:border-violet-500/15 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/arena/player" className="shrink-0 transition-transform hover:scale-105 active:scale-95">
          <UserAvatar
            name={user.fullName} avatar={user.avatar} frame={user.equippedFrame}
            size={56} gradient="from-violet-500 to-purple-600" textClassName="text-lg"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className="text-lg font-black truncate"
              style={nameColorStyle(user.equippedNameColor, false) ?? { color: '#1e293b' }}
            >
              {user.nickname || user.fullName}
            </h2>
            {user.streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                <Flame size={10} /> {user.streak}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <RankChip rank={rank} size={16} showTitle compact />
          </div>

          {/* XP bar — primary progression signal */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-gray-400 dark:text-slate-500">Level {level}</span>
              <span className="text-gray-400 dark:text-slate-500 tabular-nums">
                {lp.current.toLocaleString("id-ID")} / {lp.needed.toLocaleString("id-ID")} XP
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
                style={{ width: `${Math.max(2, lp.pct * 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
              {lp.remaining.toLocaleString("id-ID")} XP lagi ke Level {level + 1}
            </p>
          </div>
        </div>

        <Link
          href="/arena/toko-koin"
          className="shrink-0 flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 transition-all hover:scale-105 active:scale-95"
        >
          <Coins size={14} /> {user.coins.toLocaleString("id-ID")}
        </Link>
      </div>
    </section>
  );
}

// ─── Section 2: Hero ──────────────────────────────────────────────────
// TIER 1 — dominant CTA. The biggest, most colorful element on the page.
function ArenaHero({ streak, xp, level, rank, ctaHref }: {
  streak: number; xp: number; level: number; rank: string; ctaHref: string;
}) {
  const { title, subtitle } = heroCopy(streak, xp, level, rank);

  return (
    <section
      className="relative overflow-hidden rounded-3xl text-white shadow-lg"
      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4c1d95 100%)" }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-amber-300/15 blur-2xl" />

      <div className="relative z-10 p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200">
          Siap bermain?
        </p>
        <h2 className="mt-1.5 text-2xl sm:text-3xl font-black leading-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-violet-100 max-w-md">
          {subtitle}
        </p>
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97]"
        >
          <Play size={16} fill="currentColor" /> MAIN SEKARANG
        </Link>
      </div>
    </section>
  );
}

// ─── Section 3: Featured Game ─────────────────────────────────────────
// TIER 2 — desire & discovery. Visually distinct from generic cards.
function FeaturedGameSection({ game }: { game: GameDefinition }) {
  return (
    <section aria-label="Game unggulan">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-amber-500" />
        <h2 className="text-xs font-extrabold uppercase tracking-[1.5px] text-gray-400 dark:text-slate-500">
          Game Unggulan
        </h2>
      </div>
      <Link
        href={game.href}
        className="group relative block overflow-hidden rounded-3xl border border-gray-100 dark:border-violet-500/15 bg-white dark:bg-[#16122A] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
      >
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: game.accentColor }} />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Sparkles size={10} /> {game.badge?.text || "Unggulan"}
              </span>
              <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                {game.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 leading-relaxed max-w-lg">
                {game.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 text-violet-600 dark:text-violet-400">
                  <Zap size={11} /> {game.xp}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-1 text-gray-500 dark:text-slate-400">
                  <Clock size={11} /> {game.time}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-1 text-gray-500 dark:text-slate-400">
                  <Users size={11} /> {game.players}
                </span>
              </div>
            </div>
            <div className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
              <game.icon size={32} className="text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <span className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition-all group-hover:bg-violet-700 group-hover:gap-2.5 active:scale-95">
              <Play size={14} fill="currentColor" /> MAIN SEKARANG
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

// ─── Section 4: Leaderboard Preview ───────────────────────────────────
// TIER 2 — competition hook. Podium for top 3, personal position highlighted.
function LeaderboardPreview({
  entries, myRank, period, onPeriodChange, loading,
}: {
  entries: LeaderboardEntryView[];
  myRank: LeaderboardEntryView | null;
  period: LeaderboardPeriod;
  onPeriodChange: (p: LeaderboardPeriod) => void;
  loading: boolean;
}) {
  const top3 = entries.filter((e) => e.rank <= 3);
  const rest = entries.filter((e) => e.rank > 3);

  return (
    <section aria-label="Papan Juara">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" />
          <h2 className="text-xs font-extrabold uppercase tracking-[1.5px] text-gray-400 dark:text-slate-500">
            Papan Juara
          </h2>
        </div>
        <div className="flex gap-1">
          {(["WEEKLY", "ALL_TIME"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                period === p
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {p === "WEEKLY" ? "Mingguan" : "Semua"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && entries.length === 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#16122A] border border-gray-100 dark:border-violet-500/15 p-8 text-center">
          <Loader2 size={20} className="mx-auto animate-spin text-violet-400" />
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">Memuat peringkat...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#16122A] border border-gray-100 dark:border-violet-500/15 p-6 text-center">
          <Trophy size={24} className="mx-auto text-gray-300 dark:text-slate-600" />
          <p className="mt-2 text-sm text-gray-400 dark:text-slate-500">Belum ada data peringkat minggu ini.</p>
          <p className="mt-1 text-[11px] text-gray-300 dark:text-slate-600">Main game untuk mulai mengumpulkan XP!</p>
        </div>
      )}

      {/* Data loaded */}
      {!loading && entries.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#16122A] border border-gray-100 dark:border-violet-500/15 overflow-hidden">
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="p-4 pb-3">
              <div className="flex items-end justify-center gap-3 sm:gap-5">
                {top3.map((e) => {
                  const isFirst = e.rank === 1;
                  return (
                    <div key={e.userId} className="flex flex-col items-center">
                      <div className={`relative ${isFirst ? "mb-1" : ""}`}>
                        <UserAvatar
                          name={e.name} avatar={e.avatar}
                          size={isFirst ? 52 : 40}
                          gradient="from-violet-500 to-purple-600"
                          textClassName={isFirst ? "text-base" : "text-sm"}
                          className={isFirst ? "ring-2 ring-amber-400 shadow-lg shadow-amber-400/30" : ""}
                        />
                        {isFirst && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2">
                            <Crown size={18} className="text-amber-500" />
                          </span>
                        )}
                      </div>
                      <p className={`mt-1.5 text-[11px] font-bold text-gray-900 dark:text-white truncate max-w-[72px] ${isFirst ? "text-xs" : ""}`}>
                        {e.name.split(" ")[0]}
                      </p>
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                        {(e.score || 0).toLocaleString("id-ID")} XP
                      </p>
                      {isFirst && (
                        <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 dark:text-amber-400">
                          <Crown size={8} /> Juara
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="border-t border-gray-50 dark:border-white/5">
              {rest.slice(0, 5).map((e) => (
                <div
                  key={e.userId}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    e.isMe
                      ? "bg-violet-50 dark:bg-violet-500/10 border-l-2 border-l-violet-500"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <span className="w-6 text-center text-[11px] font-bold text-gray-400 dark:text-slate-500 tabular-nums">
                    {e.rank}
                  </span>
                  <UserAvatar name={e.name} avatar={e.avatar} size={28} gradient="from-gray-400 to-gray-500" textClassName="text-[10px]" />
                  <span className={`flex-1 text-[12px] font-semibold truncate ${e.isMe ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-slate-300"}`}>
                    {e.isMe ? `${e.name} (Kamu)` : e.name}
                  </span>
                  <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 tabular-nums">
                    {(e.score || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* My position — always visible if not in top 3 */}
          {myRank && myRank.rank > 3 && (
            <div className="border-t border-violet-100 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-[11px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  #{myRank.rank}
                </span>
                <UserAvatar name={myRank.name} avatar={myRank.avatar} size={28} gradient="from-violet-500 to-purple-600" textClassName="text-[10px]" />
                <span className="flex-1 text-[12px] font-bold text-violet-700 dark:text-violet-300 truncate">
                  {myRank.name} (Kamu)
                </span>
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  {(myRank.score || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-gray-50 dark:border-white/5">
            <Link
              href="/arena/player/leaderboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors"
            >
              Lihat Leaderboard Lengkap <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Section 5: Rank Journey ──────────────────────────────────────────
// TIER 3 — aspirational. Rank emblem with glow, progress, mini journey.
function RankJourneySection({ level, rank, xp }: { level: number; rank: string; xp: number }) {
  const currentRank = rank as keyof typeof RANK_META;
  const nextRank = nextRankOf(currentRank as PlayerRank);

  const band = RANK_BANDS.find((b) => b.rank === (currentRank as PlayerRank));
  const rankProgress = band
    ? Math.min(1, (level - band.min) / (band.max - band.min + 1))
    : 0;

  return (
    <section aria-label="Perjalanan Rank">
      <div className="flex items-center gap-2 mb-3">
        <Crown size={14} className="text-amber-500" />
        <h2 className="text-xs font-extrabold uppercase tracking-[1.5px] text-gray-400 dark:text-slate-500">
          Peringkatmu
        </h2>
      </div>
      <div className="rounded-2xl bg-white dark:bg-[#16122A] border border-gray-100 dark:border-violet-500/15 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <RankIcon rank={rank} size={56} glow />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Rank Saat Ini
            </p>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {RANK_META[currentRank]?.title ?? currentRank}
            </p>
            <p className="text-xs font-semibold" style={{ color: RANK_META[currentRank]?.color ?? "#64748b" }}>
              {RANK_META[currentRank]?.label ?? currentRank}
            </p>
          </div>
        </div>

        {/* Rank progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-gray-400 dark:text-slate-500">Progress ke rank berikutnya</span>
            <span className="text-gray-400 dark:text-slate-500">{Math.round(rankProgress * 100)}%</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(3, rankProgress * 100)}%`,
                background: RANK_META[currentRank]?.color ?? "#8b5cf6",
              }}
            />
          </div>
        </div>

        {/* Mini journey — 9 rank dots */}
        <div className="mt-4 flex items-center justify-between">
          {RANK_BANDS.map((b, i) => {
            const isActive = b.rank === (currentRank as PlayerRank);
            const currentIdx = RANK_BANDS.findIndex((x) => x.rank === (currentRank as PlayerRank));
            const isPast = currentIdx > i;
            return (
              <div key={b.rank} className="flex items-center">
                <div
                  className={`rounded-full transition-all ${
                    isActive
                      ? "w-3 h-3 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-[#16122A]"
                      : "w-2 h-2"
                  } ${isPast ? "opacity-60" : "opacity-30"}`}
                  style={{
                    background: RANK_META[b.rank]?.color ?? "#94a3b8",
                    ...(isActive ? { boxShadow: `0 0 8px ${RANK_META[b.rank]?.color ?? "#8b5cf6"}44` } : {}),
                  }}
                  title={RANK_META[b.rank]?.title}
                />
                {i < RANK_BANDS.length - 1 && (
                  <div className={`w-2 sm:w-4 h-0.5 ${isPast ? "bg-gray-300 dark:bg-slate-600" : "bg-gray-200 dark:bg-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {nextRank && (
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            <span className="font-semibold" style={{ color: RANK_META[nextRank]?.color }}>
              {RANK_META[nextRank]?.title}
            </span>{" "}
            — {((RANK_META[nextRank]?.minLevel ?? 1) - level)} Level lagi untuk naik
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Section 6: Coming Soon ───────────────────────────────────────────
// TIER 4 — discovery. Muted, clearly non-interactive.
function ComingSoonSection({ games }: { games: GameDefinition[] }) {
  if (games.length === 0) return null;
  return (
    <section aria-label="Segera hadir">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-gray-400" />
        <h2 className="text-xs font-extrabold uppercase tracking-[1.5px] text-gray-400 dark:text-slate-500">
          Segera Hadir
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {games.map((g) => (
          <div
            key={g.id}
            className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-violet-500/10 bg-gray-50 dark:bg-[#12101F] p-4 opacity-60 select-none"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gray-200 dark:bg-slate-700" />
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${g.gradient} opacity-50 flex items-center justify-center`}>
              <g.icon size={22} className="text-white" />
            </div>
            <p className="mt-3 text-sm font-bold text-gray-600 dark:text-slate-400">{g.title}</p>
            <span className="mt-2 inline-block rounded-full bg-gray-200 dark:bg-slate-800 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-500">
              Segera Hadir
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section 7: Quick Access ──────────────────────────────────────────
// TIER 4 — navigation. Compact, functional.
function QuickAccess() {
  const items = [
    { label: "Gim", desc: "Semua game", href: "/arena/game", icon: Gamepad2, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300" },
    { label: "Profil", desc: "XP & rank", href: "/arena/player", icon: Target, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300" },
    { label: "Badge", desc: "Pencapaian", href: "/arena/player/badges", icon: Medal, color: "text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300" },
    { label: "Misi", desc: "Tantangan", href: "/arena/misi", icon: Target, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
  ];

  return (
    <section aria-label="Navigasi cepat">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="group flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-violet-500/15 bg-white dark:bg-[#16122A] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>
              <q.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">{q.label}</span>
              <span className="block text-[11px] text-gray-400 dark:text-slate-500">{q.desc}</span>
            </span>
            <ChevronRight size={14} className="ml-auto shrink-0 text-gray-300 dark:text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────
export default function ArenaHomepage(props: ArenaHomepageProps) {
  const { xp, streak } = props;
  const level = levelFromXp(xp);
  const rank = rankFromLevel(level);

  const hero = featuredGame();

  // Leaderboard state
  const [period, setPeriod] = useState<LeaderboardPeriod>("WEEKLY");
  const [lbEntries, setLbEntries] = useState<LeaderboardEntryView[]>([]);
  const [myLbRank, setMyLbRank] = useState<LeaderboardEntryView | null>(null);
  const [lbLoading, setLbLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (p: LeaderboardPeriod) => {
    setLbLoading(true);
    try {
      const res = await fetch(`/api/player/leaderboard?scope=GLOBAL&period=${p}&limit=10`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const entries: LeaderboardEntryView[] = data.entries ?? [];
      setLbEntries(entries);
      setMyLbRank(entries.find((e: LeaderboardEntryView) => e.isMe) ?? null);
    } catch {
      // silent — loading state will persist
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period, fetchLeaderboard]);

  // Coming soon games (multiplayer that's disabled)
  const comingSoonGames = useMemo(
    () => GAME_REGISTRY.filter((g) => g.multiplayer && !g.soloSaatOffline).slice(0, 2),
    []
  );

  const isGuruPreview = props.isFounder === false && props.userId === "";

  return (
    <div className="arena-page mx-auto w-full max-w-[1280px] space-y-5 px-4 py-5 md:px-6">
      {/* 1. PLAYER HEADER — TIER 1 */}
      {!isGuruPreview && (
        <PlayerHeader user={props} level={level} rank={rank} xp={xp} />
      )}

      {/* 2. HERO — TIER 1 (dominant CTA) */}
      <ArenaHero streak={streak} xp={xp} level={level} rank={rank} ctaHref="/arena/game" />

      {/* 3. FEATURED GAME — TIER 2 */}
      <FeaturedGameSection game={hero} />

      {/* 4. LEADERBOARD — TIER 2 */}
      <LeaderboardPreview
        entries={lbEntries}
        myRank={myLbRank}
        period={period}
        onPeriodChange={setPeriod}
        loading={lbLoading}
      />

      {/* 5. RANK JOURNEY — TIER 3 */}
      <RankJourneySection level={level} rank={rank} xp={xp} />

      {/* 6. COMING SOON — TIER 4 */}
      <ComingSoonSection games={comingSoonGames} />

      {/* 7. QUICK ACCESS — TIER 4 */}
      <QuickAccess />
    </div>
  );
}
