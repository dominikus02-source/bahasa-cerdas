// ─── BankSoalCategoryNav — Category chip navigation ──────────
// Horizontal scrollable category chips for quick filtering.

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { CategoryKey, CategoryVisual } from "./theme-cover";

interface CategoryNavProps {
  categories: { key: string; visual: CategoryVisual; count: number }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}

export function BankSoalCategoryNav({
  categories,
  selected,
  onSelect,
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const checkFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFade(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    checkFade();
    window.addEventListener("resize", checkFade);
    return () => window.removeEventListener("resize", checkFade);
  }, [checkFade]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {/* "Semua" chip */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
            selected === null
              ? "guru-role-tab-active"
              : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          Semua
        </button>

        {categories.map(cat => {
          const isActive = selected === cat.key;
          const Icon = cat.visual.icon;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect(isActive ? null : cat.key)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                isActive
                  ? `${cat.visual.softBg} ${cat.visual.softText} border border-transparent shadow-sm`
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icon size={14} aria-hidden />
              <span>{cat.key}</span>
              <span className={`text-xs tabular-nums ${isActive ? "opacity-80" : "text-slate-400"}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
      {/* Right fade hint */}
      {showFade && (
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"
        />
      )}
    </div>
  );
}
