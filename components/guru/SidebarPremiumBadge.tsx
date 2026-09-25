"use client";

import { Crown, Sparkles, Clock, Zap } from "lucide-react";
import Link from "next/link";

interface SidebarPremiumBadgeProps {
  plan: string;
  isTrialActive: boolean;
  daysRemaining: number;
  remainingCredits: number | null;
  creditsTotal?: number;
  premiumUntil: Date | null;
}

export function SidebarPremiumBadge({
  plan,
  isTrialActive,
  daysRemaining,
  remainingCredits,
  creditsTotal,
  premiumUntil,
}: SidebarPremiumBadgeProps) {
  // Founder — show founder badge
  if (plan === "FOUNDER") {
    return (
      <div className="mt-3 pt-3 border-t border-blue-100/70 dark:border-blue-950/70">
        <Link href="/guru/ai-tools" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60 hover:bg-amber-100 transition-all">
          <Crown size={14} className="text-amber-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-700">Akses Founder</p>
            <p className="text-[9px] text-amber-500">500 kredit AI/bulan</p>
          </div>
        </Link>
      </div>
    );
  }

  // Murid — no badge
  if (plan === "MURID_FREE") {
    return null;
  }

  // Active trial
  if (isTrialActive && plan === "GURU_PRO_TRIAL") {
    return (
      <div className="mt-3 pt-3 border-t border-blue-100/70 dark:border-blue-950/70">
        <Link href="/guru/ai-tools" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/60 hover:from-violet-100 hover:to-indigo-100 transition-all">
          <Sparkles size={14} className="text-violet-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-violet-700">Guru Pro Trial</p>
            <div className="flex items-center gap-2 text-[9px] text-violet-500">
              <span className="flex items-center gap-0.5">
                <Clock size={9} /> {daysRemaining} hari
              </span>
              {remainingCredits !== null && creditsTotal && (
                <span className="flex items-center gap-0.5">
                  <Zap size={9} /> {remainingCredits}/{creditsTotal}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Active premium
  if (plan === "GURU_PRO") {
    return (
      <div className="mt-3 pt-3 border-t border-blue-100/70 dark:border-blue-950/70">
        <Link href="/guru/pengaturan/premium" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 hover:from-amber-100 hover:to-yellow-100 transition-all">
          <Crown size={14} className="text-amber-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-700">Guru Pro Aktif</p>
            {premiumUntil && (
              <p className="text-[9px] text-amber-500">
                Sampai {new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </Link>
      </div>
    );
  }

  // Free guru (no trial, not premium)
  return (
    <div className="mt-3 pt-3 border-t border-blue-100/70 dark:border-blue-950/70">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200/60">
        <Zap size={14} className="text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-600">Guru Free</p>
          {remainingCredits !== null && creditsTotal && (
            <p className="text-[9px] text-gray-400">{remainingCredits}/{creditsTotal} credit</p>
          )}
        </div>
      </div>
    </div>
  );
}
