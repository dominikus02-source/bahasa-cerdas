"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { RANK_META, type PlayerRank } from "@/lib/gamification/client-types";
import { RankIcon as OfficialRankIcon } from "@/components/gamification/RankIcon";

/** Kartu kaca tema Player. */
export function GlassCard({
  children,
  className = "",
  style,
  pressable = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  pressable?: boolean;
}) {
  return (
    <div className={`px-card ${pressable ? "px-card-press cursor-pointer" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Icon rank — ICON RESMI via Rank Registry (lib/gamification/rank-assets.ts). */
export function RankIcon({
  rank,
  size = 44,
  ring = false,
}: {
  rank: string;
  size?: number;
  ring?: boolean;
}) {
  return <OfficialRankIcon rank={rank} size={size} glow={ring} />;
}

/** Peta emoji → label rank untuk tampilan detail. */
export function rankLabelOf(rank: string): string {
  return RANK_META[rank as PlayerRank]?.label ?? rank;
}

/** Waktu relatif Bahasa Indonesia. */
export function useRelativeTime(dateIso: string | null): string {
  return useMemo(() => {
    if (!dateIso) return "";
    const d = new Date(dateIso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }, [dateIso]);
}

/** Format angka Indonesia (1.234). */
export function formatId(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Skeleton placeholder. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`px-skeleton rounded-xl ${className}`} />;
}

/** Avatar default (inisial) jika tidak ada gambar. */
export function InitialAvatar({
  name,
  size = 48,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--px-royal)] to-purple-500 font-extrabold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  );
}
