import { XP_SOURCES } from "@/lib/gamification/xp-engine";

/** Label Bahasa Indonesia per sumber XP (dipakai API + UI). */
export const XP_SOURCE_LABELS: Record<string, string> = {
  JALUR_CERDAS: "Jalur Cerdas",
  ARENA: "Arena",
  KARYA_SISWA: "Karya Siswa",
  ARTIKEL: "Artikel",
  UKBI: "UKBI",
  TKA: "TKA",
  PENUGASAN: "Penugasan",
  AI: "Alat AI",
  GAME: "Game",
  KATASTRA: "Katastra",
  MENARA: "Menara",
  KOMPETENSI: "Kompetensi",
  SIMULASI: "Simulasi",
  DAILY_QUEST: "Misi Harian",
  BADGE: "Badge",
  ACHIEVEMENT: "Pencapaian",
  SYSTEM: "Sistem",
};

export { XP_SOURCES };

/** Ikon per sumber XP. */
export const XP_SOURCE_ICONS: Record<string, string> = {
  JALUR_CERDAS: "🧭",
  ARENA: "⚔️",
  KARYA_SISWA: "✍️",
  ARTIKEL: "📰",
  UKBI: "📚",
  TKA: "🎯",
  PENUGASAN: "📋",
  AI: "🤖",
  GAME: "🎮",
  KATASTRA: "🗝️",
  MENARA: "🗼",
  KOMPETENSI: "🏁",
  SIMULASI: "🧪",
  DAILY_QUEST: "✅",
  BADGE: "🏅",
  ACHIEVEMENT: "🏆",
  SYSTEM: "⚙️",
};
