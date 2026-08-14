"use client";

import { useEffect, useState } from "react";
import { Gem } from "lucide-react";

interface PremiumStatus {
  plan?: string;
  subscriptionStatus?: string | null;
  usage?: Record<string, { used: number; limit: number; remaining: number }>;
}

type Status = "loading" | "error" | "ready";

/**
 * Lapisan nilai Premium yang halus — status SELALU dari server canonical
 * (/api/player/premium/status). Bukan halaman jualan: satu baris nilai untuk
 * pengguna free, lencana ringkas untuk PRO/FOUNDER. Tanpa paywall CTA belajar.
 */
export function PremiumValueCard() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<PremiumStatus | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/player/premium/status")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="px-card px-5 py-5">
        <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 12 }} />
        <div className="px-skeleton rounded-lg mt-2" style={{ width: "90%", height: 10 }} />
      </div>
    );
  }

  if (status === "error" || !data) return null;

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
