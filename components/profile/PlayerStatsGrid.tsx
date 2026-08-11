"use client";

import { BookOpen, Heart, Users, UserRound } from "lucide-react";

export interface PlayerStatCard {
  key: string;
  label: string;
  value: number;
  icon?: "book" | "heart" | "users" | "user";
  href?: string;
}

const ICONS = {
  book: BookOpen,
  heart: Heart,
  users: Users,
  user: UserRound,
};

/**
 * PlayerStatsGrid — statistik utama pemain (Karya / Like / Pengikut /
 * Mengikuti). Angka nyata dari parent; tanpa delta palsu ("+12 baru").
 */
export default function PlayerStatsGrid({ stats }: { stats: PlayerStatCard[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => {
        const Icon = ICONS[s.icon ?? "book"];
        const inner = (
          <div
            className="h-full rounded-2xl px-4 py-4 text-white ring-1 ring-white/10 transition-colors hover:ring-violet-400/30"
            style={{ background: "linear-gradient(135deg, #17163F 0%, #21174F 100%)" }}
          >
            <span
              aria-hidden
              className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/20"
            >
              <Icon size={16} className="text-violet-300" />
            </span>
            <p className="text-2xl font-black text-white leading-none tabular-nums">
              {s.value.toLocaleString("id-ID")}
            </p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
              {s.label}
            </p>
          </div>
        );
        return s.href ? (
          <a key={s.key} href={s.href} className="block">
            {inner}
          </a>
        ) : (
          <div key={s.key}>{inner}</div>
        );
      })}
    </div>
  );
}