// ─── FeaturedCollection — Collection showcase card ───────────
// Large visual card for featured collections (e.g. Tokoh Sastra).
// Shows collection metadata + preview of included themes.

"use client";

import { ArrowRight } from "lucide-react";
import type { ThemeCollection } from "./theme-config";
import { getThemeVisual } from "./theme-config";

interface FeaturedCollectionProps {
  collection: ThemeCollection;
  /** Theme names that belong to this collection (from actual data). */
  matchedThemes: { name: string; total: number }[];
  onExplore: (themeName: string) => void;
}

export function FeaturedCollection({
  collection,
  matchedThemes,
  onExplore,
}: FeaturedCollectionProps) {
  const totalSoal = matchedThemes.reduce((s, t) => s + t.total, 0);
  const preview = matchedThemes.slice(0, 5);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${collection.gradient} p-5 sm:p-6 text-white`}>
      {/* Decorative shapes */}
      <div aria-hidden className="absolute -top-12 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="absolute -bottom-16 left-1/3 w-40 h-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative">
        <div className="flex items-start gap-4">
          <span className="text-3xl sm:text-4xl" aria-hidden>{collection.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold leading-tight">{collection.title}</h3>
            <p className={`mt-1 text-sm ${collection.accentText} opacity-80`}>
              {collection.description}
            </p>
            <div className="flex items-center gap-3 mt-2.5 text-xs">
              <span className={`px-2.5 py-1 rounded-full ${collection.accentBg} font-semibold`}>
                {matchedThemes.length} tema
              </span>
              <span className={`px-2.5 py-1 rounded-full ${collection.accentBg} font-semibold`}>
                {totalSoal.toLocaleString("id-ID")} soal
              </span>
            </div>
          </div>
        </div>

        {/* Theme preview chips */}
        {preview.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.map(t => {
              const vis = getThemeVisual(t.name);
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onExplore(t.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${collection.accentBg} hover:bg-white/25 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white`}
                >
                  {vis.emoji && <span aria-hidden>{vis.emoji}</span>}
                  <span>{t.name}</span>
                  <span className="opacity-60">({t.total})</span>
                </button>
              );
            })}
            {matchedThemes.length > 5 && (
              <span className="inline-flex items-center px-3 py-1.5 text-xs opacity-60">
                +{matchedThemes.length - 5} lagi
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        {preview.length > 0 && (
          <button
            type="button"
            onClick={() => onExplore(preview[0].name)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Jelajahi Koleksi
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}
