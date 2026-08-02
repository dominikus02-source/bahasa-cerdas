import { db } from "@/lib/db";
import { dayKeyWIB } from "@/lib/learning-loop/journey";
import { skillLevelFromXp } from "@/lib/learning-loop/skills";
import { refreshNextAction } from "@/lib/learning-loop/next-action";
import type { ActivityInput } from "@/lib/learning-loop/types";
import type { PlayerActivity } from "@prisma/client";

/**
 * Catat satu aktivitas belajar user secara atomik dalam satu transaksi:
 *   1. Buat baris PlayerActivity (log granular).
 *   2. Bila `skill` + `skillDelta > 0`, upsert LearningSkill (XP ditambah,
 *      level dihitung ulang dari XP baru).
 *   3. Bila `journey` diisi, buat entri LearningJourney untuk hari ini (WIB).
 *
 * Setelah transaksi sukses, `refreshNextAction()` dipanggil best-effort di luar
 * transaksi (fire-and-forget). Kegagalan refresh TIDAK pernah menggagalkan
 * pemanggil.
 */
export async function recordActivity(input: ActivityInput): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.playerActivity.create({
      data: {
        userId: input.userId,
        type: input.type,
        subtype: input.subtype ?? null,
        skill: input.skill ?? null,
        skillDelta: input.skillDelta ?? null,
        xp: input.xp ?? 0,
        coin: input.coin ?? 0,
        meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : undefined,
        reference: input.reference ?? null,
      },
    });

    if (input.skill && input.skillDelta && input.skillDelta > 0) {
      const key = { userId_skill: { userId: input.userId, skill: input.skill } };
      const current = await tx.learningSkill.findUnique({ where: key });
      const newXp = (current?.xp ?? 0) + input.skillDelta;

      await tx.learningSkill.upsert({
        where: key,
        update: { xp: newXp, level: skillLevelFromXp(newXp) },
        create: {
          userId: input.userId,
          skill: input.skill,
          xp: input.skillDelta,
          level: skillLevelFromXp(input.skillDelta),
        },
      });
    }

    if (input.journey) {
      await tx.learningJourney.create({
        data: {
          userId: input.userId,
          dayKey: dayKeyWIB(),
          type: input.type,
          title: input.journey.title,
          description: input.journey.description ?? null,
          icon: input.journey.icon ?? null,
          meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : undefined,
        },
      });
    }
  });

  // Best-effort di luar transaksi — jangan pernah gagalkan caller.
  try {
    await refreshNextAction(input.userId);
  } catch {
    // Refresh CTA gagal — diabaikan dengan sengaja.
  }
}

/**
 * Ambil aktivitas terbaru user dalam `days` hari terakhir (maks 200 baris).
 *
 * Dipakai analisis konsistensi & variasi aktivitas di generateDailyInsights.
 */
export async function getRecentActivity(userId: string, days = 7): Promise<PlayerActivity[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  return db.playerActivity.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
