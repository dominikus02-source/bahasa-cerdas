// ─── Theme Cover System (Bank Soal — Canonical) ─────────────
// Single rendering path: solid category color + illustration OR icon.
// NO patterns. NO gradients. NO variants. NO watermarks.
//
// Pemakaian:
//   const visual = categoryVisual(categoryKey);
//   <ThemeCoverArt visual={visual} name={...} iconKey={...} illustrationKey={...} />

import type { LucideIcon } from "lucide-react";
import {
  SpellCheck, Feather, Newspaper, Megaphone, Shapes,
  Languages, BookOpen, BookText, PenLine, ScrollText,
  FileText, Mic, Mail, BarChart3, Library, ClipboardList,
  CircleHelp, Quote, Bookmark, Theater, Music, Frame,
  PenTool, Globe, Sparkles, GraduationCap, Compass,
  Zap, Lightbulb, Target, Puzzle, Brain, MessageCircle,
} from "lucide-react";
import type { IconKey } from "./theme-config";
import { resolveIllustration, type IllustrationKey } from "./illustrations";

export type CategoryKey =
  | "Tata Bahasa"
  | "Sastra"
  | "Jenis Teks"
  | "Fungsional"
  | "Lainnya";

/** Resolve IconKey string to Lucide component. */
const ICON_MAP: Record<string, LucideIcon> = {
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
  "zap": Zap,
  "lightbulb": Lightbulb,
  "target": Target,
  "puzzle": Puzzle,
  "brain": Brain,
  "message-circle": MessageCircle,
};

export function resolveIcon(key?: string): LucideIcon {
  return key ? (ICON_MAP[key] ?? Feather) : Feather;
}

/** Token visual per kategori — single source of truth. */
export interface CategoryVisual {
  key: CategoryKey;
  coverBg: string;
  accentText: string;
  accentBar: string;
  softBg: string;
  softText: string;
  icon: LucideIcon;
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
    icon: Shapes,
    subtitle: "Tema di luar kategori utama.",
  },
};

export function categoryVisual(key: string): CategoryVisual {
  return CATEGORY_VISUALS[key as CategoryKey] ?? CATEGORY_VISUALS["Lainnya"];
}

/**
 * ThemeCoverArt — canonical rendering path.
 * ALWAYS renders: solid category bg + illustration OR icon.
 * NEVER: white, empty, pattern, gradient, watermark.
 */
export function ThemeCoverArt({
  visual,
  name,
  iconKey,
  illustrationKey,
  className = "",
}: {
  visual: CategoryVisual;
  name: string;
  iconKey?: string;
  illustrationKey?: string;
  className?: string;
}) {
  const Icon = resolveIcon(iconKey ?? undefined);
  const Illustration = illustrationKey
    ? resolveIllustration(illustrationKey as IllustrationKey)
    : null;

  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden ${visual.coverBg} ${className}`}
    >
      {Illustration ? (
        <Illustration className="absolute inset-0 w-full h-full text-white/20 p-3" />
      ) : (
        <span className="absolute bottom-2 right-2.5 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <Icon size={16} className="text-white/50" />
        </span>
      )}
    </div>
  );
}
