"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, RotateCw } from "lucide-react";
import MentorCard from "@/components/arena/player/MentorCard";

interface CtaView {
  ctaType: string;
  title: string;
  description: string | null;
  ctaLabel: string;
  ctaHref: string;
  priority: number;
}

export interface SessionData {
  name: string;
  insights: string[];
  nextAction: CtaView | null;
  today: { activities: number; xp: number; coin: number };
}

type Status = "loading" | "error" | "ready";

/**
 * Kartu aksi hari ini — SATU CTA dominan beranda.
 * Rekomendasi murni dari Learning Loop (/api/player/session).
 *
 * States:
 *  - LOADING → skeleton
 *  - ERROR   → pesan jujur + tombol Coba Lagi (TIDAK pura-pura personal)
 *  - EMPTY   → fallback bermakna ke Jalur Cerdas (murid baru)
 *  - SUCCESS → nextAction personal + insight mentor
 */
export function ContinueLearningCard() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetch("/api/player/session")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        setSession(d);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  if (status === "loading") {
    return (
      <div className="px-card px-5 py-6 space-y-3">
        <div className="px-skeleton rounded-lg" style={{ width: 180, height: 12 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 22 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "90%", height: 14 }} />
        <div className="px-skeleton rounded-lg" style={{ width: 140, height: 40 }} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <section aria-label="Aksi hari ini" className="px-card px-5 py-6 text-center">
        <p className="text-sm font-bold text-[var(--px-text)]">Belum bisa memuat rekomendasi belajarmu.</p>
        <p className="mt-1 text-xs text-[var(--px-text-dim)]">
          Coba beberapa saat lagi — sementara itu kamu bisa langsung belajar di Jalur Cerdas.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={retry}
            className="px-btn-gold flex items-center gap-2 text-sm font-bold px-5 py-2.5"
            aria-label="Coba muat ulang rekomendasi"
          >
            <RotateCw size={15} />
            Coba Lagi
          </button>
          <Link href="/arena/jalur-cerdas" className="px-btn-ghost text-sm font-semibold px-5 py-2.5">
            Ke Jalur Cerdas
          </Link>
        </div>
      </section>
    );
  }

  const action = session?.nextAction || null;
  const display = action || {
    title: "Mulai latihan pertamamu",
    description:
      "Belajar di Jalur Cerdas langkah demi langkah — kosakata, tata bahasa, membaca, dan menulis. Latihan pertamamu akan membangun profil belajarmu.",
    ctaLabel: "Mulai Latihan",
    ctaHref: "/arena/jalur-cerdas",
  };
  const insight = session?.insights?.[0] || null;

  return (
    <div className="space-y-3">
      <section
        aria-label="Aksi hari ini"
        className="px-card px-5 py-6 md:p-7 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[var(--px-gold)]/10 blur-3xl pointer-events-none" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">
          {action ? "Aksi Hari Ini" : "Saran untukmu"}
        </p>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-extrabold text-[var(--px-text)] mb-1.5 flex items-center gap-2">
              <BookOpen size={20} className="text-[var(--px-royal-2)] shrink-0" />
              <span className="truncate">{display.title}</span>
            </h2>
            <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{display.description}</p>
            {insight && (
              <p className="mt-3 text-xs text-[var(--px-text-dim)] leading-relaxed">
                <span className="font-semibold text-[var(--px-text)]">Mengapa ini untukmu: </span>
                {insight}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <Link
              href={display.ctaHref}
              className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3"
              aria-label={`Mulai: ${display.title}`}
            >
              {display.ctaLabel}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {session && <MentorCard data={session} />}
    </div>
  );
}
