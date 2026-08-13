"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { RARITY_META, type BadgeView } from "@/lib/gamification/client-types";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";

/**
 * AchievementShowcase — grid lencana (badge) profil. Menampilkan maksimum
 * `max` lencana: terbuka penuh, sisanya slot "terkunci" abu-abu sebagai
 * petunjuk progres. Klik → halaman koleksi lengkap.
 */
export default function AchievementShowcase({
  badges,
  max = 9,
  koleksiUrl = "/arena/player/badges",
}: {
  badges: BadgeView[];
  max?: number;
  koleksiUrl?: string;
}) {
  const unlocked = badges.filter((b) => b.unlocked);
  const shown = unlocked.slice(0, max);
  const shownRarity = (b: BadgeView) => RARITY_META[b.rarity] ?? { color: "#7c3aed", label: "" };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {shown.map((b) => {
        const rarity = shownRarity(b);
        return (
          <Link
            key={b.id}
            href={koleksiUrl}
            title={`${b.name} — ${b.description}`}
 className="group flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-900/5 p-3 transition-all hover:border-white/25 hover:bg-white/10 "
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-900 dark:text-white shadow-md transition-transform group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${rarity.color}, ${rarity.color}88)` }}
            >
              <BadgeIcon icon={b.icon} size={26} alt={b.name} />
            </span>
            <span className="max-w-full truncate text-[11px] font-bold text-slate-900/80 dark:text-white/80">{b.name}</span>
          </Link>
        );
      })}

      {Array.from({ length: Math.max(0, max - shown.length) }).map((_, i) => (
        <div
          key={`lock-${i}`}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-white/10 bg-white/5 dark:bg-slate-900/5 p-3 opacity-55"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/5 dark:bg-slate-900/5 text-slate-900/35 dark:text-white/35">
            <Lock size={18} />
          </span>
          <span className="text-[11px] text-slate-900/35 dark:text-white/35">Terkunci</span>
        </div>
      ))}
    </div>
  );
}