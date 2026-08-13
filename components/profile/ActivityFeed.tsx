"use client";

import { useMemo, type ReactNode } from "react";
import { Sparkles, PenLine, Activity } from "lucide-react";
import Link from "next/link";

export interface FeedEvent {
  id: string;
  kind: "XP" | "KARYA";
  title: string;
  detail?: string | null;
  amount?: number;
  xp?: boolean;
  createdAt: string;
}

function waktuLalu(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Kemarin";
  if (d < 30) return `${d} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(iso));
}

/**
 * ActivityFeed — aktivitas terbaru pemain (XP + penerbitan karya), digabung
 * dan diurutkan menurun berdasarkan waktu nyata. Tanpa data palsu.
 */
export default function ActivityFeed({
  events,
  allHref,
  emptyText = "Belum ada aktivitas. Mulai belajar untuk mengisinya!",
}: {
  events: FeedEvent[];
  allHref?: string;
  emptyText?: string;
}) {
  const sorted = useMemo(
    () =>
      [...events]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [events],
  );

  const row = (e: FeedEvent): ReactNode => {
    const isXp = e.kind === "XP";
    return (
      <li
        key={e.id}
        className="flex items-start gap-3 px-4 py-3"
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
            isXp
              ? "bg-amber-400/10 ring-amber-300/20"
              : "bg-violet-500/10 ring-violet-400/20"
          }`}
        >
          {isXp ? (
            <Sparkles size={14} className="text-amber-300" />
          ) : (
            <PenLine size={14} className="text-violet-300" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white/85 truncate">{e.title}</p>
          {e.detail && <p className="text-xs text-slate-900/45 dark:text-white/45 truncate">{e.detail}</p>}
          <p className="mt-0.5 text-[10px] text-slate-900/35 dark:text-white/35">{waktuLalu(e.createdAt)}</p>
        </div>
        {e.amount != null && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
              e.xp
                ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/20"
                : "bg-slate-900/5 dark:bg-slate-900/5 text-slate-900/60 dark:text-white/60 ring-1 ring-slate-900/10 dark:ring-white/10"
            }`}
          >
            +{e.amount.toLocaleString("id-ID")}
          </span>
        )}
      </li>
    );
  };

  return (
    <div
      className="rounded-2xl text-slate-900 dark:text-white ring-1 ring-slate-900/10 dark:ring-white/10 overflow-hidden bc-card-premium"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white/90">
          <Activity size={15} className="text-violet-300" /> Aktivitas Terbaru
        </h3>
        {allHref && sorted.length > 0 && (
          <Link href={allHref} className="text-[11px] font-semibold text-violet-300 hover:text-violet-200">
            Lihat Semua
          </Link>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="px-4 pb-5 pt-1 text-sm text-slate-900/40 dark:text-white/40">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] pb-1">{sorted.map(row)}</ul>
      )}
    </div>
  );
}