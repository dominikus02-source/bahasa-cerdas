"use client";

import { useState } from "react";
import {
  Flame, Sparkles, Settings, Heart, UserPlus, UserCheck, PenLine,
} from "lucide-react";
import type { PlayerRank } from "@prisma/client";
import CosmicBackground from "@/components/profile/CosmicBackground";
import UserAvatar from "@/components/arena/UserAvatar";
import UserName from "@/components/arena/UserName";
import { RankIcon } from "@/components/gamification/RankIcon";
import { RANK_META, nextRankOf, minLevelForRank } from "@/lib/gamification/ranks";

export interface HeroPersona {
  id: string;
  displayName: string;
  fullName?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  equippedFrame?: string | null;
  equippedNameColor?: string | null;
  equippedBadge?: string | null;
  bio?: string | null;
  sekolah?: string | null;
  level: number;
  xp: number;
  levelProgress: { current: number; needed: number; pct: number; remaining: number };
  streak?: number | null;
  gelar?: string | null;
  memberNumber?: string | null;
}

export interface HeroSocial {
  followerCount: number;
  followingCount: number;
  profileLikeCount: number;
  isFollowing: boolean | null;
  isLiked: boolean | null;
  /** Pratinjau pengikut / yang diikuti (maks 6, untuk avatar stack). */
  followers?: { id: string; displayName: string; avatar: string | null }[];
  following?: { id: string; displayName: string; avatar: string | null }[];
}

/**
 * ProfileHero — PLAYER CARD (identitas + rank).
 *
 * Komposisi: AVATAR kiri ⟷ RANK CREST besar di kanan (desktop), stack
 * teratur di mobile (rank → avatar+nama → level/XP → aksi → statistik).
 * Mode "self" = Edit Profil; mode "peer" = Ikuti / Suka (optimistic, toggle
 * idempoten via API). Support reducer-motion di CosmicBackground.
 */
