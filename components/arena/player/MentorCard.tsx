"use client";

import { useEffect, useState } from "react";
import { Bot, Lightbulb } from "lucide-react";

interface SessionToday {
  activities: number;
  xp: number;
  coin: number;
}

interface SessionResponse {
  name: string;
  insights: string[];
  nextAction: { ctaType: string; title: string; description: string; ctaLabel: string; ctaHref: string } | null;
  skills: { skill: string; level: number; xp: number }[];
  today: SessionToday;
}

/** Kartu sapaan "Mentor BC" — rekap sesi belajar hari ini + insight singkat. */
export default function MentorCard({ className = "" }: { className?: string }) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/player/session");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SessionResponse;
        if (active) setSession(data);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (failed) return null;

  if (loading || !session) {
    return <div className={`animate-pulse rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 ${className}`} />;
  }

  const insights = (session.insights ?? []).slice(0, 4);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b4bff] via-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-blue-500/25 ${className}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-6 -left-4 h-20 w-20 rounded-full bg-white/5" />
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Bot size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">Mentor BC</p>
            <p className="truncate text-base font-extrabold leading-tight">Halo {session.name}!</p>
          </div>
        </div>

        {insights.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-indigo-100">
                <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-300" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-xl bg-black/15 px-3 py-2 text-[11px] font-semibold text-indigo-100">
          Statistik hari ini: {session.today.activities} aktivitas · {session.today.xp} XP · {session.today.coin} koin
        </div>
      </div>
    </div>
  );
}
