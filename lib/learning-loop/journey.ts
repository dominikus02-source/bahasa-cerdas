import { db } from "@/lib/db";
import type { ActivityType, LearningJourney } from "@prisma/client";

/** Offset WIB (UTC+7) dalam milidetik. */
const WIB_OFFSET_MS = 7 * 3600 * 1000;

/**
 * Kunci hari "YYYY-MM-DD" dalam zona WIB (UTC+7).
 *
 * Dipakai sebagai key per-hari di LearningJourney & LearningInsight supaya
 * "hari ini" selalu konsisten di semua zona server.
 */
export function dayKeyWIB(d?: Date): string {
  const date = d ?? new Date();
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Tambah satu entri ke timeline "Perjalanan Belajar" (LearningJourney).
 *
 * Entri dikelompokkan per hari (dayKey WIB) dan ditampilkan kronologis
 * menurun di halaman perjalanan belajar.
 */
export async function addJourneyEntry(
  userId: string,
  entry: { type: ActivityType; title: string; description?: string; icon?: string; meta?: Record<string, unknown> },
): Promise<void> {
  await db.learningJourney.create({
    data: {
      userId,
      dayKey: dayKeyWIB(),
      type: entry.type,
      title: entry.title,
      description: entry.description ?? null,
      icon: entry.icon ?? null,
      meta: entry.meta ? JSON.parse(JSON.stringify(entry.meta)) : undefined,
    },
  });
}

/**
 * Ambil timeline belajar user (terbaru dulu).
 *
 * @param limit Jumlah entri maksimal (default 20).
 */
export async function getJourney(userId: string, limit = 20): Promise<LearningJourney[]> {
  return db.learningJourney.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
