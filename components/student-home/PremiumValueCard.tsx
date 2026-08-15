"use client";

import { Gem } from "lucide-react";
import { useHomeData } from "./home-data";

/**
 * Lapisan nilai Premium yang halus — status SELALU dari server canonical
 * (/api/player/premium/status). Bukan halaman jualan: satu baris nilai untuk
 * pengguna free, lencana ringkas untuk PRO/FOUNDER. Tanpa paywall CTA belajar.
 */
export function PremiumValueCard() {
  const { premium: data, premiumLoading: loading, premiumFailed: failed } = useHomeData();

  if (loading) {
    return (
      <div className="px-card px-5 py-5">
        <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 12 }} />
        <div className="px-skeleton rounded-lg mt-2" style={{ width: "90%", height: 10 }} />
      </div>
    );
  }

  if (failed || !data) return null;

  const isPremium = data.plan === "PRO" || data.plan === "FOUNDER";
  const simUsage = data.usage?.SIMULATION;
  const simRemaining =
    simUsage && Number.isFinite(simUsage.limit) && simUsage.limit > 0 ? simUsage.remaining : null;

  return (
    <section aria-label="Status premium" className="premium-value px-card px-5 py-4">
      {isPremium ? (
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Gem size={16} className="text-amber-600 dark:text-amber-300" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
              ✦ Premium
            </p>
            <p className="text-sm font-semibold text-[var(--px-text)]">
              Personalisasi Premium aktif
              {data.subscriptionStatus === "TRIALING" ? " (Masa Uji)" : ""}
            </p>
            <p className="text-xs text-[var(--px-text-faint)]">
              {simRemaining !== null
                ? `Simulasi tersisa ${simRemaining} kali bulan ini — analisis mendalam menyertai setiap latihan.`
                : "Analisis kemampuan mendalam menyertai setiap latihanmu."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-8 h-8 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center">
            <Gem size={16} className="text-[var(--px-text-faint)]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--px-text-faint)]">Personalisasi BC</p>
            <p className="text-xs text-[var(--px-text-dim)] leading-relaxed">
              Analisis kemampuan yang lebih mendalam tersedia di Premium — sementara itu, teruslah belajar
              dan profilmu tetap berkembang.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
