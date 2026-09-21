// ─── Theme Visual Config (Bank Soal Discovery) ──────────────
// Data-driven visual configuration for themes and collections.
// Database remains source of truth for theme names and counts.
// This file controls PRESENTATION only.
//
// Icons use Lucide React string keys — resolved at render time.
// NO emoji. NO gradient. Solid category colors only.

import type { CategoryKey } from "./theme-cover";
import type { IllustrationKey } from "./illustrations";

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
  /** Illustration key for cover art. */
  illustration?: IllustrationKey;
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
  // Literary figures (GB4 Tokoh Sastra) — literary illustration
  "Chairil Anwar":        { icon: "pen-line", illustration: "literary", featured: true, tagline: "Penyair Angkatan '45" },
  "Pramoedya":            { icon: "book-open", illustration: "literary", featured: true, tagline: "Sastrawan besar Indonesia" },
  "Hamka":                { icon: "book-text", illustration: "literary", featured: true, tagline: "Ulama dan sastrawan" },
  "Sapardi Djoko Damono": { icon: "feather", illustration: "literary", featured: true, tagline: "Hujan Bulan Juni" },
  "W.S. Rendra":          { icon: "theater", illustration: "literary", featured: true, tagline: "Penyair rakyat" },
  "Amir Hamzah":          { icon: "scroll-text", illustration: "literary", featured: true, tagline: "Pujangga Baru" },
  "Armijn Pane":          { icon: "library", illustration: "literary", featured: true, tagline: "Angkatan Pujangga Baru" },
  "Taufiq Ismail":        { icon: "pen-line", illustration: "literary", featured: true, tagline: "Angkatan '66" },
  "Tauchid Abdulrahman":  { icon: "feather", illustration: "literary", featured: true, tagline: "Sastra modern" },
  "Asrul Sani":           { icon: "pen-line", illustration: "literary", featured: true, tagline: "Penyair dan sutradara" },

  // Tata Bahasa — writing / structure / language / contrast
  "SPOK":             { icon: "spell-check", illustration: "structure", tagline: "Struktur kalimat dasar" },
  "Kalimat Efektif":  { icon: "pen-line", illustration: "structure", tagline: "Kalimat yang tepat dan jelas" },
  "Paragraf":         { icon: "file-text", illustration: "document", tagline: "Satuan ide dalam tulisan" },
  "Sinonim":          { icon: "shapes", illustration: "contrast", tagline: "Kata sepadan" },
  "Antonim":          { icon: "shapes", illustration: "contrast", tagline: "Kata berlawanan" },
  "Ejaan":            { icon: "languages", illustration: "writing", tagline: "Ejaan yang benar" },
  "Tanda Baca":       { icon: "pen-line", illustration: "writing", tagline: "Tanda baca tepat" },
  "PUEBI":            { icon: "book-text", illustration: "language", tagline: "Pedoman umum ejaan" },
  "Kata Baku":        { icon: "book-text", illustration: "language", tagline: "Kata baku Indonesia" },
  "Kata Tidak Baku":  { icon: "book-text", illustration: "language", tagline: "Kata tidak baku" },
  "Makna Kata":       { icon: "book-open", illustration: "language", tagline: "Arti kata" },
  "Imbuhan":          { icon: "spell-check", illustration: "writing", tagline: "Awalan, akhiran, sisipan" },
  "Ide Pokok":        { icon: "file-text", illustration: "document", tagline: "Gagasan utama" },
  "Gagasan Utama":    { icon: "file-text", illustration: "document", tagline: "Ide pokok paragraf" },
  "Simpulan":         { icon: "file-text", illustration: "document", tagline: "Kesimpulan teks" },

  // Sastra — book / poetry / theater / story / quote
  "Puisi":            { icon: "feather", illustration: "poetry", tagline: "Ekspresi perasaan dalam bait" },
  "Cerpen":           { icon: "book-open", illustration: "book", tagline: "Cerita pendek penuh makna" },
  "Pantun":           { icon: "quote", illustration: "quote-deco", tagline: "Puisi Melayu klasik" },
  "Drama":            { icon: "theater", illustration: "theater", tagline: "Pentas kata dan peran" },
  "Novel":            { icon: "book-open", illustration: "book", tagline: "Cerita bersambung" },
  "Majas":            { icon: "sparkles", illustration: "quote-deco", tagline: "Bahasa kiasan" },
  "Fabel":            { icon: "book-open", illustration: "book", tagline: "Cerita bergambar" },
  "Legenda":          { icon: "scroll-text", illustration: "story", tagline: "Cerita rakyat" },
  "Hikayat":          { icon: "library", illustration: "story", tagline: "Sastra klasik Melayu" },
  "Syair":            { icon: "feather", illustration: "poetry", tagline: "Puisi empat seuntai" },
  "Gurindam":         { icon: "quote", illustration: "poetry", tagline: "Puisi dua baris" },
  "Mitos":            { icon: "scroll-text", illustration: "story", tagline: "Cerita kepercayaan" },
  "Cerita Inspiratif": { icon: "book-open", illustration: "story", tagline: "Kisah inspiratif" },
  "Anekdot":          { icon: "quote", illustration: "story", tagline: "Cerita lucu bermakna" },

  // Jenis Teks — document / newspaper / process / writing
  "Teks Eksposisi":   { icon: "file-text", illustration: "document", tagline: "Paparan ide dan argumen" },
  "Teks Narasi":      { icon: "book-open", illustration: "book", tagline: "Cerita berurutan" },
  "Teks Prosedur":    { icon: "clipboard-list", illustration: "process", tagline: "Langkah-langkah" },
  "Teks Berita":      { icon: "newspaper", illustration: "newspaper", tagline: "Fakta dan peristiwa" },
  "Artikel":          { icon: "newspaper", illustration: "newspaper", tagline: "Tulisan informatif" },
  "Resensi":          { icon: "book-open", illustration: "book", tagline: "Ulasan buku/film" },
  "Teks Eksplanasi":  { icon: "file-text", illustration: "process", tagline: "Penjelasan proses" },
  "Teks Deskripsi":   { icon: "file-text", illustration: "document", tagline: "Menggambarkan objek" },
  "Teks Persuasi":    { icon: "megaphone", illustration: "newspaper", tagline: "Meyakinkan pembaca" },
  "Teks Argumentasi": { icon: "file-text", illustration: "document", tagline: "Pendapat dan bukti" },
  "Teks Ulasan":      { icon: "book-open", illustration: "book", tagline: "Ulasan karya" },
  "Editorial":        { icon: "newspaper", illustration: "newspaper", tagline: "Opini redaksi" },

  // Fungsional — speech / letter / process / frame
  "Pidato":       { icon: "mic", illustration: "speech", tagline: "Berbicara di depan umum" },
  "Surat Dinas":  { icon: "mail", illustration: "letter", tagline: "Surat resmi instansi" },
  "Proposal":     { icon: "bar-chart-3", illustration: "process", tagline: "Rencana terstruktur" },
  "Surat Pribadi": { icon: "mail", illustration: "letter", tagline: "Surat pribadi" },
  "Poster":       { icon: "frame", illustration: "document", tagline: "Desain visual informatif" },
  "Iklan":        { icon: "megaphone", illustration: "newspaper", tagline: "Pesan promosi" },
  "Slogan":       { icon: "quote", illustration: "quote-deco", tagline: "Tagline bermakna" },
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
