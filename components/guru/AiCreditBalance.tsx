"use client";

import { useEffect, useState } from "react";
import { Zap, Crown, Sparkles, Clock, Infinity } from "lucide-react";

interface QuotaStatus {
  plan: string;
  unlimited: boolean;
  creditsTotal: number;
  remainingCredits: number;
  isTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
}

export function AiCreditBalance() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/quota/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !status) return null;

  const label = (() => {
    switch (status.plan) {
      case "FOUNDER": return { icon: <Crown size={14} className="text-amber-600" />, text: "Founder Access", sub: "Tak terbatas" };
      case "MURID_FREE": return null;
      case "GURU_PRO": return { icon: <Crown size={14} className="text-emerald-600" />, text: "Guru Pro", sub: `${status.remainingCredits}/${status.creditsTotal} credit/bulan` };
      case "GURU_PRO_TRIAL": return {
        icon: <Sparkles size={14} className="text-violet-600" />,
        text: "Guru Pro Trial",
        sub: `${status.remainingCredits}/${status.creditsTotal} credit tersisa • ${status.daysRemaining} hari lagi`,
      };
      case "GURU_FREE": return { icon: <Zap size={14} className="text-gray-500" />, text: "Guru Free", sub: `${status.creditsTotal} credit/bulan` };
      default: return null;
    }
  })();

  if (!label) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 border border-gray-100 text-[11px]">
      {label.icon}
      <span className="font-medium text-gray-700">{label.text}</span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-500">{label.sub}</span>
    </div>
  );
}
