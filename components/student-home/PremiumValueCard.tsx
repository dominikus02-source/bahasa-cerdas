"use client";

import { useState } from "react";
import { Gem, Target, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useHomeData } from "./home-data";

const SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

/**
 * Lapisan nilai Premium yang halus — status SELALU dari server canonical
 * (/api/player/premium/status). Transformasi dari "upgrade promotion" menjadi
 * "personal learning value".
 *
 * FREE: Subtle Premium invitation based on current learning state
 * PREMIUM: Show strength, focus area, and recommended next action
 */
export function PremiumValueCard() {
  const { premium: data, premiumLoading: loading, premiumFailed: failed, myDay, myDayLoading } = useHomeData();
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorResult, setMentorResult] = useState<{
    headline: string;
    diagnosis: string;
    reason: string;
    action: string;
    encouragement: string;
  } | null>(null);
  const [mentorError, setMentorError] = useState<string | null>(null);

  async function handleMentorRequest() {
    setMentorLoading(true);
    setMentorError(null);
    setMentorResult(null);
    try {
      const res = await fetch("/api/player/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "explain" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMentorError(data.message || "Gagal mendapatkan penjelasan mentor.");
      } else {
        setMentorResult(data.data);
      }
    } catch {
      setMentorError("Tidak bisa menghubungi Mentor. Coba lagi nanti.");
    } finally {
      setMentorLoading(false);
    }
  }

  if (loading || myDayLoading) {
    return (
      <div className="px-card px-5 py-5">
        <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 12 }} />
        <div className="px-skeleton rounded-lg mt-2" style={{ width: "90%", height: 10 }} />
      </div>
    );
  }

  if (failed || !data) return null;

  const isPremium = data.plan === "PRO" || data.plan === "FOUNDER" || data.plan === "MURID_PREMIUM";
  const simUsage = data.usage?.SIMULATION;
  const simRemaining =
    simUsage && Number.isFinite(simUsage.limit) && simUsage.limit > 0 ? simUsage.remaining : null;

  // Get learner state from myDay for personalized content
  const learnerState = myDay?.learnerState ?? [];
  const personalization = myDay?.personalization ?? null;

  // Find strongest and weakest skills from learner state
  const skillsWithEvidence = learnerState.filter((s) => s.attemptCount >= 3 && s.accuracy !== null);
  const strongestSkill = skillsWithEvidence.sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];
  const weakestSkill = skillsWithEvidence.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0];

  return (
    <section aria-label="Status premium" className="premium-value px-card px-5 py-4">
      {isPremium ? (
        <div className="space-y-3">
          {/* Premium Header */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Gem size={16} className="text-amber-600 dark:text-amber-300" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
                ✦ Premium
              </p>
              <p className="text-sm font-semibold text-[var(--px-text)]">
                Personalisasi Aktif
                {data.subscriptionStatus === "TRIALING" ? " (Masa Uji)" : ""}
              </p>
            </div>
          </div>

          {/* Personalized Learning Value */}
          {skillsWithEvidence.length > 0 ? (
            <div className="space-y-2">
              {/* Strength Recognition */}
              {strongestSkill && (
                <div className="flex items-start gap-2">
                  <TrendingUp size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-xs text-[var(--px-text-dim)]">
                    <span className="font-semibold text-emerald-600">Kekuatan:</span>{" "}
                    {SKILL_LABELS[strongestSkill.skill] || strongestSkill.skill} (
                    {Math.round((strongestSkill.accuracy ?? 0) * 100)}%)
                  </p>
                </div>
              )}

              {/* Focus Area */}
              {weakestSkill && weakestSkill.skill !== strongestSkill?.skill && (
                <div className="flex items-start gap-2">
                  <Target size={12} className="mt-0.5 shrink-0 text-[var(--px-royal-2)]" />
                  <p className="text-xs text-[var(--px-text-dim)]">
                    <span className="font-semibold text-[var(--px-royal-2)]">Fokus:</span>{" "}
                    {SKILL_LABELS[weakestSkill.skill] || weakestSkill.skill} (
                    {Math.round((weakestSkill.accuracy ?? 0) * 100)}%)
                  </p>
                </div>
              )}

              {/* Recommended Next Action */}
              {personalization?.explanation && (
                <div className="flex items-start gap-2">
                  <Sparkles size={12} className="mt-0.5 shrink-0 text-[var(--px-gold)]" />
                  <p className="text-xs text-[var(--px-text-dim)]">
                    <span className="font-semibold text-[var(--px-gold)]">Saran:</span>{" "}
                    {personalization.explanation.length > 80
                      ? `${personalization.explanation.slice(0, 80)}...`
                      : personalization.explanation}
                  </p>
                </div>
              )}

              {/* Simulation Remaining */}
              {simRemaining !== null && (
                <p className="text-[11px] text-[var(--px-text-faint)]">
                  Simulasi tersisa {simRemaining} kali bulan ini
                </p>
              )}

              {/* Mentor CTA */}
              {!mentorResult && !mentorLoading && (
                <button
                  onClick={handleMentorRequest}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--px-royal-2)] hover:opacity-80"
                >
                  <Sparkles size={12} />
                  Minta Penjelasan Mentor
                </button>
              )}

              {/* Mentor Loading */}
              {mentorLoading && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--px-text-faint)]">
                  <Loader2 size={12} className="animate-spin" />
                  Mentor sedang membaca progresmu...
                </div>
              )}

              {/* Mentor Error */}
              {mentorError && (
                <p className="mt-2 text-[11px] text-red-500">{mentorError}</p>
              )}

              {/* Mentor Result */}
              {mentorResult && (
                <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-violet-50/80 to-purple-50/60 border border-violet-200/60">
                  <p className="text-xs font-bold text-[var(--px-royal-2)] mb-2">✨ Mentor Bahasa Cerdas</p>
                  <p className="text-sm font-semibold text-[var(--px-text)] mb-1">{mentorResult.headline}</p>
                  <p className="text-xs text-[var(--px-text-dim)] mb-2">{mentorResult.diagnosis}</p>
                  <div className="space-y-1">
                    <p className="text-[11px]"><span className="font-semibold text-[var(--px-gold)]">💡 Mengapa?</span> {mentorResult.reason}</p>
                    <p className="text-[11px]"><span className="font-semibold text-emerald-600">🎯 Coba lakukan ini:</span> {mentorResult.action}</p>
                    <p className="text-[11px] italic text-[var(--px-text-faint)]">{mentorResult.encouragement}</p>
                  </div>
                  <button
                    onClick={handleMentorRequest}
                    className="mt-2 text-[10px] font-bold text-[var(--px-royal-2)] hover:opacity-80"
                  >
                    Tanyakan lagi →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--px-text-dim)]">
              Analisis kemampuan mendalam menyertai setiap latihanmu.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Free User: Subtle Premium Invitation */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center">
              <Gem size={16} className="text-[var(--px-text-faint)]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--px-text-faint)]">
                Personalisasi
              </p>
              <p className="text-xs text-[var(--px-text-dim)] leading-relaxed">
                Premium bisa membantu menentukan langkah belajar yang paling tepat untukmu.
              </p>
            </div>
          </div>

          {/* Mentor Teaser for FREE users */}
          <div className="ml-11 space-y-1">
            <p className="text-[11px] text-[var(--px-text-faint)]">
              Dapatkan panduan belajar yang lebih personal berdasarkan perkembanganmu.
            </p>
            <Link
              href="/murid/premium"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--px-text-faint)] hover:opacity-80"
            >
              <Sparkles size={10} />
              Lihat Premium
              <span className="text-[10px]">→</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
