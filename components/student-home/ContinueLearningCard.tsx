"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Loader2, RotateCw, Target, Sparkles } from "lucide-react";
import MentorCard from "@/components/arena/player/MentorCard";
import { useHomeData } from "./home-data";

/**
 * Kartu Aksi Hari Ini — BC Assessment Engine 2.0 STATES.
 *
 * NO_BASELINE          → DIAGNOSTIC  → "Kenali Kemampuanmu" (Mulai Tes Awal)
 * BASELINE_IN_PROGRESS → DIAGNOSTIC  → "Lanjutkan Tes Awal"
 * BASELINE_COMPLETE_LOW→ DIAGNOSTIC  → "BC Sedang Mengenalimu" (Lanjutkan Latihan)
 * PROFILE_READY        → ADAPTIVE    → "Latihan Untukmu" (Mulai Latihan)
 * PROFILE_CONFIDENT    → ADAPTIVE    → "Latihan Untukmu" (Mulai Latihan)
 *
 * Server-derived: actionTitle, reasonText, ctaLabel, assessmentState.
 * Client never sends skill/difficulty/confidence/reason.
 */
export function ContinueLearningCard() {
  const router = useRouter();
  const { myDay, myDayLoading, myDayFailed, refreshMyDay } = useHomeData();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (myDayLoading) {
    return (
      <div className="my-day-hero px-card px-5 py-7 md:p-8 space-y-3">
        <div className="px-skeleton rounded-lg" style={{ width: 180, height: 12 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 30 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "90%", height: 14 }} />
        <div className="px-skeleton rounded-lg" style={{ width: 140, height: 40 }} />
      </div>
    );
  }

  if (myDayFailed || !myDay) {
    return (
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 text-center">
        <p className="text-sm font-bold text-[var(--px-text)]">Belum bisa memuat rekomendasi belajarmu.</p>
        <p className="mt-1 text-xs text-[var(--px-text-dim)]">Coba beberapa saat lagi.</p>
        <button
          type="button"
          onClick={refreshMyDay}
          className="px-btn-gold mt-4 inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5"
        >
          <RotateCw size={15} />
          Coba Lagi
        </button>
      </section>
    );
  }

  const currentMyDay = myDay;
  const isAdaptive = currentMyDay.mode === "PREVIEW" && currentMyDay.actionType === "ADAPTIVE_PRACTICE";
  const isDiagnostic = currentMyDay.mode === "PREVIEW" && currentMyDay.actionType === "DIAGNOSTIC";
  const personalization = currentMyDay.personalization ?? null;
  const assessmentState = currentMyDay.assessmentState as string | undefined;
  const mentorData = currentMyDay.mentor ? { ...currentMyDay.mentor, nextAction: null } : null;

  async function startAdaptiveSession() {
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch("/api/player/adaptive-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", size: currentMyDay.sessionSize || 5 }),
      });
      const data = await response.json();
      if (!response.ok || data.mode !== "ADAPTIVE" || typeof data.sessionId !== "string") {
        throw new Error(data.error || "Latihan personal belum tersedia");
      }
      router.push(`/arena/adaptive-practice/${data.sessionId}`);
    } catch {
      setStartError("Latihan belum bisa dimulai. Coba lagi sebentar.");
    } finally {
      setStarting(false);
    }
  }

  async function startDiagnosticSession() {
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch("/api/player/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", size: currentMyDay.sessionSize || undefined }),
      });
      const data = await response.json();
      if (!response.ok || data.mode !== "DIAGNOSTIC" || typeof data.sessionId !== "string") {
        throw new Error(data.error || "Tes awal belum tersedia");
      }
      router.push(`/arena/diagnostic/${data.sessionId}`);
    } catch {
      setStartError("Tes awal belum bisa dimulai. Coba lagi sebentar.");
    } finally {
      setStarting(false);
    }
  }

  // ── STATE A+ — Tes Awal dalam penyempurnaan → "Segera Hadir" (tanpa tombol mulai) ──
  // Server mengirim comingSoon:true saat soal Tes Awal AI belum siap produksi.
  // Murid tidak kecewa: kartu tetap informatif, CTA diganti jalur belajar umum.
  if (isDiagnostic && currentMyDay.comingSoon) {
    const infoLine = `${currentMyDay.sessionSize ?? 10} soal · ${currentMyDay.durationLabel ?? "±5–8 menit"}`;
    return (
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">Kenali Kemampuanmu</p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <BookOpen size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">{currentMyDay.actionTitle}</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{currentMyDay.reasonText}</p>
            <p className="mt-2 text-xs font-semibold text-[var(--px-royal-2)]">{infoLine}</p>
            {currentMyDay.skillsLabel && (
              <p className="mt-1 text-[11px] text-[var(--px-text-dim)]">{currentMyDay.skillsLabel}</p>
            )}
            <Link
              href="/arena/jalur-cerdas"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--px-royal-2)] hover:opacity-80"
            >
              Sambil menunggu, mulai belajar dulu
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] px-4 py-2.5 rounded-full bg-[rgba(255,210,74,0.14)] text-[var(--px-gold)] border border-[var(--px-gold)]/30">
              <Sparkles size={13} />
              Segera Hadir
            </span>
          </div>
        </div>
      </section>
    );
  }

  // ── STATE A — Belum ada bukti sama sekali → Tes Awal ──
  if (isDiagnostic) {
    const infoLine = `${currentMyDay.sessionSize ?? 10} soal · ${currentMyDay.durationLabel ?? "±5–8 menit"}`;
    return (
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">Kenali Kemampuanmu</p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <BookOpen size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">{currentMyDay.actionTitle}</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{currentMyDay.reasonText}</p>
            <p className="mt-2 text-xs font-semibold text-[var(--px-royal-2)]">{infoLine}</p>
            {currentMyDay.skillsLabel && (
              <p className="mt-1 text-[11px] text-[var(--px-text-dim)]">{currentMyDay.skillsLabel}</p>
            )}
            {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={startDiagnosticSession}
              disabled={starting}
              className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 disabled:cursor-wait"
              aria-label="Mulai Tes Awal"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : null}
              {starting ? "Menyiapkan..." : currentMyDay.ctaLabel}
              {!starting && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── BASELINE_IN_PROGRESS — Resume tes awal ──
  if (isDiagnostic && assessmentState === "BASELINE_IN_PROGRESS") {
    return (
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">Tes Awal</p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <RotateCw size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">Lanjutkan Tes Awal</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">
              {currentMyDay.reasonText}
            </p>
            {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={startDiagnosticSession}
              disabled={starting}
              className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 disabled:cursor-wait"
              aria-label="Lanjutkan Tes Awal"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : null}
              {starting ? "Menyiapkan..." : currentMyDay.ctaLabel}
              {!starting && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── BASELINE_COMPLETE_LOW — Tes selesai, butuh lebih banyak bukti ──
  if (isDiagnostic && assessmentState === "BASELINE_COMPLETE_LOW") {
    return (
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">BC Sedang Mengenalimu</p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <Target size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">BC Sedang Mengenalimu</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">
              {currentMyDay.reasonText}
            </p>
            <p className="mt-2 text-[11px] text-[var(--px-text-dim)]">Profil awal — akan semakin akurat setelah kamu berlatih.</p>
            {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={startAdaptiveSession}
              disabled={starting}
              className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 disabled:cursor-wait"
              aria-label="Lanjutkan Latihan"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : null}
              {starting ? "Menyiapkan..." : currentMyDay.ctaLabel}
              {!starting && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── FALLBACK / GENERAL_LEARNING — jujur, tanpa klaim personal ──
  if (currentMyDay.actionType === "GENERAL_LEARNING") {
    return (
      <div className="space-y-3">
        <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">Saran untukmu</p>
          <div className="relative flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
                <BookOpen size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
                <span className="truncate">{myDay.actionTitle}</span>
              </h2>
              <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{myDay.reasonText}</p>
              {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}
            </div>
            <div className="shrink-0">
              <Link href="/arena/jalur-cerdas" className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3">
                {myDay.ctaLabel}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {mentorData && <MentorCard data={mentorData} focusText={myDay.reasonText} />}
      </div>
    );
  }

  // ── PROFILE_READY / PROFILE_CONFIDENT — Latihan personal tersedia ──
  // Server-derived: actionTitle, reasonText, ctaLabel, personalization.explanation.
  const stateTitle = currentMyDay.actionTitle;
  const stateDesc = personalization?.explanation ?? currentMyDay.reasonText;
  const stateCta = currentMyDay.ctaLabel;

  return (
    <div className="space-y-3">
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">
          {"Aksi Hari Ini"}
        </p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <Sparkles size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">{stateTitle}</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{stateDesc}</p>
            <p className="mt-1 text-[11px] text-[var(--px-text-dim)]">Latihan dipilih berdasarkan kemampuanmu.</p>
            {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={startAdaptiveSession}
              disabled={starting}
              className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 disabled:cursor-wait"
              aria-label={`Mulai ${stateTitle}`}
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : null}
              {starting ? "Menyiapkan..." : stateCta}
              {!starting && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </section>

      {mentorData && <MentorCard data={mentorData} focusText={stateDesc} />}
    </div>
  );
}
