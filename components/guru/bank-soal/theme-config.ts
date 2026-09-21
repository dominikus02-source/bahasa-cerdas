// ─── Theme Visual Config (Bank Soal Discovery) ──────────────
// Canonical visual configuration for ALL themes.
// Database remains source of truth for theme names and counts.
// This file controls PRESENTATION only.
//
// 77/77 themes MUST have a visual entry (illustration or fallback).
// Icons use Lucide React string keys — resolved at render time.

import type { CategoryKey } from "./theme-cover";
import type { IllustrationKey } from "./illustrations";

export type IconKey =
  | "feather" | "book-open" | "book-text" | "pen-line" | "scroll-text"
  | "newspaper" | "megaphone" | "shapes" | "spell-check" | "languages"
  | "file-text" | "mic" | "mail" | "bar-chart-3" | "library"
  | "clipboard-list" | "circle-help" | "quote" | "bookmark"
  | "theater" | "music" | "frame" | "pen-tool" | "globe"
  | "sparkles" | "graduation-cap" | "compass" | "zap"
  | "lightbulb" | "target" | "puzzle" | "brain" | "message-circle";

export interface ThemeVisualOverride {
  icon?: IconKey;
  illustration?: IllustrationKey;
  featured?: boolean;
  tagline?: string;
}

export interface ThemeCollection {
  id: string;
  title: string;
  description: string;
  icon: IconKey;
  category?: CategoryKey;
  themeNames?: string[];
  bg: string;
  accentText: string;
  accentBg: string;
  featured?: boolean;
}

// ─── Canonical Theme Visuals — ALL 77 THEMES ────────────────
// Every theme that exists in the database MUST be listed here.
// If a theme is missing from here, it will get NO visual header.

