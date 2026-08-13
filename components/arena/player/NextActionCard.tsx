"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

interface NextAction {
  ctaType: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  priority?: number;
}

interface NextActionResponse {
  nextAction: NextAction | null;
}

/** Kartu CTA "tidak ada jalan buntu" — rekomendasi aksi berikutnya untuk pemain. */
export default function NextActionCard({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/player/next-action");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as NextActionResponse;
        if (active) setNextAction(data.nextAction ?? null);
      } catch {
        if (active) setNextAction(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 ${className}`}>
        <div className={compact ? "h-24" : "h-28"} />
      </div>
    );
  }

  if (!nextAction) return null;

  const href = nextAction.ctaHref || "#";

  return (
    <a
      href={href}
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 ${
        compact ? "p-4" : "p-5 md:p-6"
      } ${className}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white bg-white/5 dark:bg-slate-900/5" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white bg-white/5 dark:bg-slate-900/5" />
      <div className="relative z-10">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          <Sparkles size={compact ? 12 : 14} />
          Berikutnya
        </div>
        <h3 className={`font-extrabold leading-tight ${compact ? "text-base" : "text-lg md:text-xl"}`}>
          {nextAction.title}
        </h3>
        {nextAction.description && (
          <p className={`mt-1 text-violet-100 ${compact ? "text-xs" : "text-sm"}`}>{nextAction.description}</p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800/90 px-4 py-2 text-sm font-bold text-violet-700 dark:text-violet-300 shadow-md transition-all group-hover:gap-2.5">
          {nextAction.ctaLabel}
          <ArrowRight size={16} />
        </span>
      </div>
    </a>
  );
}
