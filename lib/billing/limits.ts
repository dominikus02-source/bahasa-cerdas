import { db } from "@/lib/db";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";
import type { AiPlan } from "@/lib/ai-gateway/gateway-types";

interface UserLike {
  id: string;
  role: string;
  isFounder: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  trialEndsAt: Date | null;
  trialStartedAt: Date | null;
  premiumPlan: string;
}

/**
 * Batas unduh dokumen per hari (hasil AI / ekspor PDF/DOCX/PPTX).
 *
 * Pro (bayar / trial) → 10 unduhan/hari
 * Free → 1 unduhan/hari
 * Founder/Admin/Murid → tak terbatas
 */
const DAILY_EXPORT_LIMITS: Record<AiPlan, number> = {
  FOUNDER: Infinity,
  MURID_FREE: Infinity,
  GURU_PRO: 10,
  GURU_PRO_TRIAL: 10,
  GURU_FREE: 1,
  SCHOOL: 10,
};

export function getDailyExportLimit(plan: AiPlan): number {
  return DAILY_EXPORT_LIMITS[plan] ?? 1;
}

/**
 * Awal hari ini dalam zona Asia/Jakarta (UTC+7) sebagai timestamp UTC.
 * Dipakai agar batas harian reset jam 00:00 WIB, bukan UTC.
 */
export function startOfTodayWIB(): Date {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 60 * 60 * 1000
  );
}

/**
 * Hitung jumlah unduhan hari ini untuk user.
 * Berbasis catatan AIUsage dengan feature "ai_export_*".
 */
export async function getDailyExportCount(userId: string): Promise<number> {
  try {
    return await db.aIUsage.count({
      where: {
        userId,
        feature: { startsWith: "ai_export_" },
        createdAt: { gte: startOfTodayWIB() },
      },
    });
  } catch {
    return 0;
  }
}

/**
 * Cek batas unduh harian. Jika redis/DB error → izinkan (tidak memblokir guru).
 */
export async function checkDailyExportLimit(user: UserLike): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: AiPlan;
}> {
  const planInfo = resolveUserAiPlan(user);
  const limit = getDailyExportLimit(planInfo.plan);

  if (!isFinite(limit)) {
    return { allowed: true, used: 0, limit: Infinity, plan: planInfo.plan };
  }

  const used = await getDailyExportCount(user.id);
  return { allowed: used < limit, used, limit, plan: planInfo.plan };
}
