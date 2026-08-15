"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Loader2, RotateCw } from "lucide-react";
import MentorCard from "@/components/arena/player/MentorCard";
import { useHomeData } from "./home-data";

/** Kartu Aksi Hari Ini — canonical My Day action dari adaptive preview. */
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
  const mentorData = currentMyDay.mentor
    ? { ...currentMyDay.mentor, nextAction: null }
    : null;

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

  return (
    <div className="space-y-3">
      <section aria-label="Aksi hari ini" className="my-day-hero px-card px-5 py-7 md:p-8 relative overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">
          {isAdaptive ? "Aksi Hari Ini" : "Saran untukmu"}
        </p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-[32px] font-semibold tracking-tight text-[var(--px-text)] mb-2 flex items-center gap-2">
              <BookOpen size={21} strokeWidth={1.8} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">{myDay.actionTitle}</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">
              {myDay.reasonText}
              {myDay.sessionSize ? ` ${myDay.sessionSize} soal singkat.` : ""}
            </p>
            {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}
          </div>
          <div className="shrink-0">
            {isAdaptive ? (
              <button
                type="button"
                onClick={startAdaptiveSession}
                disabled={starting}
                className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 disabled:cursor-wait"
                aria-label={`Mulai ${myDay.actionTitle}`}
              >
                {starting ? <Loader2 size={16} className="animate-spin" /> : null}
                {starting ? "Menyiapkan..." : myDay.ctaLabel}
                {!starting && <ArrowRight size={16} />}
              </button>
            ) : (
              <Link href="/arena/jalur-cerdas" className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3">
                {myDay.ctaLabel}
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {mentorData && <MentorCard data={mentorData} focusText={myDay.reasonText} />}
    </div>
  );
}
