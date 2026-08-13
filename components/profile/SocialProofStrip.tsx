"use client";

import { Users, Heart, BookOpen, Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

export interface StripStat {
  key: string;
  label: string;
  value: number;
  /** Arah tautan (opsional). */
  href?: string;
  /** Icon lucide (default sparkle). */
  icon?: "users" | "heart" | "book" | "flame" | "sparkles" | "trophy";
}

const ICONS = {
  users: Users,
  heart: Heart,
  book: BookOpen,
  flame: Flame,
  sparkles: Sparkles,
  trophy: Trophy,
};

/**
 * SocialProofStrip — deretan statistik ringkas (karya, apresiasi, pengikut,
 * level, dst). Dipakai di hero profil & halaman publik. Tanpa data palsu:
 * hanya nilai yang benar-benar dikirim oleh parent.
 */
export default function SocialProofStrip({
  stats,
  grid = "grid-cols-3 md:grid-cols-6",
}: {
  stats: StripStat[];
  grid?: string;
}) {
  if (stats.length === 0) return null;

  return (
    <div className={`grid ${grid} gap-2.5`}>
      {stats.map((s) => {
        const Icon = ICONS[s.icon ?? "sparkles"];
        const inner = (
 <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-slate-900/5 dark:bg-slate-900/10 border-slate-900/10 dark:border-white/10 py-3 px-2 backdrop-blur transition-all hover:bg-white/20 group hover:border-white/20">
            <Icon size={15} className="text-amber-300/90" aria-hidden />
            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
              {s.value.toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-900/50 dark:text-white/50 group-hover:text-slate-900/70 dark:text-white/70">
              {s.label}
            </span>
          </div>
        );
        return s.href ? (
          <Link key={s.key} href={s.href} aria-label={`${s.label}: ${s.value}`} className="min-w-0">
            {inner}
          </Link>
        ) : (
          <div key={s.key} className="min-w-0">
            {inner}
          </div>
        );
      })}
    </div>
  );
}