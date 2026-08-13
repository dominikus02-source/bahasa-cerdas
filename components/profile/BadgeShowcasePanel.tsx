"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Award } from "lucide-react";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";

/**
 * BadgeShowcasePanel — grid lencana dengan batas tampil (9 + tombol perluas).
 * Mencegah sidebar memanjang tak terkendali; "Lihat Semua" membuka seluruhnya.
 * Zona navy premium (theme-agnostic) — sama dengan kartu sidebar profile.
 */

export interface ShowcaseLencana {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
  progress: number;
  target: number;
  rarityLabel: string;
}

interface BadgeShowcasePanelProps {
  lencana: ShowcaseLencana[];
  nextBadge?: { name: string; progress: number; target: number } | null;
}

const COLLAPSED_COUNT = 9;

export default function BadgeShowcasePanel({ lencana, nextBadge }: BadgeShowcasePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? lencana : lencana.slice(0, COLLAPSED_COUNT);
  const totalUnlocked = lencana.filter((l) => l.unlocked).length;
  const hidden = lencana.length - visible.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white/90 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Award size={13} className="text-slate-900 dark:text-white" />
          </span>
          Perkembangan Lencana
        </h3>
        <span className="text-[11px] font-semibold text-slate-900/60 dark:text-white/45">
          {totalUnlocked}/{lencana.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {visible.map((l) => (
          <div
            key={l.id}
            title={l.unlocked ? l.name : `${l.name} — ${l.progress}/${l.target}`}
            className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl text-center transition-transform ${
              l.unlocked
                ? "profile-badge-unlocked bg-gradient-to-b from-amber-400/15 to-amber-500/10 ring-1 ring-amber-300/25 hover:scale-105"
                : "bg-slate-900/[0.04] dark:bg-white/[0.04] ring-1 ring-slate-900/5 dark:ring-white/5"
            }`}
          >
            <BadgeIcon
              icon={l.icon}
              alt={l.name}
              size={40}
              className={`object-contain ${l.unlocked ? "" : "grayscale opacity-30"}`}
            />
            <span className={`text-[10px] font-semibold leading-tight ${l.unlocked ? "text-amber-700 dark:text-amber-200" : "text-slate-900/55 dark:text-white/40"}`}>
              {l.name}
            </span>
            {!l.unlocked && (
              <div className="w-full h-1 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(100, (l.progress / l.target) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/[0.05] dark:bg-white/[0.05] ring-1 ring-slate-900/10 dark:ring-white/10 px-3 py-2 text-[11px] font-bold text-slate-900/60 dark:text-white/60 transition-colors hover:bg-slate-900/[0.1] dark:bg-white/[0.1] hover:text-slate-900 dark:text-white"
        >
          {expanded ? (
            <>
              <ChevronUp size={13} /> Sembunyikan
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Lihat Semua ({hidden} lencana lainnya)
            </>
          )}
        </button>
      )}

      {nextBadge && (
        <p className="text-[11px] text-violet-700 dark:text-violet-300 font-semibold mt-3 flex items-center gap-1 bg-violet-500/10 rounded-lg px-2.5 py-2 ring-1 ring-violet-400/20">
          <Award size={12} /> {Math.max(0, nextBadge.target - nextBadge.progress)} lagi untuk buka &ldquo;{nextBadge.name}&rdquo;!
        </p>
      )}
    </div>
  );
}
