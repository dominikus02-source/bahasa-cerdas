"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

interface CtaView {
  ctaType: string;
  title: string;
  description: string | null;
  ctaLabel: string;
  ctaHref: string;
  priority: number;
}

interface SessionData {
  name: string;
  insights: string[];
  nextAction: CtaView | null;
  today: { activities: number; xp: number; coin: number };
}

export function ContinueLearningCard() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/player/session")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setSession(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const action = session?.nextAction || null;
  const fallback = {
    title: "Mulai Belajar di Jalur Cerdas",
    description: "Lanjutkan materi Bahasa Indonesia langkah demi langkah — kosakata, tata bahasa, membaca, dan menulis.",
    ctaLabel: "Lanjut Belajar",
    ctaHref: "/arena/jalur-cerdas",
  };
  const display = action || fallback;

  if (loading) {
    return (
      <div className="px-card px-5 py-6 space-y-3">
        <div className="px-skeleton rounded-lg" style={{ width: 180, height: 12 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 22 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "90%", height: 14 }} />
        <div className="px-skeleton rounded-lg" style={{ width: 140, height: 40 }} />
      </div>
    );
  }

  return (
    <section aria-label="Lanjutkan belajar" className="px-card px-5 py-6 md:p-7 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[var(--px-gold)]/10 blur-3xl pointer-events-none" />
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)] mb-2">
        Lanjutkan Perjalananmu
      </p>
      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-[var(--px-text)] mb-1.5 flex items-center gap-2">
            <BookOpen size={20} className="text-[var(--px-royal-2)] shrink-0" />
            <span className="truncate">{display.title}</span>
          </h2>
          <p className="text-sm text-[var(--px-text-dim)] leading-relaxed">{display.description}</p>
        </div>
        <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-stretch gap-2">
          <Link href={display.ctaHref} className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3">
            {display.ctaLabel}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      {session?.insights && session.insights.length > 0 && (
        <p className="relative mt-4 flex items-start gap-2 text-xs text-[var(--px-text-dim)]">
          <Sparkles size={14} className="text-[var(--px-gold)] shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold text-[var(--px-text)]">Saran mentor: </span>
            {session.insights[0]}
          </span>
        </p>
      )}
    </section>
  );
}
