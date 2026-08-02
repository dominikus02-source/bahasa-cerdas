import Image from "next/image";
import type { PlayerRank } from "@prisma/client";
import { getRankAsset, RANK_ICON_NATIVE_SIZE } from "@/lib/gamification/rank-assets";
import { RANK_META } from "@/lib/gamification/ranks";

/**
 * RankIcon — icon Rank resmi BahasaCerdas.
 *
 * Menggunakan asset resmi dari `public/Rank BC/` (via Rank Registry
 * lib/gamification/rank-assets.ts) dengan next/image (lazy + caching).
 * DILARANG mengganti icon / menulis path asset langsung di component.
 */
export function RankIcon({
  rank,
  size = 40,
  className = "",
  glow = false,
  priority = false,
}: {
  rank: string;
  /** Ukuran tampilan (px). Asset asli 1000×1000, discale oleh next/image. */
  size?: number;
  className?: string;
  /** Glow ring warna rank di sekitar icon. */
  glow?: boolean;
  /** true untuk gambar di atas fold (hindari kecuali perlu). */
  priority?: boolean;
}) {
  const meta = RANK_META[rank as PlayerRank];
  const color = meta?.color ?? "#94a3b8";

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        ...(glow
          ? {
              filter: `drop-shadow(0 0 ${Math.max(6, size * 0.18)}px ${color}aa)`,
            }
          : {}),
      }}
      title={`${meta?.label ?? rank} — ${meta?.title ?? ""}`}
    >
      <Image
        src={getRankAsset(rank)}
        alt={meta?.label ?? rank}
        width={RANK_ICON_NATIVE_SIZE}
        height={RANK_ICON_NATIVE_SIZE}
        className="h-full w-full rounded-full object-contain"
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        sizes={`${size}px`}
      />
    </span>
  );
}
