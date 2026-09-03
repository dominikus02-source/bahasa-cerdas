"use client";

import Link from "next/link";
import { Coins, Gamepad2, TrendingUp } from "lucide-react";
import { useHomeData } from "./home-data";

/**
 * Motivasi Arena berdata nyata (profil pemain dari konteks beranda, tanpa
 * fetch sendiri). Sekunder terhadap aksi belajar — bukan CTA emas.
 * Toko Koin = aksi sekunder reward (koin dari User.coins / engine existing),
 * menuju route canonical /arena/toko-koin — tanpa logika wallet baru.
 */
export function ArenaHomeSection() {
  const { profile } = useHomeData();

  const xpToNext = profile?.profile?.levelProgress?.remaining ?? null;
  const rankLabel = profile?.profile?.rankLabel || null;
  const rankTitle = profile?.profile?.rankTitle || null;

  return (
    <section aria-label="Motivasi Arena" className="px-card bc-tint-blue px-4 py-4 relative overflow-hidden">
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
        <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--px-royal)]/10 flex items-center justify-center">
          <TrendingUp size={16} className="text-[var(--px-royal)]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1 basis-40">
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
        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
          <Link
            href="/arena"
            className="px-btn-ghost flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5"
            aria-label="Masuk Arena"
          >
            <Gamepad2 size={15} />
            Arena
          </Link>
          <Link
            href="/arena/toko-koin"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--px-text-dim)] transition-colors hover:text-[var(--px-gold)] px-1 py-1.5"
            aria-label="Buka Toko Koin"
          >
            <Coins size={14} className="text-[var(--px-gold)]" />
            Toko Koin
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
