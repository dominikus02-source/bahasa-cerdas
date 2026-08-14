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
    <section aria-label="Status premium" className="px-card px-5 py-5">
      {isPremium ? (
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/25">
            <Gem size={17} className="text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--px-text)]">
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
          <span className="shrink-0 w-9 h-9 rounded-xl bg-slate-900/5 dark:bg-white/10 flex items-center justify-center">
            <Gem size={17} className="text-[var(--px-text-faint)]" />
          </span>
          <p className="text-xs text-[var(--px-text-dim)] leading-relaxed">
            Analisis kemampuan yang lebih mendalam tersedia di Premium — sementara itu, teruslah belajar
            dan profilmu tetap berkembang.
          </p>
        </div>
      )}
    </section>
  );
}
