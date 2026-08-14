"use client";

import Link from "next/link";
import { Gamepad2, TrendingUp } from "lucide-react";
import { useHomeData } from "./home-data";

/**
 * Motivasi Arena berdata nyata (profil pemain dari konteks beranda, tanpa
 * fetch sendiri). Sekunder terhadap aksi belajar — bukan CTA emas.
 */
export function ArenaHomeSection() {
  const { profile } = useHomeData();

  const xpToNext = profile?.profile?.levelProgress?.remaining ?? null;
  const rankLabel = profile?.profile?.rankLabel || null;
  const rankTitle = profile?.profile?.rankTitle || null;

  return (
    <section aria-label="Motivasi Arena" className="px-card px-4 py-4 relative overflow-hidden">
      <div className="relative flex items-center gap-3 min-w-0">
        <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--px-royal)]/10 flex items-center justify-center">
          <TrendingUp size={16} className="text-[var(--px-royal)]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-royal-2)]">Motivasi</p>
          {xpToNext !== null && rankLabel ? (
            <p className="text-sm font-semibold text-[var(--px-text)] leading-snug">
              {xpToNext.toLocaleString("id-ID")} XP lagi menuju {rankLabel}
              {rankTitle ? <span className="text-[var(--px-text-dim)] font-semibold"> · {rankTitle}</span> : null}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[var(--px-text)] leading-snug">
              Tantang dirimu. Raih XP. Mainkan gim.
            </p>
          )}
          <p className="text-xs text-[var(--px-text-faint)] mt-0.5">
            Setiap latihan mendekatkanmu ke tingkat berikutnya.
          </p>
        </div>
        <Link
          href="/arena"
          className="shrink-0 px-btn-ghost flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5"
          aria-label="Masuk Arena"
        >
          <Gamepad2 size={15} />
          Arena
        </Link>
      </div>
    </section>
  );
}
