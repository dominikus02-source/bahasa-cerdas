// ─── Theme Cover System (Bank Soal Discovery) ───────────────
// Visual cover PROSEDURAL: solid category color + subtle pattern
// + Lucide icon. NO emoji. NO gradient. NO external images.
//
// Pemakaian:
//   const visual = categoryVisual(categoryKey);
//   const variant = themeVariant(themeName);
//   <ThemeCoverArt visual={visual} variant={variant} name={...} />

import type { LucideIcon } from "lucide-react";
import {
  SpellCheck, Feather, Newspaper, Megaphone, Shapes,
  Languages, BookOpen, BookText, PenLine, ScrollText,
  FileText, Mic, Mail, BarChart3, Library, ClipboardList,
  CircleHelp, Quote, Bookmark, Theater, Music, Frame,
  PenTool, Globe, Sparkles, GraduationCap, Compass,
} from "lucide-react";
import type { IconKey } from "./theme-config";

export type CategoryKey =
  | "Tata Bahasa"
  | "Sastra"
  | "Jenis Teks"
  | "Fungsional"
  | "Lainnya";

/** Resolve IconKey string to Lucide component. */
const ICON_MAP: Record<IconKey, LucideIcon> = {
  "feather": Feather,
  "book-open": BookOpen,
  "book-text": BookText,
  "pen-line": PenLine,
  "scroll-text": ScrollText,
  "newspaper": Newspaper,
  "megaphone": Megaphone,
  "shapes": Shapes,
  "spell-check": SpellCheck,
  "languages": Languages,
  "file-text": FileText,
  "mic": Mic,
  "mail": Mail,
  "bar-chart-3": BarChart3,
  "library": Library,
  "clipboard-list": ClipboardList,
  "circle-help": CircleHelp,
  "quote": Quote,
  "bookmark": Bookmark,
  "theater": Theater,
  "music": Music,
  "frame": Frame,
  "pen-tool": PenTool,
  "globe": Globe,
  "sparkles": Sparkles,
  "graduation-cap": GraduationCap,
  "compass": Compass,
};

export function resolveIcon(key?: IconKey): LucideIcon {
  return key ? (ICON_MAP[key] ?? Feather) : Feather;
}

/** Token visual terpusat per kategori — jangan hardcode di card. */
export interface CategoryVisual {
  key: CategoryKey;
  /** Solid background color for cover area (Tailwind class). */
  coverBg: string;
  /** Aksen kecil (chip, garis heading). */
  accentText: string;
  accentBar: string;
  /** Chip metadata di card. */
  softBg: string;
  softText: string;
  /** Warna pattern overlay (hex — untuk SVG inline). */
  patternColor: string;
  /** Default category icon (used when theme has no specific icon). */
  icon: LucideIcon;
  /** Subtitle editorial singkat per kategori. */
  subtitle: string;
}

export const CATEGORY_VISUALS: Record<CategoryKey, CategoryVisual> = {
  "Tata Bahasa": {
    key: "Tata Bahasa",
    coverBg: "bg-emerald-600",
    accentText: "text-emerald-700",
    accentBar: "bg-emerald-500",
    softBg: "bg-emerald-50",
    softText: "text-emerald-700",
    patternColor: "rgba(255,255,255,0.08)",
    icon: SpellCheck,
    subtitle: "Struktur, ejaan, dan makna kata.",
  },
  Sastra: {
    key: "Sastra",
    coverBg: "bg-violet-600",
    accentText: "text-violet-700",
    accentBar: "bg-violet-500",
    softBg: "bg-violet-50",
    softText: "text-violet-700",
    patternColor: "rgba(255,255,255,0.08)",
    icon: Feather,
    subtitle: "Puisi, prosa, dan bentuk sastra Indonesia.",
  },
  "Jenis Teks": {
    key: "Jenis Teks",
    coverBg: "bg-blue-600",
    accentText: "text-blue-700",
    accentBar: "bg-blue-500",
    softBg: "bg-blue-50",
    softText: "text-blue-700",
    patternColor: "rgba(255,255,255,0.08)",
    icon: Newspaper,
    subtitle: "Dari teks deskripsi hingga artikel dan resensi.",
  },
  Fungsional: {
    key: "Fungsional",
    coverBg: "bg-orange-500",
    accentText: "text-orange-700",
    accentBar: "bg-orange-500",
    softBg: "bg-orange-50",
    softText: "text-orange-700",
    patternColor: "rgba(255,255,255,0.08)",
    icon: Megaphone,
    subtitle: "Surat, poster, pidato — bahasa untuk dipakai.",
  },
  Lainnya: {
    key: "Lainnya",
    coverBg: "bg-indigo-600",
    accentText: "text-indigo-700",
    accentBar: "bg-indigo-500",
    softBg: "bg-indigo-50",
    softText: "text-indigo-700",
    patternColor: "rgba(255,255,255,0.08)",
    icon: Shapes,
    subtitle: "Tema di luar kategori utama.",
  },
};

export function categoryVisual(key: string): CategoryVisual {
  return CATEGORY_VISUALS[key as CategoryKey] ?? CATEGORY_VISUALS["Lainnya"];
}

// ─── Variasi deterministik per tema ──────────────────────────

export interface ThemeVariant {
  /** Indeks pola overlay (0=dots, 1=diagonal, 2=geometric). */
  pattern: 0 | 1 | 2;
  /** Offset shade (0=none, 1=subtle dark, 2=subtle light). */
  shade: 0 | 1 | 2;
}

/** Hash sederhana nama tema → varian. Deterministik antar render. */
export function themeVariant(themeName: string): ThemeVariant {
  let h = 0;
  for (let i = 0; i < themeName.length; i++) {
    h = (h * 31 + themeName.charCodeAt(i)) >>> 0;
  }
  return {
    pattern: (h % 3) as 0 | 1 | 2,
    shade: (Math.floor(h / 3) % 3) as 0 | 1 | 2,
  };
}

/** Nuansa shade — sangat halus, solid color tetap dominan. */
const SHADE_OVERLAY: Record<0 | 1 | 2, string> = {
  0: "",
  1: "bg-black/[0.04]",
  2: "bg-white/[0.06]",
};

/**
 * Cover area visual untuk ThemeCard.
 * Solid category color + subtle pattern + icon.
 * Proporsi konsisten (h-20).
 */
export function ThemeCoverArt({
  visual,
  variant,
  name,
  iconKey,
  className = "",
}: {
  visual: CategoryVisual;
  variant: ThemeVariant;
  name: string;
  iconKey?: string;
  className?: string;
}) {
  // Resolve icon: theme-specific > category default
  const Icon = iconKey ? resolveIcon(iconKey as IconKey) : visual.icon;
  const initials = name
    .split(/[\s/]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden
      className={`relative h-20 w-full overflow-hidden ${visual.coverBg} ${SHADE_OVERLAY[variant.shade]} ${className}`}
    >
      {/* Subtle pattern overlay */}
      {variant.pattern === 0 ? (
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
      ) : variant.pattern === 1 ? (
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "repeating-linear-gradient(120deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 20px)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%)",
            backgroundSize: "20px 20px",
          }}
        />
      )}

      {/* Icon — centered, clean */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
        <Icon size={20} className="text-white/80" />
      </span>

      {/* Subtle initials watermark */}
      <span className="absolute bottom-1.5 right-2.5 text-white/15 text-xl font-extrabold tracking-wider select-none">
        {initials}
      </span>
    </div>
  );
}
