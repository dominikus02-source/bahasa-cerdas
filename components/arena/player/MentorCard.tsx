"use client";

import { useEffect, useState } from "react";
import { Bot, Lightbulb } from "lucide-react";

interface SessionToday {
  activities: number;
  xp: number;
  coin: number;
}

export interface SessionResponse {
  name: string;
  insights: string[];
  nextAction: { ctaType: string; title: string; description: string; ctaLabel: string; ctaHref: string } | null;
  skills: { skill: string; level: number; xp: number }[];
  today: SessionToday;
}

/** Bentuk minimal bila data diteruskan dari komponen induk (skills tidak dipakai kartu ini). */
export interface MentorCardData {
  name: string;
  insights: string[];
  nextAction?: {
    ctaType: string;
    title: string;
    description: string | null;
    ctaLabel: string;
    ctaHref: string;
  } | null;
  today: { activities: number; xp: number; coin: number };
  skills?: { skill: string; level: number; xp: number }[];
}

/** Kartu sapaan "Mentor BC" — rekap sesi belajar hari ini + insight singkat. */
export default function MentorCard({
  className = "",
  data = null,
  focusText = null,
}: {
  className?: string;
  /** Bila disediakan (dari /api/player/session induk), TIDAK fetch ulang. */
  data?: MentorCardData | null;
  /** Server-derived My Day context; tidak membuat rekomendasi baru. */
  focusText?: string | null;
}) {
  const [session, setSession] = useState<MentorCardData | null>(data);
  const [loading, setLoading] = useState(data === null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (data !== null) {
      setSession(data);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch("/api/player/session");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as SessionResponse;
        if (active) setSession(payload);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [data]);

  if (loading) {
    return <div className={`animate-pulse rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 h-28 ${className}`} />;
  }

  if (failed || !session) return null;

  const insights = focusText ? [focusText] : (session.insights ?? []).slice(0, 2);

  return (
    <div
      className={`mentor-note relative overflow-hidden px-4 py-4 md:px-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--px-royal)]/10 text-[var(--px-royal)]">
          <Bot size={16} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--px-royal-2)]">Mentor BC</p>
            <p className="truncate text-xs font-semibold text-[var(--px-text)]">Halo {session.name}</p>
          </div>

          {insights.length > 0 && (
            <ul className="mt-2 space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--px-text-dim)]">
                  <Lightbulb size={12} className="mt-0.5 shrink-0 text-[var(--px-gold)]" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-[11px] text-[var(--px-text-faint)]">
            Hari ini: {session.today.activities} aktivitas · {session.today.xp} XP · {session.today.coin} koin
          </p>
        </div>
      </div>
    </div>
  );
}
