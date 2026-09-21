// ─── Theme Visual Config (Bank Soal Discovery) ──────────────
// Data-driven visual configuration for themes and collections.
// Database remains source of truth for theme names and counts.
// This file controls PRESENTATION only.

import type { CategoryKey } from "./theme-cover";

/** Visual override for a specific theme (optional). */
export interface ThemeVisualOverride {
  /** Emoji shown on featured cards. */
  emoji?: string;
  /** Whether to feature this theme prominently. */
  featured?: boolean;
  /** Short editorial tagline. */
  tagline?: string;
}

/** A presentation-only collection of themes. */
export interface ThemeCollection {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Category filter — themes matching this category are included. */
  category?: CategoryKey;
  /** Explicit theme name overrides — if set, only these themes are in the collection. */
  themeNames?: string[];
  /** Gradient for the collection hero card. */
  gradient: string;
  /** Accent color for text/badges. */
  accentText: string;
  accentBg: string;
}

// ─── Per-Theme Visual Overrides ──────────────────────────────
// Only themes that need special treatment are listed here.
// Unlisted themes use default procedural rendering.

export const THEME_VISUALS: Record<string, ThemeVisualOverride> = {
  // Featured literary themes (GB4 Tokoh Sastra)
  "Chairil Anwar":    { emoji: "✒️", featured: true, tagline: "Penyair Angkatan '45" },
  "Pramoedya":        { emoji: "📚", featured: true, tagline: "Sastrawan besar Indonesia" },
  "Hamka":            { emoji: "🕌", featured: true, tagline: "Ulama dan sastrawan" },
  "Sapardi Djoko Damono": { emoji: "🌧️", featured: true, tagline: "Hujan Bulan Juni" },
  "W.S. Rendra":      { emoji: "🎭", featured: true, tagline: "Penyair rakyat" },
  "Amir Hamzah":      { emoji: "🌙", featured: true, tagline: "Pujangga Baru" },
  "Armijn Pane":      { emoji: "📖", featured: true, tagline: "Angkatan Pujangga Baru" },
  "Taufiq Ismail":    { emoji: "✊", featured: true, tagline: "Angkatan '66" },
  "Tauchid Abdulrahman": { emoji: "📝", featured: true, tagline: "Sastra modern" },
  "Asrul Sani":       { emoji: "🎬", featured: true, tagline: "Penyair dan sutradara" },

  // Popular Tata Bahasa
  "SPOK":             { emoji: "🔤", tagline: "Struktur kalimat dasar" },
  "Kalimat Efektif":  { emoji: "✏️", tagline: "Kalimat yang tepat dan jelas" },
  "Paragraf":         { emoji: "📄", tagline: "Satuan ide dalam tulisan" },
  "Sinonim":          { emoji: "🔗", tagline: "Kata sepadan" },
  "Antonim":          { emoji: "⚡", tagline: "Kata berlawanan" },

  // Popular Sastra
  "Puisi":            { emoji: "🌹", tagline: "Ekresi perasaan dalam bait" },
  "Cerpen":           { emoji: "📕", tagline: "Cerita pendek penuh makna" },
  "Pantun":           { emoji: "🎤", tagline: "Puisi Melayu klasik" },
  "Drama":            { emoji: "🎭", tagline: "Pentas kata dan peran" },
  "Novel":            { emoji: "📗", tagline: "Cerita bersambung" },
  "Majas":            { emoji: "🎨", tagline: "Bahasa kiasan" },

  // Popular Jenis Teks
  "Teks Eksposisi":   { emoji: "📰", tagline: "Paparan ide dan argumen" },
  "Teks Narasi":      { emoji: "📖", tagline: "Cerita berurutan" },
  "Teks Prosedur":    { emoji: "📋", tagline: "Langkah-langkah" },
  "Teks Berita":      { emoji: "🗞️", tagline: "Fakta dan peristiwa" },
  "Artikel":          { emoji: "📰", tagline: "Tulisan informatif" },
  "Resensi":          { emoji: "⭐", tagline: "Ulasan buku/film" },

  // Fungsional
  "Pidato":           { emoji: "🎤", tagline: "Berbicara di depan umum" },
  "Surat Dinas":      { emoji: "✉️", tagline: "Surat resmi instansi" },
  "Proposal":         { emoji: "📊", tagline: "Rencana terstruktur" },
};

export function getThemeVisual(name: string): ThemeVisualOverride {
  return THEME_VISUALS[name] ?? {};
}

// ─── Collections ─────────────────────────────────────────────
// Presentation-only groupings. No database mutation.

export const COLLECTIONS: ThemeCollection[] = [
  {
    id: "tokoh-sastra",
    title: "Tokoh Sastra Indonesia",
    description: "Kenali 10 sastrawan besar Indonesia dan karya-karyanya.",
    emoji: "📚",
    themeNames: [
      "Chairil Anwar", "Pramoedya", "Hamka", "Sapardi Djoko Damono",
      "W.S. Rendra", "Amir Hamzah", "Armijn Pane", "Taufiq Ismail",
      "Tauchid Abdulrahman", "Asrul Sani",
    ],
    gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
    accentText: "text-violet-100",
    accentBg: "bg-violet-500/20",
  },
  {
    id: "dasar-bahasa",
    title: "Dasar-Dasar Bahasa",
    description: "Kuasai SPOK, ejaan, dan kalimat efektif.",
    emoji: "🔤",
    themeNames: ["SPOK", "Kalimat Efektif", "Ejaan", "Tanda Baca", "PUEBI", "Paragraf"],
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    accentText: "text-emerald-100",
    accentBg: "bg-emerald-500/20",
  },
  {
    id: "jenis-teks-lengkap",
    title: "Jenis-Jenis Teks",
    description: "Dari narasi hingga eksposisi — kuasai semua jenis teks.",
    emoji: "📝",
    category: "Jenis Teks",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    accentText: "text-blue-100",
    accentBg: "bg-blue-500/20",
  },
];

export function getCollectionThemes(
  collection: ThemeCollection,
  allThemeNames: string[],
): string[] {
  if (collection.themeNames) return collection.themeNames;
  // If category-based, we'd need category matching — for now return empty
  // (the shelf section handles category display).
  return [];
}
