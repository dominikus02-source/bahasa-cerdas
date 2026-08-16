"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Loader2, RotateCw, Target, Sparkles } from "lucide-react";
import MentorCard from "@/components/arena/player/MentorCard";
import { useHomeData } from "./home-data";

/**
 * Kartu Aksi Hari Ini — STEP 4E.2 PERSONALIZATION STATES.
 *
 * STATE A (NO_EVIDENCE)      : actionType DIAGNOSTIC        → "Kenali Kemampuanmu"
 * STATE B (DIAGNOSTIC DONE)  : ADAPTIVE + diagnosticCompleted → "Profil Belajarmu Sudah Siap"
 * STATE C (PERSONALIZED)     : ADAPTIVE + target skill       → "Latihan Untukmu"
 * STATE D (INSUFFICIENT)     : ADAPTIVE tanpa target skill   → "BC Masih Mengenali"
 *
 * Semua judul/penjelasan berasal dari SERVER (actionTitle/reasonText/
 * personalization.explanation) — klien tidak pernah mengirim skill/difficulty/
 * confidence/reason. Klik selalu: POST {action:"start"} (adaptive) atau
 * POST {action:"start"} (diagnostic) — tanpa payload skill apa pun.
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
  // STATE D: adaptive tanpa target skill (belum cukup bukti) — jujur, bukan "lemah".
  const insufficient = isAdaptive && personalization?.actionType === "CONTINUE_EVIDENCE";
  const diagnosticReady = isAdaptive && Boolean(currentMyDay.diagnosticCompleted) && !insufficient;
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

  // ── STATE D — Diagnostik ada tapi bukti belum cukup ──
  if (isAdaptive && insufficient) {
    return (
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">Aksi Hari Ini</p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <Target size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">BC Masih Mengenali</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">
              Beberapa kemampuanmu belum cukup terukur. Latihan berikutnya membantu BC memahami kemampuanmu dengan lebih baik.
            </p>
            <p className="mt-2 text-xs text-[var(--px-text-dim)]">
              {personalization?.explanation ?? currentMyDay.reasonText}
            </p>
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
              {starting ? "Menyiapkan..." : "Lanjutkan Latihan"}
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

  // ── STATE B (diagnostik selesai) / STATE C (latihan personal tersedia) ──
  // Catatan: STATE C menampilkan skill target via explanation server
  // ("BC memilih latihan Tata Bahasa untuk ...") — klien tidak mereferensikan
  // field skill apa pun (jaga test: no client-controlled skill).
  const stateTitle = diagnosticReady ? "Profil Belajarmu Sudah Siap" : "Latihan Untukmu";
  const stateDesc = diagnosticReady
    ? "BC sudah mulai mengenali kemampuanmu. Latihan berikutnya dipilih berdasarkan hasil belajarmu."
    : (personalization?.explanation ?? currentMyDay.reasonText);
  const stateCta = diagnosticReady ? "Mulai Latihan Personal" : currentMyDay.ctaLabel;

  return (
    <div className="space-y-3">
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">
          {diagnosticReady ? "Profil Belajarmu" : "Aksi Hari Ini"}
        </p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <Sparkles size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">{stateTitle}</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{stateDesc}</p>
            {!diagnosticReady && (
              <p className="mt-1 text-[11px] text-[var(--px-text-dim)]">Latihan dipilih berdasarkan kemampuanmu.</p>
            )}
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
