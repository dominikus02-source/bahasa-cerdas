import type { PlayerRank } from "@prisma/client";
import { RankIcon } from "@/components/gamification/RankIcon";
import { RANK_META } from "@/lib/gamification/ranks";

/**
 * RankChip — chip ringkas Rank resmi (icon + nama rank + title).
 * Dipakai di feed, komentar, karya, daftar pemain, dst.
 */
export function RankChip({
  rank,
  size = 20,
  showTitle = true,
  className = "",
  compact = false,
}: {
  rank: string;
  size?: number;
  /** Tampilkan title (Pemula, Pelajar, ...) di samping nama rank. */
  showTitle?: boolean;
  className?: string;
  /** Tanpa background chip (icon + teks polos). */
  compact?: boolean;
}) {
  const meta = RANK_META[rank as PlayerRank];
  const color = meta?.color ?? "#94a3b8";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${compact ? "" : "rounded-full px-2 py-0.5"} ${className}`}
      style={compact ? {} : { background: `${color}1a`, border: `1px solid ${color}44` }}
      title={`${meta?.label ?? rank} — ${meta?.title ?? ""}`}
    >
      <RankIcon rank={rank} size={size} />
      <span className="text-xs font-bold" style={{ color }}>
        {meta?.label ?? rank}
      </span>
      {showTitle && meta?.title && (
        <span className="text-[10px] font-semibold text-[var(--px-text-dim)]">{meta.title}</span>
      )}
    </span>
  );
}
