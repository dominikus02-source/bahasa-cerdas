/**
 * AI Mentor — Server-side context builder.
 *
 * Builds context from authenticated user's learning data.
 * Client NEVER sends context — all data comes from server.
 */

import { getLearnerState } from "@/lib/learner-state/service";
import { getActiveRecommendations } from "@/lib/learning-loop/recommend";
import { getRecentActivity } from "@/lib/learning-loop/activity";
import type { LearnerSkillState } from "@/lib/learner-state/types";

export interface MentorContext {
  strongestSkill: {
    skill: string | null;
    label: string | null;
    accuracy: number | null;
    trend: string | null;
  };
  focusSkill: {
    skill: string | null;
    label: string | null;
    accuracy: number | null;
    trend: string | null;
  };
  recentMistakes: {
    skill: string;
    type: string;
  }[];
  recommendation: {
    title: string | null;
    description: string | null;
    skill: string | null;
  };
  confidence: number | null;
  hasEnoughData: boolean;
}

/**
 * Build context for AI Mentor from authenticated user's learning data.
 * All data comes from server — client cannot inject arbitrary context.
 */
export async function buildMentorContext(userId: string): Promise<MentorContext> {
  const [learnerState, recommendations, recentActivity] = await Promise.all([
    getLearnerState(userId).catch(() => []),
    getActiveRecommendations(userId).catch(() => []),
    getRecentActivity(userId, 7).catch(() => []),
  ]);

  // Filter skills with evidence (at least 3 attempts)
  const skillsWithEvidence = learnerState.filter(
    (s) => s.attemptCount >= 3 && s.accuracy !== null
  );

  // Find strongest skill (highest accuracy)
  const strongest = skillsWithEvidence.sort(
    (a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0)
  )[0];

  // Find focus skill (lowest accuracy with evidence)
  const focus = skillsWithEvidence.sort(
    (a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)
  )[0];

  // Get recent mistakes (simplified — from activity)
  const recentMistakes = recentActivity
    .filter((a) => a.type === "QUIZ" || a.type === "LESSON")
    .slice(0, 5)
    .map((a) => ({
      skill: "umum",
      type: a.type,
    }));

  // Get recommendation
  const rec = recommendations[0];

  // Calculate confidence based on evidence
  const totalAttempts = skillsWithEvidence.reduce((sum, s) => sum + s.attemptCount, 0);
  const confidence = totalAttempts >= 20 ? 0.8 : totalAttempts >= 10 ? 0.6 : totalAttempts >= 5 ? 0.4 : 0.2;

  // Check if we have enough data
  const hasEnoughData = skillsWithEvidence.length >= 2 && totalAttempts >= 10;

  return {
    strongestSkill: strongest
      ? {
          skill: strongest.skill,
          label: strongest.label,
          accuracy: strongest.accuracy,
          trend: strongest.trend,
        }
      : { skill: null, label: null, accuracy: null, trend: null },
    focusSkill: focus
      ? {
          skill: focus.skill,
          label: focus.label,
          accuracy: focus.accuracy,
          trend: focus.trend,
        }
      : { skill: null, label: null, accuracy: null, trend: null },
    recentMistakes,
    recommendation: rec
      ? {
          title: rec.title,
          description: rec.description,
          skill: rec.skill,
        }
      : { title: null, description: null, skill: null },
    confidence,
    hasEnoughData,
  };
}

/**
 * Build system prompt for AI Mentor with context.
 */
export function buildMentorSystemPrompt(context: MentorContext): string {
  const contextJson = JSON.stringify(context, null, 2);

  return `Kamu adalah Mentor Bahasa Cerdas — mentor belajar Bahasa Indonesia untuk siswa SMA.

KARAKTER:
- Hangat dan suportif
- Jelas dan singkat
- Tidak menghakimi
- Actionable (bisa langsung dilakukan)
- Menggunakan Bahasa Indonesia natural

TUGASMU:
Memberikan satu penjelasan personal berdasarkan kondisi belajar siswa saat ini.

ATURAN:
1. Hanya gunakan data yang ada di context — JANGAN mengarang data
2. Jika data kurang, akui dengan jujur
3. Fokus pada SATU hal yang paling penting
4. Berikan langkah yang bisa langsung dilakukan
5. Jangan menggunakan markdown yang kompleks
6. Jangan membuat diagnosis medis/psikologis
7. Jangan memberikan statistik yang tidak ada di context

CONTEXT SISWA:
${contextJson}

OUTPUT FORMAT (JSON):
{
  "headline": "string (maks 80 karakter)",
  "diagnosis": "string (1-2 kalimat)",
  "reason": "string (1-2 kalimat)",
  "action": "string (1-2 kalimat)",
  "encouragement": "string (1 kalimat)"
}`;
}

/**
 * Build user prompt for AI Mentor.
 */
export function buildMentorUserPrompt(): string {
  return "Berdasarkan data belajar siswa di atas, berikan satu penjelasan personal tentang kondisi belajar mereka dan langkah berikutnya.";
}

/**
 * Deterministic fallback when AI provider fails.
 * Uses context to generate useful response without AI.
 */
export function buildDeterministicFallback(context: MentorContext): {
  headline: string;
  diagnosis: string;
  reason: string;
  action: string;
  encouragement: string;
} {
  if (!context.hasEnoughData) {
    return {
      headline: "Belum cukup data",
      diagnosis: "Aku masih mengenali pola belajarmu.",
      reason: "Data belajar belum cukup untuk memberikan analisis yang akurat.",
      action: "Selesaikan beberapa latihan lagi, lalu coba tanyakan lagi.",
      encouragement: "Sedikit demi sedikit, kamu akan semakin kuat!",
    };
  }

  const focusLabel = context.focusSkill.label || "kemampuan bahasa";
  const focusAccuracy = context.focusSkill.accuracy
    ? `${Math.round(context.focusSkill.accuracy * 100)}%`
    : "belum terukur";

  return {
    headline: `Fokuskan dulu pada ${focusLabel}`,
    diagnosis: `Data belajarmu menunjukkan bahwa ${focusLabel} masih menjadi bagian yang perlu diperkuat (akurasi ${focusAccuracy}).`,
    reason: `Kamu sudah cukup kuat dalam skill lain, tetapi ${focusLabel} masih perlu latihan lebih.`,
    action: `Mulai latihan yang berfokus pada ${focusLabel}. Coba selesaikan 1-2 unit hari ini.`,
    encouragement: "Sedikit latihan terarah bisa membuatnya jauh lebih kuat!",
  };
}
