import { db } from "@/lib/db";
import { addXp } from "@/lib/gamification/xp-engine";
import { addCoin } from "@/lib/gamification/coin-engine";
import type { Achievement } from "@prisma/client";

/**
 * Achievement Engine BC Arena — achievement dengan progress realtime.
 *
 * Setiap achievement punya target. Fitur memanggil trackAchievement(userId,
 * code, increment) setiap kali murid melakukan aksi yang relevan. Ketika
 * progress mencapai target, achievement selesai dan hadiahnya (XP + koin)
 * bisa diklaim oleh murid lewat claimAchievement.
 *
 * Idempotent: progress tidak bisa melampaui target; reward hanya cair sekali.
 */

export interface AchievementView extends Achievement {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

/** Tambah progress ke achievement. Upsert user-achievement + skala ke target. */
export async function trackAchievement(
  userId: string,
  code: string,
  increment = 1,
): Promise<AchievementView | null> {
  const achievement = await db.achievement.findUnique({ where: { code } });
  if (!achievement || !achievement.isActive) return null;

  const row = await db.userAchievement.upsert({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
    update: {},
    create: { userId, achievementId: achievement.id, progress: 0, completed: false },
  });

  if (row.completed || row.claimed) {
    return { ...achievement, progress: Math.min(row.progress, achievement.target), completed: row.completed, claimed: row.claimed };
  }

  const newProgress = Math.min(row.progress + increment, achievement.target);
  const completed = newProgress >= achievement.target;

  const updated = await db.userAchievement.update({
    where: { id: row.id },
    data: { progress: newProgress, completed },
  });

  return { ...achievement, progress: updated.progress, completed: updated.completed, claimed: updated.claimed };
}

/** Klaim reward achievement yang sudah selesai (XP + koin engine, idempotent). */
export async function claimAchievement(
  userId: string,
  code: string,
): Promise<{ success: boolean; message: string; rewardXp?: number; rewardCoins?: number }> {
  const achievement = await db.achievement.findUnique({ where: { code } });
  if (!achievement || !achievement.isActive) {
    return { success: false, message: "Achievement tidak ditemukan" };
  }

  const row = await db.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });

  if (!row || !row.completed) {
    return { success: false, message: "Achievement belum selesai" };
  }
  if (row.claimed) {
    return { success: false, message: "Reward sudah diklaim" };
  }

  // Tandai claimed dulu (guard duplikat), lalu cairkan reward lewat engine
  // yang idempotent (reference = code). Kalau salah satu gagal, retry klaim
  // tidak akan menggandakan payout.
  await db.userAchievement.update({
    where: { id: row.id },
    data: { claimed: true, claimedAt: new Date() },
  });

  let rewardXp = 0;
  let rewardCoins = 0;
  if (achievement.rewardXP > 0) {
    const res = await addXp({
      userId,
      source: "ACHIEVEMENT",
      amount: achievement.rewardXP,
      reference: `achievement-${code}`,
    });
    rewardXp = res.xpAdded;
  }
  if (achievement.rewardCoins > 0) {
    const res = await addCoin(userId, achievement.rewardCoins, "ACHIEVEMENT", `achievement-${code}`);
    rewardCoins = res.amount;
  }

  return {
    success: true,
    message: "Reward diklaim",
    rewardXp: rewardXp || undefined,
    rewardCoins: rewardCoins || undefined,
  };
}

/** Daftar achievement + progress user. */
export async function listAchievements(userId: string): Promise<AchievementView[]> {
  const [achievements, rows] = await Promise.all([
    db.achievement.findMany({ where: { isActive: true }, orderBy: { target: "asc" } }),
    db.userAchievement.findMany({ where: { userId } }),
  ]);
  const byId = new Map(rows.map((r) => [r.achievementId, r]));

  return achievements.map((a) => {
    const row = byId.get(a.id);
    return {
      ...a,
      progress: row?.progress ?? 0,
      completed: row?.completed ?? false,
      claimed: row?.claimed ?? false,
    };
  });
}