export default function ProfileHero({
  persona,
  rank,
  social,
  isOwn,
  extraChips,
  onEditProfile,
  onFollowToggle,
  onLikeToggle,
}: {
  persona: HeroPersona;
  rank: PlayerRank;
  social?: HeroSocial | null;
  isOwn: boolean;
  /** Chip tambahan (role, Founder, Pro, dst.) — dirender sebelum gelar. */
  extraChips?: React.ReactNode;
  onEditProfile?: () => void;
  onFollowToggle?: () => Promise<{ following: boolean } | null>;
  onLikeToggle?: () => Promise<{ liked: boolean } | null>;
}) {
  const [following, setFollowing] = useState<boolean | null>(social?.isFollowing ?? null);
  const [liked, setLiked] = useState<boolean | null>(social?.isLiked ?? null);
  const [busyFollow, setBusyFollow] = useState(false);
  const [busyLike, setBusyLike] = useState(false);

  // Bila sosial data datang belakangan (fetch async), sinkronkan state.
  const socialFollowerCount = social?.followerCount ?? 0;

  const meta = RANK_META[rank];
  const rankColor = meta?.color ?? "#94a3b8";
  const next = nextRankOf(rank);
  const nextMeta = next ? RANK_META[next] : null;

  const handleFollow = async () => {
    if (!onFollowToggle || busyFollow) return;
    setBusyFollow(true);
    // Optimistic UI.
    const prev = following;
    setFollowing(!following);
    try {
      const res = await onFollowToggle();
      if (res) setFollowing(res.following);
    } catch {
      setFollowing(prev);
    } finally {
      setBusyFollow(false);
    }
  };

  const handleLike = async () => {
    if (!onLikeToggle || busyLike) return;
    setBusyLike(true);
    const prev = liked;
    setLiked(!liked);
    try {
      const res = await onLikeToggle();
      if (res) setLiked(res.liked);
    } catch {
      setLiked(prev);
    } finally {
      setBusyLike(false);
    }
  };

  const initials = (persona.displayName || persona.fullName || "M")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <section
      aria-label="Identitas pemain"
      className="relative overflow-hidden rounded-[24px] text-white mb-6 shadow-2xl"
      style={{
        background: "linear-gradient(140deg, #0B1026 0%, #171241 45%, #2E1065 78%, #4C1D95 100%)",
      }}
    >
      <CosmicBackground />

      {/* Cahaya di belakang rank (aura lembut) */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "50%",
          right: "6%",
          transform: "translateY(-50%)",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rankColor}33 0%, ${rankColor}14 45%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* KIRI: avatar + identitas */}
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
            <div className="relative shrink-0">
              <UserAvatar
                size={96}
                avatar={persona.avatar}
                frame={persona.equippedFrame}
                initials={initials}
                gradient=""
                textClassName="text-3xl"
                className="bg-white/10 backdrop-blur border-4 border-white/20 shadow-lg ring-4"
              />
              {/* Level badge di pojok avatar */}
              <span
                aria-hidden
                className="absolute -bottom-1.5 -right-1.5 rounded-full px-2 py-0.5 text-[11px] font-black bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-md ring-2 ring-[#171241]"
              >
                {persona.level}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">
                Profil
              </p>
              <h1 className="text-2xl md:text-[26px] font-extrabold leading-tight truncate">
                <UserName
                  name={persona.displayName}
                  color={persona.equippedNameColor}
                  badge={persona.equippedBadge}
                  onDark
                  badgeSize={20}
                />
              </h1>
              {persona.nickname && persona.fullName && (
                <p className="text-sm text-white/60 truncate">{persona.fullName}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {extraChips}
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-white/10 border border-white/15 backdrop-blur">
                  <Sparkles size={11} className="text-amber-300" />
                  {meta?.title ?? rank}
                  <span className="text-white/50">·</span>
                  {meta?.label ?? rank}
                </span>
                {persona.gelar && (
                  <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-amber-400/15 border border-amber-300/25 text-amber-200">
                    {persona.gelar}
                  </span>
                )}
                {persona.streak != null && persona.streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-orange-400/15 border border-orange-300/25 text-orange-200">
                    <Flame size={11} /> {persona.streak}
                  </span>
                )}
                {persona.memberNumber && (
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold bg-white/5 border border-white/10 text-white/45">
                    #{persona.memberNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KANAN: rank crest BESAR (objek visual utama) */}
          <div className="shrink-0 flex flex-col items-center gap-1 self-center md:self-auto">
            <div
              aria-label={`Rank ${meta?.label} — ${meta?.title}`}
              role="img"
              className="bc-cosmic-crest relative"
              style={{ animation: "bc-cosmic-pulse 4s ease-in-out infinite" }}
            >
              <RankIcon rank={rank} size={168} glow className="drop-shadow-lg" priority />
            </div>
            <p className="mt-1 text-lg font-black tracking-wide uppercase" style={{ color: rankColor }}>
              {meta?.label}
            </p>
            <p className="text-[11px] font-semibold text-white/70">Level {persona.level} · {meta?.title}</p>
            {next && nextMeta && (
              <p className="text-[10px] text-white/40">
                {nextMeta.label} di Level {Math.max(persona.level + 1, minLevelForRank(next))}
              </p>
            )}
          </div>
        </div>

        {/* Level / XP progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-2.5 py-1">
              <Sparkles size={11} className="text-amber-300" /> Level {persona.level}
            </span>
            <span className="text-white/60">
              {persona.levelProgress.current.toLocaleString("id-ID")} / {persona.levelProgress.needed.toLocaleString("id-ID")} XP
            </span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(persona.levelProgress.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progres XP Level ${persona.level}`}>
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(2, persona.levelProgress.pct * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-white/45 mt-1.5">
            Tinggal {persona.levelProgress.remaining.toLocaleString("id-ID")} XP menuju Level {persona.level + 1}
          </p>
        </div>

        {/* AKSI */}
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          {isOwn && (
            <button
              onClick={onEditProfile}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold bg-white text-violet-950 hover:bg-violet-50 transition-all shadow-lg hover:shadow-xl"
            >
              <Settings size={16} /> Edit Profil
            </button>
          )}

          {!isOwn && social && (
            <>
              <button
                onClick={handleFollow}
                disabled={busyFollow || following === null}
                aria-pressed={!!following}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold transition-all shadow-lg disabled:opacity-60 ${
                  following
                    ? "bg-white/10 text-white border border-white/20 hover:bg-white/15"
                    : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-xl"
                }`}
              >
                {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                {following ? "Mengikuti" : "+ Ikuti"}
              </button>
              <button
                onClick={handleLike}
                disabled={busyLike || liked === null}
                aria-pressed={!!liked}
                aria-label={liked ? "Batal suka profil" : "Suka profil"}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all shadow-lg border disabled:opacity-60 ${
                  liked
                    ? "bg-rose-500/20 text-rose-200 border-rose-300/30"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                }`}
              >
                <Heart size={16} className={liked ? "fill-rose-400 text-rose-400" : ""} />
                {socialFollowerCount + (liked || social?.isLiked ? 0 : 0) >= 0 ? (liked ? "Disukai" : "Suka") : "Suka"}
              </button>
            </>
          )}

          {!isOwn && (
            <a
              href="#karya"
              className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold bg-white/10 border border-white/15 hover:bg-white/15 transition-all"
            >
              <PenLine size={16} /> Karya
            </a>
          )}
        </div>

        {/* Bio / tagline */}
        {persona.bio ? (
          <p className="mt-4 text-sm text-white/70 leading-relaxed max-w-2xl">{persona.bio}</p>
        ) : (
          isOwn && (
            <p className="mt-4 text-sm text-white/45 italic">
              Tambahkan sedikit tentang dirimu.{" "}
              <button onClick={onEditProfile} className="underline text-white/70 hover:text-white">
                Edit bio
              </button>
            </p>
          )
        )}
      </div>
    </section>
  );
}