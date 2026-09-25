"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles, Clock, Zap, AlertCircle } from "lucide-react";
import Link from "next/link";
import { fetchQuotaStatus } from "@/lib/ai-gateway/quota-status-client";

interface QuotaStatus {
  plan: string;
  unlimited: boolean;
  creditsTotal: number;
  remainingCredits: number;
  isTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
}

export function TrialStatusCard() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotaStatus()
      .then((d) => {
        if (d) setStatus(d);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !status) return null;

  // Founder — no card needed
  if (status.plan === "FOUNDER") return null;

  // Murid — no card
  if (status.plan === "MURID_FREE") return null;

  // Active trial
  if (status.isTrial && status.plan === "GURU_PRO_TRIAL") {
    return (
      <div className="bg-[#f5f9ff] rounded-2xl border border-blue-200 dark:bg-[#0b1d34] dark:border-blue-950/70 p-5 hover:shadow-lg transition-all">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              Guru Pro Trial Aktif
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">
                <Clock size={10} /> {status.daysRemaining} hari
              </span>
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Semua fitur AI premium terbuka selama masa trial.</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-violet-600 font-medium">
                <Zap size={12} />
                {status.remainingCredits}/{status.creditsTotal} credit
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href="/guru/ai-tools"
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
              >
                <Sparkles size={12} /> Lihat Alat AI
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active premium
  if (status.plan === "GURU_PRO") {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 p-5 hover:shadow-lg transition-all">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md shrink-0">
            <Crown size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              Guru Pro Aktif
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                <Crown size={10} /> Pro
              </span>
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {status.trialEndsAt
                ? `Akses Pro aktif sampai ${new Date(status.trialEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
                : "Akses Pro aktif"}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Zap size={12} />
                {status.remainingCredits}/{status.creditsTotal} credit
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Free guru (no trial, not premium) — subtle expired/ended message
  if (status.plan === "GURU_FREE") {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md shrink-0">
            <AlertCircle size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-700">Guru Free</h3>
            <p className="text-sm text-gray-500 mt-0.5">Upgrade ke Guru Pro untuk 500 kredit AI/bulan dan akses fitur Pro.</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                <Zap size={12} />
                {status.remainingCredits}/{status.creditsTotal} credit/bulan
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
