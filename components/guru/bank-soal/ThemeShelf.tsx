// ─── ThemeShelf — Horizontal scrollable shelf ────────────────
// Horizontal card carousel with scroll snap, arrow controls.
// Reused for each category section.

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeCard, type ThemeCardData } from "./ThemeCard";
import type { CategoryVisual } from "./theme-cover";

interface ThemeShelfProps<T extends ThemeCardData> {
  themes: T[];
  visual: CategoryVisual;
  onOpen: (theme: T) => void;
  /** Max visible cards before scrolling. Default 4. */
  visibleCount?: number;
}

export function ThemeShelf<T extends ThemeCardData>({
  themes,
  visual,
  onOpen,
}: ThemeShelfProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector(":first-child")?.getBoundingClientRect().width ?? 200;
    el.scrollBy({ left: dir === "left" ? -(cardW + 12) * 2 : (cardW + 12) * 2, behavior: "smooth" });
  };

  if (themes.length === 0) return null;

  return (
    <div className="relative group/shelf">
      {/* Scroll arrows — visible on hover, hidden on mobile (touch scroll) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Geser ke kiri"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/90 border border-slate-200 shadow-md backdrop-blur-sm text-slate-600 hover:bg-white hover:text-slate-900 opacity-0 group-hover/shelf:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Geser ke kanan"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/90 border border-slate-200 shadow-md backdrop-blur-sm text-slate-600 hover:bg-white hover:text-slate-900 opacity-0 group-hover/shelf:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Shelf track */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {themes.map(t => (
          <div key={t.name} className="snap-start shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
            <ThemeCard theme={t} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  );
}
