import type { ActivityType, LearningSkillType, RecommendationType } from "@prisma/client";

/**
 * Input standar untuk merekam satu aktivitas belajar user.
 *
 * Dipakai oleh `recordActivity()` (lib/learning-loop/activity.ts) sebagai satu
 * sumber kebenaran untuk: log aktivitas (PlayerActivity), kenaikan skill
 * (LearningSkill), dan entri timeline (LearningJourney).
 */
export interface ActivityInput {
  userId: string;
  type: ActivityType;
  subtype?: string;
  skill?: LearningSkillType | null;
  skillDelta?: number;
  xp?: number;
  coin?: number;
  meta?: Record<string, unknown>;
  reference?: string;
  journey?: { title: string; description?: string; icon?: string } | null;
}

/**
 * Baris profil skill user — dipakai rekomendasi, next-action, dan UI
 * (urutan paling lemah dulu).
 */
export interface SkillRow {
  skill: LearningSkillType;
  level: number;
  xp: number;
}

/**
 * Tampilan CTA "Aksi Berikutnya" untuk klien (tanpa field internal seperti
 * id/userId). Dipakai endpoint GET /api/player/next-action.
 */
export interface CtaView {
  ctaType: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  priority: number;
}

export type { ActivityType, LearningSkillType, RecommendationType };
