// ─── Theme Visual Config (Bank Soal Discovery) ──────────────
// Data-driven visual configuration for themes and collections.
// Database remains source of truth for theme names and counts.
// This file controls PRESENTATION only.
//
// Icons use Lucide React string keys — resolved at render time.
// NO emoji. NO gradient. Solid category colors only.

import type { CategoryKey } from "./theme-cover";

/** Lucide icon name keys used in theme-config. Resolved at render. */
export type IconKey =
  | "feather" | "book-open" | "book-text" | "pen-line" | "scroll-text"
  | "newspaper" | "megaphone" | "shapes" | "spell-check" | "languages"
  | "file-text" | "mic" | "mail" | "bar-chart-3" | "library"
  | "clipboard-list" | "circle-help" | "quote" | "bookmark"
  | "theater" | "music" | "frame" | "pen-tool" | "globe"
  | "sparkles" | "graduation-cap" | "compass";

/** Visual override for a specific theme (optional). */
export interface ThemeVisualOverride {
  /** Lucide icon key for this theme. */
  icon?: IconKey;
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
  icon: IconKey;
  /** Category filter — themes matching this category are included. */
  category?: CategoryKey;
  /** Explicit theme name overrides — if set, only these themes are in the collection. */
  themeNames?: string[];
  /** Solid background color (Tailwind class). */
  bg: string;
  /** Accent color for text/badges on the solid bg. */
  accentText: string;
  accentBg: string;
  /** Whether this is the hero/featured collection (strongest visual). */
  featured?: boolean;
}

// ─── Per-Theme Visual Overrides ──────────────────────────────
// Only themes that need special treatment are listed here.
// Unlisted themes use default procedural rendering from theme-cover.

export const THEME_VISUALS: Record<string, ThemeVisualOverride> = {
  // Literary figures (GB4 Tokoh Sastra)
  "Chairil Anwar":        { icon: "pen-line", featured: true, tagline: "Penyair Angkatan '45" },
  "Pramoedya":            { icon: "book-open", featured: true, tagline: "Sastrawan besar Indonesia" },
  "Hamka":                { icon: "book-text", featured: true, tagline: "Ulama dan sastrawan" },
  "Sapardi Djoko Damono": { icon: "feather", featured: true, tagline: "Hujan Bulan Juni" },
  "W.S. Rendra":          { icon: "theater", featured: true, tagline: "Penyair rakyat" },
  "Amir Hamzah":          { icon: "scroll-text", featured: true, tagline: "Pujangga Baru" },
  "Armijn Pane":          { icon: "library", featured: true, tagline: "Angkatan Pujangga Baru" },
  "Taufiq Ismail":        { icon: "pen-line", featured: true, tagline: "Angkatan '66" },
  "Tauchid Abdulrahman":  { icon: "feather", featured: true, tagline: "Sastra modern" },
  "Asrul Sani":           { icon: "pen-line", featured: true, tagline: "Penyair dan sutradara" },

  // Tata Bahasa
  "SPOK":             { icon: "spell-check", tagline: "Struktur kalimat dasar" },
  "Kalimat Efektif":  { icon: "pen-line", tagline: "Kalimat yang tepat dan jelas" },
  "Paragraf":         { icon: "file-text", tagline: "Satuan ide dalam tulisan" },
  "Sinonim":          { icon: "shapes", tagline: "Kata sepadan" },
  "Antonim":          { icon: "shapes", tagline: "Kata berlawanan" },
  "Ejaan":            { icon: "languages", tagline: "Ejaan yang benar" },
  "Tanda Baca":       { icon: "pen-line", tagline: "Tanda baca tepat" },
  "PUEBI":            { icon: "book-text", tagline: "Pedoman umum ejaan" },

  // Sastra
  "Puisi":    { icon: "feather", tagline: "Ekspresi perasaan dalam bait" },
  "Cerpen":   { icon: "book-open", tagline: "Cerita pendek penuh makna" },
  "Pantun":   { icon: "quote", tagline: "Puisi Melayu klasik" },
  "Drama":    { icon: "theater", tagline: "Pentas kata dan peran" },
  "Novel":    { icon: "book-open", tagline: "Cerita bersambung" },
  "Majas":    { icon: "sparkles", tagline: "Bahasa kiasan" },
  "Fabel":    { icon: "book-open", tagline: "Cerita bergambar" },
  "Legenda":  { icon: "scroll-text", tagline: "Cerita rakyat" },
  "Hikayat":  { icon: "library", tagline: "Sastra klasik Melayu" },

  // Jenis Teks
  "Teks Eksposisi":   { icon: "file-text", tagline: "Paparan ide dan argumen" },
  "Teks Narasi":      { icon: "book-open", tagline: "Cerita berurutan" },
  "Teks Prosedur":    { icon: "clipboard-list", tagline: "Langkah-langkah" },
  "Teks Berita":      { icon: "newspaper", tagline: "Fakta dan peristiwa" },
  "Artikel":          { icon: "newspaper", tagline: "Tulisan informatif" },
  "Resensi":          { icon: "book-open", tagline: "Ulasan buku/film" },
  "Teks Eksplanasi":  { icon: "file-text", tagline: "Penjelasan proses" },
  "Teks Deskripsi":   { icon: "file-text", tagline: "Menggambarkan objek" },
  "Teks Persuasi":    { icon: "megaphone", tagline: "Meyakinkan pembaca" },
  "Teks Argumentasi": { icon: "file-text", tagline: "Pendapat dan bukti" },
  "Editorial":        { icon: "newspaper", tagline: "Opini redaksi" },

  // Fungsional
  "Pidato":       { icon: "mic", tagline: "Berbicara di depan umum" },
  "Surat Dinas":  { icon: "mail", tagline: "Surat resmi instansi" },
  "Proposal":     { icon: "bar-chart-3", tagline: "Rencana terstruktur" },
  "Surat Pribadi": { icon: "mail", tagline: "Surat pribadi" },
  "Poster":       { icon: "frame", tagline: "Desain visual informatif" },
  "Iklan":        { icon: "megaphone", tagline: "Pesan promosi" },
  "Slogan":       { icon: "quote", tagline: "Tagline bermakna" },
};