export const THEME_VISUALS: Record<string, ThemeVisualOverride> = {
  // ── GB4 Tokoh Sastra (10) — literary illustration ──────────
  "Chairil Anwar":          { icon: "pen-line", illustration: "literary", featured: true, tagline: "Penyair Angkatan '45" },
  "Pramoedya Ananta Toer":  { icon: "book-open", illustration: "literary", featured: true, tagline: "Sastrawan besar Indonesia" },
  "Hamka":                  { icon: "book-text", illustration: "literary", featured: true, tagline: "Ulama dan sastrawan" },
  "Sapardi Djoko Damono":   { icon: "feather", illustration: "literary", featured: true, tagline: "Hujan Bulan Juni" },
  "W.S. Rendra":            { icon: "theater", illustration: "literary", featured: true, tagline: "Penyair rakyat" },
  "Amir Hamzah":            { icon: "scroll-text", illustration: "literary", featured: true, tagline: "Pujangga Baru" },
  "Armijn Pane":            { icon: "library", illustration: "literary", featured: true, tagline: "Angkatan Pujangga Baru" },
  "Taufiq Ismail":          { icon: "pen-line", illustration: "literary", featured: true, tagline: "Angkatan '66" },
  "Sutan Takdir Alisjahbana": { icon: "book-open", illustration: "literary", featured: true, tagline: "Pujangga Baru" },
  "Marah Rusli":            { icon: "feather", illustration: "literary", featured: true, tagline: "Sastrawan Minang" },

  // ── Tata Bahasa (18) — writing / structure / language ──────
  "SPOK":                   { icon: "spell-check", illustration: "structure", tagline: "Struktur kalimat dasar" },
  "Kalimat Efektif":        { icon: "pen-line", illustration: "structure", tagline: "Kalimat yang tepat dan jelas" },
  "Kalimat":                { icon: "pen-line", illustration: "structure", tagline: "Struktur kalimat" },
  "Paragraf":               { icon: "file-text", illustration: "document", tagline: "Satuan ide dalam tulisan" },
  "Sinonim":                { icon: "shapes", illustration: "contrast", tagline: "Kata sepadan" },
  "Antonim":                { icon: "shapes", illustration: "contrast", tagline: "Kata berlawanan" },
  "Ejaan":                  { icon: "languages", illustration: "writing", tagline: "Ejaan yang benar" },
  "Tanda Baca":             { icon: "pen-line", illustration: "writing", tagline: "Tanda baca tepat" },
  "PUEBI":                  { icon: "book-text", illustration: "language", tagline: "Pedoman umum ejaan" },
  "Kata Baku":              { icon: "book-text", illustration: "language", tagline: "Kata baku Indonesia" },
  "Kata Tidak Baku":        { icon: "book-text", illustration: "language", tagline: "Kata tidak baku" },
  "Makna Kata":             { icon: "book-open", illustration: "language", tagline: "Arti kata" },
  "Imbuhan":                { icon: "spell-check", illustration: "writing", tagline: "Awalan, akhiran, sisipan" },
  "Ide Pokok":              { icon: "file-text", illustration: "document", tagline: "Gagasan utama" },
  "Gagasan Utama":          { icon: "file-text", illustration: "document", tagline: "Ide pokok paragraf" },
  "Simpulan":               { icon: "file-text", illustration: "document", tagline: "Kesimpulan teks" },
  "Peribahasa dan Ungkapan": { icon: "quote", illustration: "quote-deco", tagline: "Peribahasa dan ungkapan" },
  "Fakta dan Opini":        { icon: "file-text", illustration: "document", tagline: "Fakta vs opini" },

  // ── Sastra (15) — book / poetry / theater / story ──────────
  "Puisi":                  { icon: "feather", illustration: "poetry", tagline: "Ekspresi perasaan dalam bait" },
  "Cerpen":                 { icon: "book-open", illustration: "book", tagline: "Cerita pendek penuh makna" },
  "Pantun":                 { icon: "quote", illustration: "quote-deco", tagline: "Puisi Melayu klasik" },
  "Drama":                  { icon: "theater", illustration: "theater", tagline: "Pentas kata dan peran" },
  "Novel":                  { icon: "book-open", illustration: "book", tagline: "Cerita bersambung" },
  "Majas":                  { icon: "sparkles", illustration: "quote-deco", tagline: "Bahasa kiasan" },
  "Fabel":                  { icon: "book-open", illustration: "book", tagline: "Cerita bergambar" },
  "Legenda":                { icon: "scroll-text", illustration: "story", tagline: "Cerita rakyat" },
  "Hikayat":                { icon: "library", illustration: "story", tagline: "Sastra klasik Melayu" },
  "Syair":                  { icon: "feather", illustration: "poetry", tagline: "Puisi empat seuntai" },
  "Gurindam":               { icon: "quote", illustration: "poetry", tagline: "Puisi dua baris" },
  "Mitos":                  { icon: "scroll-text", illustration: "story", tagline: "Cerita kepercayaan" },
  "Cerita Inspiratif":      { icon: "book-open", illustration: "story", tagline: "Kisah inspiratif" },
  "Anekdot":                { icon: "quote", illustration: "story", tagline: "Cerita lucu bermakna" },
  "Buku Fiksi dan Nonfiksi": { icon: "library", illustration: "book", tagline: "Fiksi dan nonfiksi" },

  // ── Jenis Teks (17) — document / newspaper / process ───────
  "Teks Eksposisi":         { icon: "file-text", illustration: "document", tagline: "Paparan ide dan argumen" },
  "Teks Narasi":            { icon: "book-open", illustration: "book", tagline: "Cerita berurutan" },
  "Teks Prosedur":          { icon: "clipboard-list", illustration: "process", tagline: "Langkah-langkah" },
  "Teks Berita":            { icon: "newspaper", illustration: "newspaper", tagline: "Fakta dan peristiwa" },
  "Artikel":                { icon: "newspaper", illustration: "newspaper", tagline: "Tulisan informatif" },
  "Resensi":                { icon: "book-open", illustration: "book", tagline: "Ulasan buku/film" },
  "Teks Eksplanasi":        { icon: "file-text", illustration: "process", tagline: "Penjelasan proses" },
  "Teks Deskripsi":         { icon: "file-text", illustration: "document", tagline: "Menggambarkan objek" },
  "Teks Persuasi":          { icon: "megaphone", illustration: "newspaper", tagline: "Meyakinkan pembaca" },
  "Teks Argumentasi":       { icon: "file-text", illustration: "document", tagline: "Pendapat dan bukti" },
  "Teks Ulasan":            { icon: "book-open", illustration: "book", tagline: "Ulasan karya" },
  "Editorial":              { icon: "newspaper", illustration: "newspaper", tagline: "Opini redaksi" },
  "Teks Biografi":          { icon: "book-open", illustration: "book", tagline: "Riwayat hidup" },
  "Teks Diskusi":           { icon: "file-text", illustration: "document", tagline: "Pembahasan multi-sisi" },
  "Teks Negosiasi":         { icon: "megaphone", illustration: "newspaper", tagline: "Teks perundingan" },
  "Teks Tanggapan Kritis":  { icon: "file-text", illustration: "document", tagline: "Tanggapan kritis" },
  "Laporan Hasil Observasi": { icon: "clipboard-list", illustration: "process", tagline: "Laporan pengamatan" },

  // ── Fungsional (7) — speech / letter / process ─────────────
  "Pidato":                 { icon: "mic", illustration: "speech", tagline: "Berbicara di depan umum" },
  "Surat Dinas":            { icon: "mail", illustration: "letter", tagline: "Surat resmi instansi" },
  "Proposal":               { icon: "bar-chart-3", illustration: "process", tagline: "Rencana terstruktur" },
  "Surat Pribadi":          { icon: "mail", illustration: "letter", tagline: "Surat pribadi" },
  "Poster":                 { icon: "frame", illustration: "document", tagline: "Desain visual informatif" },
  "Iklan":                  { icon: "megaphone", illustration: "newspaper", tagline: "Pesan promosi" },
  "Slogan":                 { icon: "quote", illustration: "quote-deco", tagline: "Tagline bermakna" },

  // ── GB3 Game/Activity Themes (22) — mapped to categories ───
  "Apa Maksudnya?":           { icon: "circle-help", illustration: "language", tagline: "Makna kata dan konteks" },
  "Baca Situasi":             { icon: "book-open", illustration: "document", tagline: "Pemahaman bacaan" },
  "Bahasa Sehari-hari":       { icon: "message-circle", illustration: "writing", tagline: "Bahasa dalam kehidupan" },
  "Benar atau Hampir Benar?": { icon: "spell-check", illustration: "contrast", tagline: "Cek kebenaran bahasa" },
  "Campur Cerdas":            { icon: "puzzle", illustration: "structure", tagline: "Campuran soal" },
  "Cepat Tepat Literasi":     { icon: "zap", illustration: "writing", tagline: "Kecepatan literasi" },
  "Detektif Teks":            { icon: "compass", illustration: "document", tagline: "Selidiki teks" },
  "Editor Cilik":             { icon: "pen-line", illustration: "writing", tagline: "Menyunting teks" },
  "Jelajah Nusantara":        { icon: "globe", illustration: "story", tagline: "Bahasa Nusantara" },
  "Kata dalam Konteks":       { icon: "book-text", illustration: "language", tagline: "Konteks makna" },
  "Kilas Balik Bahasa":       { icon: "scroll-text", illustration: "story", tagline: "Sejarah bahasa" },
  "Level Up Bahasa":          { icon: "graduation-cap", illustration: "structure", tagline: "Tingkatkan kemampuan" },
  "Misteri Kata":             { icon: "compass", illustration: "language", tagline: "Teka-teki kata" },
  "Pemburu Ide Pokok":        { icon: "target", illustration: "document", tagline: "Temukan ide pokok" },
  "Pilih Kalimat Terbaik":    { icon: "spell-check", illustration: "structure", tagline: "Kalimat efektif" },
  "Sambung Logika":           { icon: "puzzle", illustration: "process", tagline: "Logika bahasa" },
  "Simpulkan!":               { icon: "lightbulb", illustration: "document", tagline: "Buat simpulan" },
  "Susun Pikiran":            { icon: "shapes", illustration: "structure", tagline: "Organisasi ide" },
  "Tantangan Bahasa Hari Ini": { icon: "zap", illustration: "writing", tagline: "Tantangan harian" },
  "Tebak Novel dan Penulis Indonesia": { icon: "book-open", illustration: "book", tagline: "Kuis sastra" },
  "Tebak Sastrawan Indonesia": { icon: "feather", illustration: "literary", tagline: "Kuis tokoh sastra" },
  "Uji Nalar Bahasa":         { icon: "brain", illustration: "structure", tagline: "Nalar dan bahasa" },
};

// ─── Theme Visual Resolver ──────────────────────────────────
// Normalizes theme name for lookup (handles whitespace/case edge cases).

const NORMALIZE_RE = /\s+/g;

export function getThemeVisual(name: string): ThemeVisualOverride {
  // Direct match
  const direct = THEME_VISUALS[name];
  if (direct) return direct;
  // Normalized match (collapse whitespace)
  const normalized = name.replace(NORMALIZE_RE, " ").trim();
  if (normalized !== name) {
    const norm = THEME_VISUALS[normalized];
    if (norm) return norm;
  }
  return {};
}

// ─── Collections ─────────────────────────────────────────────

export const COLLECTIONS: ThemeCollection[] = [
  {
    id: "tokoh-sastra",
    title: "Tokoh Sastra Indonesia",
    description: "Kenali 10 sastrawan besar Indonesia dan karya-karyanya.",
    icon: "library",
    themeNames: [
      "Chairil Anwar", "Pramoedya Ananta Toer", "Hamka", "Sapardi Djoko Damono",
      "W.S. Rendra", "Amir Hamzah", "Armijn Pane", "Taufiq Ismail",
      "Sutan Takdir Alisjahbana", "Marah Rusli",
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
