"use client";

import { useEffect, useRef, useState } from "react";

import {
  Flame, Sparkles, Settings, Heart, UserPlus, UserCheck, PenLine, Files,
  Users, UserRound, CalendarDays,
} from "lucide-react";
import type { PlayerRank } from "@prisma/client";
import CosmicBackground from "@/components/profile/CosmicBackground";
import UserAvatar from "@/components/arena/UserAvatar";
import UserName from "@/components/arena/UserName";
import { RankIcon } from "@/components/gamification/RankIcon";
import { RANK_META, nextRankOf, minLevelForRank } from "@/lib/gamification/ranks";
import { getNameplateStyle, getBackgroundStyle } from "@/lib/cosmetics";

export interface HeroPersona {
  id: string;
  displayName: string;
  fullName?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  equippedFrame?: string | null;
  equippedNameColor?: string | null;
  equippedBadge?: string | null;
  equippedNameplate?: string | null;
  equippedBackground?: string | null;
  bio?: string | null;
  sekolah?: string | null;
  level: number;
  xp: number;
  levelProgress: { current: number; needed: number; pct: number; remaining: number };
  streak?: number | null;
  gelar?: string | null;
  memberNumber?: string | null;
  joinedAt?: string | null;
  isFounder?: boolean;
  isPremium?: boolean;
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
 * ProfileHero — PLAYER CARD premium (identitas + rank crest sebagai objek
 * visual utama). Komposisi: AVATAR + identitas di kiri, RANK CREST besar di
 * kanan (desktop; 200px discale responsif 130/165/200px via .bc-crest-scale),
 * XP bar ungu→emas, aksi sosial, dan kartu Total Like (redup) bila data ada.
 * "self" = Edit Profil; "peer" = Ikuti / Suka (optimistic, idempoten).
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
  likeSummary,
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
  /** Ringkasan like nyata (total + jumlah karya) untuk kartu Total Like. */
  likeSummary?: { totalLikes: number; karyaCount: number } | null;
}) {
  const [following, setFollowing] = useState<boolean | null>(social?.isFollowing ?? null);
  const [liked, setLiked] = useState<boolean | null>(social?.isLiked ?? null);
  const [likeCount, setLikeCount] = useState<number>(social?.profileLikeCount ?? 0);
  const [busyFollow, setBusyFollow] = useState(false);
  const [busyLike, setBusyLike] = useState(false);
  const busyFollowRef = useRef(false);
  const busyLikeRef = useRef(false);

  // Sinkronkan state saat data sosial datang belakangan (fetch async terpisah
  // dari fetch profil). Hanya saat idle — toggle yang sedang berjalan (optimistic)
  // tidak diganggu, supaya tidak memantulkan state lama ke UI.
  useEffect(() => {
    if (busyFollowRef.current || busyLikeRef.current) return;
    setFollowing(social?.isFollowing ?? null);
    setLiked(social?.isLiked ?? null);
    setLikeCount(social?.profileLikeCount ?? 0);
  }, [social]);

  const meta = RANK_META[rank];
  const rankColor = meta?.color ?? "#94a3b8";
  const next = nextRankOf(rank);
  const nextMeta = next ? RANK_META[next] : null;

  const handleFollow = async () => {
    if (!onFollowToggle || busyFollow) return;
    setBusyFollow(true);
    busyFollowRef.current = true;
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
      busyFollowRef.current = false;
    }
  };

  const handleLike = async () => {
    if (!onLikeToggle || busyLike || liked === null) return;
    setBusyLike(true);
    busyLikeRef.current = true;
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setLikeCount(Math.max(0, prevCount + (nextLiked ? 1 : -1)));
    try {
      const res = await onLikeToggle();
      if (res) {
        setLiked(res.liked);
        const serverCount = (res as { profileLikeCount?: number }).profileLikeCount;
        if (typeof serverCount === "number") setLikeCount(serverCount);
        else setLikeCount(res.liked === nextLiked ? prevCount + (nextLiked ? 1 : -1) : prevCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setBusyLike(false);
      busyLikeRef.current = false;
    }
  };

  const initials = (persona.displayName || persona.fullName || "M")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgCosmic = getBackgroundStyle(persona.equippedBackground);
  // Foreground ditentukan oleh luminance background kosmetik, bukan tema user.
  // darkText=true → latar terang, pakai tinta gelap. darkText=false → latar gelap, pakai tinta putih.
  // Tanpa kosmetik → gunakan kedua varian (system theme handles via dark: prefix).
  const isDarkInk = bgCosmic ? !!bgCosmic.darkText : false;
  // Helper: prefix every class in the dark string with `dark:` so it only
  // activates when the document has the `.dark` class. When isDarkInk=true
  // (custom dark cosmetic bg), the raw dark string is returned instead.
  const darkPrefix = (s: string) => s.split(" ").map(c => `dark:${c}`).join(" ");
  const t = (light: string, dark: string) => (isDarkInk ? dark : `${light} ${darkPrefix(dark)}`);
  const rankLabelFilter = isDarkInk ? undefined : "brightness(0.6)";

  // Glass button: tinta gelap untuk latar terang, tinta terang untuk latar gelap/system dark
  const glassBtn = isDarkInk
    ? "bg-slate-900/10 text-slate-800 border-slate-900/20 hover:bg-slate-900/15"
    : "bg-white/10 text-white border-white/20 hover:bg-white/15 dark:bg-white/10 dark:text-white dark:border-white/20 dark:hover:bg-white/15";

  return (
    <section
      aria-label="Identitas pemain"
      className="bc-hero-card relative overflow-hidden rounded-[24px] mb-6 shadow-2xl bc-profile-workspace"
      style={
        bgCosmic
          ? { background: bgCosmic.background, color: bgCosmic.textColor }
          : undefined
      }
    >
      <style>{`
        /* Crest rank responsif: dirender 200px, discale ke 130/165 di layar kecil */
        .bc-crest-scale { transform: scale(.65); transform-origin: top center; }
        @media (min-width: 640px) { .bc-crest-scale { transform: scale(.825); } }
        @media (min-width: 1024px) { .bc-crest-scale { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .bc-crest-scale { transition: none; } }
      `}</style>

      <CosmicBackground />

      {/* Cahaya di belakang crest (aura lembut) */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "50%",
          right: "5%",
          transform: "translateY(-50%)",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rankColor}33 0%, ${rankColor}14 45%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 p-5 md:p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-5">
          {/* KIRI: avatar + identitas */}
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
            <div className="relative shrink-0">
              {/* Ring gradien di sekitar avatar */}
              <div
                aria-hidden
                className="absolute -inset-1.5 rounded-full opacity-80"
                style={{
                  background:
                    "conic-gradient(from 210deg, rgba(139,92,246,0.9), rgba(236,72,153,0.35), rgba(251,191,36,0.5), rgba(139,92,246,0.9))",
                  filter: "blur(1px)",
                }}
              />
              <UserAvatar
                size={104}
                avatar={persona.avatar}
                frame={persona.equippedFrame}
                initials={initials}
                gradient=""
                textClassName="text-4xl"
                className={`relative backdrop-blur border-4 shadow-lg ring-4 ${isDarkInk ? "border-[#171241] bg-white/10 ring-white/15" : "border-slate-300/60 dark:border-[#171241] bg-slate-900/10 dark:bg-white/10 ring-slate-900/15 dark:ring-white/15"}`}
              />
              {/* Level badge di pojok avatar */}
              <span
                aria-hidden
                className={`absolute -bottom-1.5 -right-1.5 rounded-full px-2 py-0.5 text-[11px] font-black bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-md ring-2 ${isDarkInk ? "ring-[#171241]" : "ring-white/80 dark:ring-[#171241]"}`}
              >
                {persona.level}
              </span>
            </div>

            <div className="min-w-0 flex-1">
                <p className={t("text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800", "text-[11px] font-bold uppercase tracking-[0.2em] text-white/40") + " mb-1"}>
                Profil Pemain
              </p>
              <h1 className="text-2xl md:text-[28px] font-extrabold leading-tight truncate">
                  <UserName
                    name={persona.displayName}
                    color={persona.equippedNameColor}
                    badge={persona.equippedBadge}
                    onDark={isDarkInk}
                    badgeSize={20}
                    isFounder={persona.isFounder}
                    isPremium={persona.isPremium}
                    verifiedSize={22}
                  />
              </h1>
              {(() => {
                const np = getNameplateStyle(persona.equippedNameplate);
                return np ? (
                  <p className="text-xs font-bold mt-0.5" style={np.style}>{np.label}</p>
                ) : null;
              })()}
              {persona.nickname && persona.fullName && (
                <p className={t("text-sm text-slate-700", "text-sm text-white/60") + " truncate"}>{persona.fullName}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {extraChips}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur ${t("bg-slate-900/10 border border-slate-900/20", "bg-white/10 border border-white/15")}`}>
                  <Sparkles size={11} className={t("text-amber-600", "text-amber-300")} />
                  {meta?.title ?? rank}
                  <span className={t("text-slate-600", "text-white/50")}>·</span>
                  {meta?.label ?? rank}
                </span>
                {persona.gelar && (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold bg-amber-400/15 border border-amber-300 dark:border-amber-700/25 ${t("text-amber-700", "text-amber-200")}`}>
                    {persona.gelar}
                  </span>
                )}
                {persona.streak != null && persona.streak > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-orange-400/15 border border-orange-300 dark:border-orange-700/25 ${t("text-orange-700", "text-orange-200")}`}>
                    <Flame size={11} /> {persona.streak}
                  </span>
                )}
                {persona.memberNumber && (
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${t("bg-slate-900/8 border-slate-900/15 text-slate-700", "bg-white/5 border-white/10 text-white/45")}`}>
                    #{persona.memberNumber}
                  </span>
                )}
                {persona.joinedAt && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${t("bg-slate-900/8 border-slate-900/15", "bg-white/5 border-white/10") + " " + t("text-slate-900/60", "text-white/45")}`}>
                    <CalendarDays size={10} /> Bergabung{" "}
                    {new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(
                      new Date(persona.joinedAt),
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KANAN: rank crest — objek visual, ukuran kompak agar hero padat */}
          <div className="shrink-0 flex flex-row lg:flex-col items-center gap-3 lg:gap-1 mx-auto lg:mx-0 lg:pr-4">
            <div className="bc-crest-scale h-[112px] w-[112px] sm:h-[140px] sm:w-[140px] lg:h-[152px] lg:w-[152px]">
              <div
                aria-label={`Rank ${meta?.label} — ${meta?.title}`}
                role="img"
                className="bc-cosmic-crest relative"
                style={{ animation: "bc-cosmic-pulse 4s ease-in-out infinite" }}
              >
                <RankIcon rank={rank} size={152} glow className="drop-shadow-lg" priority />
              </div>
            </div>
            <div className="lg:text-center">
              <p className="text-base lg:text-lg font-black tracking-wide uppercase" style={{ color: rankColor, filter: rankLabelFilter }}>
                {meta?.label}
              </p>
              <p className={t("text-[11px] font-semibold text-slate-900", "text-[11px] font-semibold text-white/70")}>
                Level {persona.level} · {meta?.title}
              </p>
              {next && nextMeta && (
                <p className={t("text-[10px] text-slate-700", "text-[10px] text-white/40")}>
                  {nextMeta.label} di Level {Math.max(persona.level + 1, minLevelForRank(next))}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Level / XP progress — ungu → emas */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${t("bg-slate-900/8 border border-slate-900/15", "bg-white/5 border border-white/10")}`}>
              <Sparkles size={11} className={t("text-amber-600", "text-amber-300")} /> Level {persona.level}
            </span>
            <span className={t("text-slate-800", "text-white/60")}>
              {persona.levelProgress.current.toLocaleString("id-ID")} / {persona.levelProgress.needed.toLocaleString("id-ID")} XP
            </span>
          </div>
          <div
            className={`h-3.5 rounded-full overflow-hidden ring-1 ${t("bg-slate-900/15 ring-slate-900/10", "bg-black/40 ring-white/10")}`}
            role="progressbar"
            aria-valuenow={Math.round(persona.levelProgress.pct * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progres XP Level ${persona.level}`}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.max(2, persona.levelProgress.pct * 100)}%`,
                background:
                  "linear-gradient(90deg, #8B5CF6 0%, #D946EF 45%, #F0ABFC 68%, #FBBF24 100%)",
                boxShadow: "0 0 14px rgba(217,70,239,0.55), 0 0 4px rgba(251,191,36,0.4)",
              }}
            />
          </div>
          <p className={t("text-[11px] text-slate-700", "text-[11px] text-white/45") + " mt-2"}>
            Tinggal {persona.levelProgress.remaining.toLocaleString("id-ID")} XP menuju Level {persona.level + 1}
            <span className={"mx-1.5 " + t("text-slate-500", "text-white/25")}>·</span>
            <span className={t("text-slate-800", "text-white/60")}>{Math.round(persona.levelProgress.pct * 100)}%</span>
          </p>
        </div>

        {/* Sosial — angka nyata pengikut / mengikuti (bila request sosial sukses) */}
        {social && (social.followerCount > 0 || social.followingCount > 0) && (
          <div className={`mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 ${t("text-slate-900", "text-white")}`}>
            <span className="inline-flex items-center gap-2">
              <Users size={14} className={t("text-slate-600", "text-white/40")} aria-hidden />
              <span className="text-base font-black tabular-nums leading-none">
                {social.followerCount.toLocaleString("id-ID")}
              </span>
              <span className={t("text-xs text-slate-700", "text-xs text-white/55")}>Pengikut</span>
            </span>
            <span aria-hidden className={t("h-4 w-px bg-slate-900/15", "h-4 w-px bg-white/15")} />
            <span className="inline-flex items-center gap-2">
              <UserRound size={14} className={t("text-slate-600", "text-white/40")} aria-hidden />
              <span className="text-base font-black tabular-nums leading-none">
                {social.followingCount.toLocaleString("id-ID")}
              </span>
              <span className={t("text-xs text-slate-700", "text-xs text-white/55")}>Mengikuti</span>
            </span>
          </div>
        )}

        {/* AKSI */}
        <div className="flex flex-wrap items-center gap-2.5 mt-4">
          {isOwn && (
          <button
            onClick={onEditProfile}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold bg-white dark:bg-slate-800 text-violet-950 dark:text-violet-200 hover:bg-violet-50 dark:hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
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
                    ? glassBtn + " border"
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
                    ? t(
                        "bg-rose-500/20 text-rose-700 dark:text-rose-200 border-rose-300/30",
                        "bg-rose-500/25 text-rose-200 border-rose-300/40"
                      )
                    : glassBtn
                }`}
              >
                <Heart
                  size={16}
                  className={
                    liked
                      ? t("fill-rose-600 text-rose-600", "fill-rose-400 text-rose-400")
                      : ""
                  }
                />
                {liked ? "Disukai" : "Suka"} · {likeCount.toLocaleString("id-ID")}
              </button>
            </>
          )}

          {!isOwn && (
            <a
              href="#karya"
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${t(
                "bg-slate-900/10 border border-slate-900/15 hover:bg-slate-900/15",
                "bg-white/10 border border-white/15 hover:bg-white/15"
              )}`}
            >
              <PenLine size={16} /> Karya
            </a>
          )}
        </div>

        {/* Kartu Total Like (kaca) — hanya bila data seperti yang dikirim parent */}
        {likeSummary && (
          <div className={`mt-4 inline-flex items-center gap-4 rounded-2xl backdrop-blur px-5 py-3.5 ${t(
            "bg-slate-900/[0.07] border border-slate-900/10",
            "bg-white/[0.07] border border-white/10"
          )}`}>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "radial-gradient(circle at 30% 30%, rgba(244,63,94,0.35), rgba(190,24,93,0.2))" }}
            >
              <Heart size={18} className={t("fill-rose-600 text-rose-600", "fill-rose-400 text-rose-300")} />
            </span>
            <div>
              <p className={`text-xl font-black leading-none ${t("text-slate-900", "text-white")}`}>
                {likeSummary.totalLikes.toLocaleString("id-ID")}
              </p>
              <p className={t("text-[11px] text-slate-700", "text-[11px] text-white/55") + " mt-1"}>
                Total Like Diterima · dari {likeSummary.karyaCount.toLocaleString("id-ID")}{" "}
                {likeSummary.karyaCount === 1 ? "karya" : "karya"}
              </p>
            </div>
            {likeSummary.karyaCount > 0 && (
              <span aria-hidden className={"hidden sm:inline-flex items-center gap-1 text-[11px] ml-2 " + t("text-slate-700", "text-white/45")}>
                <Files size={12} /> Karya
              </span>
            )}
          </div>
        )}

        {/* Bio / tagline */}
        {persona.bio ? (
          <p className={t("mt-4 text-sm text-slate-800", "mt-4 text-sm text-white/70") + " leading-relaxed max-w-2xl"}>{persona.bio}</p>
        ) : (
          isOwn && (
            <p className={t("mt-4 text-sm text-slate-700", "mt-4 text-sm text-white/45") + " italic"}>
              Tambahkan sedikit tentang dirimu.{" "}
              <button onClick={onEditProfile} className={t(
                "underline text-violet-700 hover:text-violet-900",
                "underline text-white/70 hover:text-white"
              )}>
                Edit bio
              </button>
            </p>
          )
        )}
      </div>
    </section>
  );
}