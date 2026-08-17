"use client";

import { Flame } from "lucide-react";
import { GlassCard, formatId } from "./ui";

/** Kartu streak — konsistensi belajar harian. */
export function StreakCard({ streak }: { streak: number }) {
  const days = Math.min(7, streak);
  const full = Array.from({ length: days }, (_, i) => i + 1);
  // Penomoran DILANJUTKAN dari hari yang sudah terisi. Sebelumnya dimulai dari
  // 1 lagi, sehingga "1" muncul dua kali dan hari ke-7 tidak pernah tampil.
  const empty = Array.from({ length: 7 - days }, (_, i) => days + i + 1);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2">
        <span className="px-flame text-2xl">🔥</span>
        <div>
          <p className="text-base font-extrabold leading-tight text-[var(--px-text)]">
            {formatId(streak)} hari beruntun
          </p>
          <p className="text-[11px] text-[var(--px-text-dim)]">Tetap rajin agar streakmu tidak putus!</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {full.map((d) => (
          <div key={`f${d}`} className="flex h-8 flex-1 items-center justify-center rounded-lg bg-gradient-to-b from-orange-500/60 to-amber-600/50 text-xs font-bold text-orange-100">
            {d}
          </div>
        ))}
        {empty.map((d) => (
          <div key={`e${d}`} className="flex h-8 flex-1 items-center justify-center rounded-lg bg-white/5 dark:bg-slate-900/5 text-xs font-bold text-[var(--px-text-faint)]">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--px-glass)] px-3 py-2 text-[11px] font-semibold text-[var(--px-text-dim)]">
        <Flame size={12} className="shrink-0 text-orange-400" />
        Streak dihitung per hari dari aktivitas belajarmu di BahasaCerdas.
      </div>
    </GlassCard>
  );
}
