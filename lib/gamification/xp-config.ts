/**
 * XP CONFIG — Konfigurasi terpusat nilai XP BahasaCerdas (Sumber Kebenaran).
 *
 * Semua XP berasal dari aktivitas BC dan nilainya dibuat CONFIGURABLE di satu
 * tempat ini — bukan hardcode tersebar. Fitur memakai getXpConfig(source)
 * (atau konstanta langsung) sehingga perubahan nilai cukup di sini.
 *
 * Nilai default mengikuti aktivitas eksisting; API /player/xp menerima amount
 * eksplisit, jadi nilai di sini adalah "tabel acuan" resmi per sumber.
 */

/** Sumber XP aktivitas BC (tidak termasuk source ledger internal). */
export type XpSourceName =
  | "ARENA"
  | "JALUR_CERDAS"
  | "UPLOAD_KARYA"
  | "LIKE"
  | "KOMENTAR"
  | "ARTIKEL"
  | "PENUGASAN_GURU"
  | "UKBI"
  | "TKA"
  | "DAILY_QUEST"
  | "WEEKLY_QUEST"
  | "ACHIEVEMENT"
  | "BADGE"
  | "CHALLENGE"
  | "EVENT";

export interface XpSourceConfig {
  /** Label Bahasa Indonesia untuk UI. */
  label: string;
  /** XP dasar sekali aktivitas. */
  baseXp: number;
  /** Peristiwa/aktivitas pendukung (xp × kuantitas). */
  description: string;
}

export const XP_CONFIG: Record<XpSourceName, XpSourceConfig> = {
  ARENA:           { label: "Arena",           baseXp: 20,  description: "Main game arena (Kuis Battle, Adu Cepat, dll.)" },
  JALUR_CERDAS:    { label: "Jalur Cerdas",    baseXp: 50,  description: "Selesaikan unit Jalur Cerdas (reward sesuai unit)" },
  UPLOAD_KARYA:    { label: "Upload Karya",    baseXp: 20,  description: "Terbitkan karya (puisi, cerpen, artikel, dst.)" },
  LIKE:            { label: "Like",            baseXp: 2,   description: "Menyukai karya pengguna lain" },
  KOMENTAR:        { label: "Komentar",        baseXp: 5,   description: "Memberi komentar pada karya" },
  ARTIKEL:         { label: "Artikel",         baseXp: 15,  description: "Membaca artikel di platform" },
  PENUGASAN_GURU:  { label: "Penugasan Guru",  baseXp: 30,  description: "Menyelesaikan tugas dari guru" },
  UKBI:            { label: "UKBI",            baseXp: 50,  description: "Simulasi UKBI selesai" },
  TKA:             { label: "TKA",             baseXp: 50,  description: "Simulasi TKA selesai" },
  DAILY_QUEST:     { label: "Misi Harian",     baseXp: 10,  description: "Selesaikan misi harian" },
  WEEKLY_QUEST:    { label: "Misi Mingguan",   baseXp: 100, description: "Selesaikan tantangan mingguan" },
  ACHIEVEMENT:     { label: "Pencapaian",      baseXp: 50,  description: "Klaim reward achievement" },
  BADGE:           { label: "Badge",           baseXp: 25,  description: "Buka badge baru" },
  CHALLENGE:       { label: "Tantangan",       baseXp: 75,  description: "Selesaikan challenge/event" },
  EVENT:           { label: "Event",           baseXp: 100, description: "Partisipasi event khusus" },
};

/** Ambil konfigurasi XP sebuah sumber. */
export function getXpConfig(source: XpSourceName): XpSourceConfig {
  return XP_CONFIG[source];
}

/** Ambil nilai XP default sebuah sumber. */
export function getXpValue(source: XpSourceName): number {
  return XP_CONFIG[source]?.baseXp ?? 0;
}

/** Daftar sumber XP dengan label (untuk dropdown/UI admin). */
export const XP_SOURCE_OPTIONS = Object.entries(XP_CONFIG).map(([key, cfg]) => ({
  source: key as XpSourceName,
  label: cfg.label,
  baseXp: cfg.baseXp,
}));
