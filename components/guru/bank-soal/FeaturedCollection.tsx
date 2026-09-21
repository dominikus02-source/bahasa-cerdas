// ─── FeaturedCollection — Collection showcase card ───────────
// Solid color card for featured collections.
// NO emoji. NO gradient. Lucide icon + clean typography.
// Visual hierarchy: featured (Tokoh Sastra) > restrained (others).

"use client";

import { ArrowRight } from "lucide-react";
import type { ThemeCollection } from "./theme-config";
import { resolveIcon } from "./theme-cover";

interface FeaturedCollectionProps {
  collection: ThemeCollection;
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
  const Icon = resolveIcon(collection.icon);
  const isFeatured = collection.featured;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${collection.bg} p-5 sm:p-6 text-white`}>
      {/* Subtle geometric pattern — very light, no blur orbs */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative">
        <div className="flex items-start gap-4">
          <span
            className={`${isFeatured ? "w-12 h-12" : "w-10 h-10"} rounded-xl bg-white/15 flex items-center justify-center shrink-0`}
            aria-hidden
          >
            <Icon size={isFeatured ? 22 : 18} className="text-white/80" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className={`${isFeatured ? "text-lg sm:text-xl" : "text-base sm:text-lg"} font-bold leading-tight`}>
              {collection.title}
            </h3>
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
            {preview.map(t => (
              <button
                key={t.name}
                type="button"
                onClick={() => onExplore(t.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${collection.accentBg} hover:bg-white/25 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white`}
              >
                <span>{t.name}</span>
                <span className="opacity-60">({t.total})</span>
              </button>
            ))}
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
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
