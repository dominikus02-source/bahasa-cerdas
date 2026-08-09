/**
 * XP SOURCE TRANSPARENCY — kelompok aktivitas (BELAJAR / BERMAIN / BERKARYA /
 * KONSISTENSI) yang menjelaskan DARI MANA XP minggu ini berasal, tanpa
 * mengubah nilai XP itu sendiri (hanya agregasi read-only dari XPTransaction,
 * tabel append-only yang tidak pernah di-reset).
 *
 * Mapping ini bertahan terhadap sumber XP baru: sumber yang belum dikenal
 * jatuh ke LAINNYA (tetap terhitung di total, tidak menghilang).
 */
import { db } from "@/lib/db";
import { weekRange, weekKey } from "@/lib/gamification/season";

export type XpGroupKey = "BELAJAR" | "BERMAIN" | "BERKARYA" | "KONSISTENSI";

export interface XpGroupDef {
  key: XpGroupKey;
  label: string;
  icon: string;
  description: string;
  sources: string[];
}

export const XP_GROUPS: XpGroupDef[] = [
  {
    key: "BELAJAR",
    label: "Belajar",
    icon: "📚",
    description: "Jalur Cerdas, UKBI, TKA, tugas, kompetensi",
    sources: ["JALUR_CERDAS", "UKBI", "TKA", "KOMPETENSI", "SIMULASI", "PENUGASAN", "PENUGASAN_GURU", "BELAJAR"],
  },
  {
    key: "BERMAIN",
    label: "Bermain",
    icon: "🎮",
    description: "Game arena & tantangan",
    sources: ["GAME", "ARENA", "KATASTRA", "MENARA", "TANTANG", "QUIZ", "CHALLENGE", "EVENT"],
  },
  {
    key: "BERKARYA",
    label: "Berkarya",
    icon: "✍️",
    description: "Terbitkan karya & dapat apresiasi",
    sources: ["KARYA_SISWA", "UPLOAD_KARYA", "ARTIKEL", "FEATURED", "LIKE", "KOMENTAR"],
  },
  {
    key: "KONSISTENSI",
    label: "Konsistensi",
    icon: "🔥",
    description: "Misi harian, streak, lencana, podium",
    sources: ["DAILY_QUEST", "WEEKLY_QUEST", "STREAK", "ACHIEVEMENT", "BADGE", "PODIUM", "KOTAK_HARIAN"],
  },
];

/** Kunci group untuk sebuah sumber XP (toleran: sumber baru → LAINNYA). */
export function xpGroupOfSource(source: string): XpGroupKey | "LAINNYA" {
  for (const g of XP_GROUPS) {
    if (g.sources.includes(source)) return g.key;
  }
  return "LAINNYA";
}

export interface XpBreakdownGroup {
  key: XpGroupKey | "LAINNYA";
  label: string;
  icon: string;
  xp: number;
  count: number;
  share: number; // 0..100
}

export interface XpTransparency {
  totalXp: number;
  groups: XpBreakdownGroup[];
}

/**
 * Rincian XP minggu berjalan per kelompok (dari XPTransaction, bukan field
 * weeklyXP yang bisa lazy-reset) — angka ini SELALU konsisten dengan apa yang
 * tampil di leaderboard mingguan.
 */
export async function getWeeklyXpBreakdown(userId: string): Promise<XpTransparency> {
  const range = weekRange(weekKey());
  const rows = await db.xPTransaction.groupBy({
    by: ["source"],
    where: { userId, createdAt: { gte: range.startsAt, lte: range.endsAt } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const byGroup = new Map<string, XpBreakdownGroup>();
  let total = 0;
  for (const row of rows) {
    const amount = row._sum.amount ?? 0;
    total += amount;
    const key = xpGroupOfSource(row.source);
    const g = byGroup.get(key) ?? {
      key,
      label: key === "LAINNYA" ? "Lainnya" : XP_GROUPS.find((x) => x.key === key)!.label,
      icon: key === "LAINNYA" ? "✨" : XP_GROUPS.find((x) => x.key === key)!.icon,
      xp: 0,
      count: 0,
      share: 0,
    };
    g.xp += amount;
    g.count += row._count._all;
    byGroup.set(key, g);
  }

  const groups = [...byGroup.values()]
    .map((g) => ({ ...g, share: total > 0 ? Math.round((g.xp / total) * 100) : 0 }))
    .sort((a, b) => b.xp - a.xp);

  // Urutkan mengikuti definisi XP_GROUPS (BELAJAR, BERMAIN, BERKARYA,
  // KONSISTENSI, LAINNYA) agar UI stabil.
  const ordered = [...XP_GROUPS.map((g) => g.key), "LAINNYA"];
  groups.sort((a, b) => ordered.indexOf(a.key) - ordered.indexOf(b.key));

  return { totalXp: total, groups };
}
