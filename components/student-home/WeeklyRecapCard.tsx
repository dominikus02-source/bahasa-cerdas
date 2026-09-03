"use client";

import { useState, useEffect } from "react";
import { Calendar, TrendingUp, Target, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useHomeData } from "./home-data";

interface WeeklyRecapData {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    activities: number;
    questions: number;
    accuracy: number | null;
    activeDays: number;
  };
  strength: {
    skill: string;
    label: string;
    accuracy: number;
  } | null;
  focus: {
    skill: string;
    label: string;
    accuracy: number;
  } | null;
  improvements: string[];
  recommendations: string[];
}

/**
 * Weekly Learning Recap Card for MURID_PREMIUM.
 *
 * Shows concise, data-driven weekly summary.
 * FREE users see a subtle teaser.
 */
export function WeeklyRecapCard() {
  const { premium } = useHomeData();
  const [recap, setRecap] = useState<WeeklyRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPremium = premium?.plan === "PRO" || premium?.plan === "FOUNDER" || premium?.plan === "MURID_PREMIUM";

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }

    async function fetchRecap() {
      try {
        const res = await fetch("/api/player/weekly-recap");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Gagal memuat weekly recap");
        }
        const data = await res.json();
        setRecap(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }

    fetchRecap();
  }, [isPremium]);

  // FREE user teaser
  if (!isPremium) {
    return (
      <div className="px-card bc-tint-teal px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-8 h-8 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center">
            <Calendar size={16} className="text-[var(--px-text-faint)]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--px-text-faint)]">
              Weekly Recap
            </p>
            <p className="text-xs text-[var(--px-text-dim)] leading-relaxed">
              Kenali perkembangan belajarmu setiap minggu.
            </p>
            <Link
              href="/murid/premium"
              className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--px-text-faint)] hover:opacity-80"
            >
              Pelajari Premium
              <span className="text-[10px]">→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="px-card bc-tint-teal px-5 py-4">
        <div className="flex items-center gap-2 text-[var(--px-text-faint)]">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Memuat weekly recap...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-card bc-tint-teal px-5 py-4">
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  // No data state
  if (!recap) {
    return null;
  }

  return (
    <div className="px-card bc-tint-teal px-5 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-[var(--px-mint)]" strokeWidth={1.8} />
        <h3 className="text-sm font-semibold text-[var(--px-text)]">Minggu Ini</h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--px-text-faint)]" />
          <div>
            <p className="text-lg font-bold text-[var(--px-text)]">{recap.summary.questions}</p>
            <p className="text-[10px] text-[var(--px-text-faint)]">soal dikerjakan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--px-text-faint)]" />
          <div>
            <p className="text-lg font-bold text-[var(--px-text)]">{recap.summary.activeDays}</p>
            <p className="text-[10px] text-[var(--px-text-faint)]">hari aktif</p>
          </div>
        </div>
      </div>

      {/* Accuracy */}
      {recap.summary.accuracy !== null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--px-text-dim)]">Akurasi minggu ini</span>
          <span className="text-sm font-bold text-[var(--px-text)]">{recap.summary.accuracy}%</span>
        </div>
      )}

      {/* Strength */}
      {recap.strength && (
        <div className="flex items-start gap-2">
          <TrendingUp size={12} className="mt-0.5 shrink-0 text-emerald-500" />
          <p className="text-xs text-[var(--px-text-dim)]">
            <span className="font-semibold text-emerald-600">Kekuatan:</span>{" "}
            {recap.strength.label} ({recap.strength.accuracy}%)
          </p>
        </div>
      )}

      {/* Focus */}
      {recap.focus && (
        <div className="flex items-start gap-2">
          <Target size={12} className="mt-0.5 shrink-0 text-[var(--px-royal-2)]" />
          <p className="text-xs text-[var(--px-text-dim)]">
            <span className="font-semibold text-[var(--px-royal-2)]">Fokus:</span>{" "}
            {recap.focus.label} ({recap.focus.accuracy}%)
          </p>
        </div>
      )}

      {/* Improvements */}
      {recap.improvements.length > 0 && (
        <p className="text-[11px] text-[var(--px-text-dim)]">
          <span className="font-semibold">Perkembangan:</span>{" "}
          {recap.improvements.join(", ")} meningkat.
        </p>
      )}

      {/* Recommendation */}
      {recap.recommendations.length > 0 && (
        <div className="pt-2 border-t border-[var(--px-border)]">
          <p className="text-[11px] font-semibold text-[var(--px-text-dim)]">
            Fokus minggu depan:
          </p>
          <p className="text-[11px] text-[var(--px-text-dim)] mt-1">
            {recap.recommendations[0]}
          </p>
          <Link
            href="/arena/jalur-cerdas"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--px-royal-2)] hover:opacity-80"
          >
            Mulai Latihan
            <span className="text-[10px]">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