export function getThemeVisual(name: string): ThemeVisualOverride {
  return THEME_VISUALS[name] ?? {};
}

// ─── Collections ─────────────────────────────────────────────
// Presentation-only groupings. No database mutation.
// VISUAL HIERARCHY: Tokoh Sastra (featured) > Dasar Bahasa > Jenis Teks.

export const COLLECTIONS: ThemeCollection[] = [
  {
    id: "tokoh-sastra",
    title: "Tokoh Sastra Indonesia",
    description: "Kenali 10 sastrawan besar Indonesia dan karya-karyanya.",
    icon: "library",
    themeNames: [
      "Chairil Anwar", "Pramoedya", "Hamka", "Sapardi Djoko Damono",
      "W.S. Rendra", "Amir Hamzah", "Armijn Pane", "Taufiq Ismail",
      "Tauchid Abdulrahman", "Asrul Sani",
    ],
    bg: "bg-violet-600",
    accentText: "text-violet-100",
    accentBg: "bg-white/15",
    featured: true,
  },
  {
    id: "dasar-bahasa",
    title: "Dasar-Dasar Bahasa",
    description: "Kuasai SPOK, ejaan, dan kalimat efektif.",
    icon: "spell-check",
    themeNames: ["SPOK", "Kalimat Efektif", "Ejaan", "Tanda Baca", "PUEBI", "Paragraf"],
    bg: "bg-emerald-600",
    accentText: "text-emerald-100",
    accentBg: "bg-white/15",
  },
  {
    id: "jenis-teks-lengkap",
    title: "Jenis-Jenis Teks",
    description: "Dari narasi hingga eksposisi — kuasai semua jenis teks.",
    icon: "file-text",
    category: "Jenis Teks",
    bg: "bg-blue-600",
    accentText: "text-blue-100",
    accentBg: "bg-white/15",
  },
];

export function getCollectionThemes(
  collection: ThemeCollection,
  allThemeNames: string[],
): string[] {
  if (collection.themeNames) return collection.themeNames;
  return [];
}
