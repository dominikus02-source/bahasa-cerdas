import { db } from "@/lib/db";
import { dayKeyWIB } from "@/lib/learning-loop/journey";
import { getSkillProfile, SKILL_LABELS } from "@/lib/learning-loop/skills";
import { getRecentActivity } from "@/lib/learning-loop/activity";
import { getNextAction } from "@/lib/learning-loop/next-action";
import type { CtaView, SkillRow } from "@/lib/learning-loop/types";

/** Offset WIB (UTC+7) dalam milidetik. */
const WIB_OFFSET_MS = 7 * 3600 * 1000;

/**
 * Ringkasan sesi mentor harian — dikirim ke klien oleh GET /api/player/session.
 */
export interface SessionSummary {
  name: string;
  insights: string[];
  nextAction: CtaView | null;
  skills: SkillRow[];
  today: { activities: number; xp: number; coin: number };
}

/**
 * Awal hari "hari ini" dalam zona WIB.
 */
function startOfTodayWIB(): Date {
  const wib = new Date(Date.now() + WIB_OFFSET_MS);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - WIB_OFFSET_MS);
}

/**
 * Bangun 3-4 kalimat insight harian berbasis aturan ("mentor") tanpa API luar:
 *   - sapaan + jumlah aktivitas hari ini;
 *   - nudge konsistensi bila hari ini masih 0 aktivitas;
 *   - insight skill terlemah;
 *   - nudge variasi bila aktivitas 7 hari terakhir hanya Jalur Cerdas.
 *
 * Hasil di-cache di LearningInsight (userId_dayKey) supaya tidak dihitung ulang
 * berulang-ulang dalam satu hari.
 */
export async function generateDailyInsights(userId: string, userName: string): Promise<string[]> {
  const dayKey = dayKeyWIB();
  const start = startOfTodayWIB();

  const [todayActivities, skillProfile, nextAction, recent] = await Promise.all([
    db.playerActivity.findMany({
      where: { userId, createdAt: { gte: start } },
      select: { type: true, xp: true },
    }),
    getSkillProfile(userId),
    getNextAction(userId),
    getRecentActivity(userId, 7),
  ]);

  const count = todayActivities.length;
  const insights: string[] = [];

  // (a) Sapaan menyesuaikan keadaan. Versi lama selalu memuji ("Keren!")
  // walau jumlahnya 0, sehingga murid yang belum mulai justru dipuji karena
  // tidak melakukan apa-apa.
  if (count === 0) {
    insights.push(`Halo ${userName}! Hari ini kamu belum mulai belajar.`);
    insights.push("Mulai dengan satu langkah kecil — selesaikan 1 unit Jalur Cerdas.");
  } else if (count === 1) {
    insights.push(`Halo ${userName}! Kamu sudah menyelesaikan 1 aktivitas hari ini. Lanjutkan!`);
  } else {
    insights.push(`Halo ${userName}! Hari ini kamu sudah ${count} aktivitas belajar. Keren!`);
  }

  // (c) Skill terlemah.
  const weakest = skillProfile[0];
  if (weakest) {
    insights.push(`Keterampilan ${SKILL_LABELS[weakest.skill]} kamu paling butuh perhatian (${weakest.level}/100).`);
  }

  // (d) Nudge variasi bila 7 hari terakhir hanya Jalur Cerdas/Lesson.
  const onlyJalur =
    recent.length > 0 && recent.every((a) => a.type === "JALUR_CERDAS" || a.type === "LESSON");
  if (onlyJalur) {
    insights.push("Coba variasi: tulis 1 karya minggu ini supaya semua keterampilan berkembang.");
  }

  // Pengisi bila belum mencapai 3 kalimat.
  if (insights.length < 3 && nextAction) {
    insights.push(`Aksi berikutnya: ${nextAction.ctaLabel}.`);
  }

  await db.learningInsight.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    update: { insights },
    create: { userId, dayKey, insights },
  });

  return insights;
}

/**
 * Ringkasan sesi harian lengkap: insight (cache bila sudah ada), aksi berikutnya,
 * profil skill (7 teratas), dan agregat aktivitas hari ini.
 */
export async function getSessionSummary(userId: string, userName: string): Promise<SessionSummary> {
  const dayKey = dayKeyWIB();
  const start = startOfTodayWIB();

  const cached = await db.learningInsight.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });
  const insights =
    Array.isArray(cached?.insights) && cached.insights.length > 0
      ? parseInsights(cached.insights)
      : await generateDailyInsights(userId, userName);

  const [nextAction, skills, todayRows] = await Promise.all([
    getNextAction(userId),
    getSkillProfile(userId),
    db.playerActivity.findMany({
      where: { userId, createdAt: { gte: start } },
      select: { xp: true, coin: true },
    }),
  ]);

  return {
    name: userName,
    insights,
    nextAction,
    skills: skills.slice(0, 7),
    today: {
      activities: todayRows.length,
      xp: todayRows.reduce((s, r) => s + r.xp, 0),
      coin: todayRows.reduce((s, r) => s + r.coin, 0),
    },
  };
}

/**
 * Ubah nilai JSON LearningInsight.insights menjadi array string dengan aman
 * (hanya elemen string yang dipertahankan).
 */
function parseInsights(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
