/**
 * AI Mentor — Server-side context builder.
 *
 * Builds context from authenticated user's learning data.
 * Client NEVER sends context — all data comes from server.
 */

import { getLearnerState } from "@/lib/learner-state/service";
import { getActiveRecommendations } from "@/lib/learning-loop/recommend";
import { getRecentActivity } from "@/lib/learning-loop/activity";
import { db } from "@/lib/db";
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
    ctaLabel: string | null;
    ctaHref: string | null;
    reason: string | null;
  };
  confidence: number | null;
  hasEnoughData: boolean;\n  diagnosticEvidence: { total: number; recent: number; writingResponses: number; latestWriting: string | null };
}

/**
 * Build context for AI Mentor from authenticated user's learning data.
 * All data comes from server — client cannot inject arbitrary context.
 */
export async function buildMentorContext(userId: string): Promise<MentorContext> {
  const [learnerState, recommendations, recentActivity, evidence] = await Promise.all([
    getLearnerState(userId).catch(() => []),
    getActiveRecommendations(userId).catch(() => []),
    getRecentActivity(userId, 7).catch(() => []),\n    db.learningEvidence.findMany({ where: { userId, answeredAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }, orderBy: { answeredAt: "desc" }, take: 200, select: { source: true, skill: true, isCorrect: true, score: true, selectedAnswer: true, answeredAt: true, metadata: true } }).catch(() => []),
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
          ctaLabel: rec.ctaLabel,
          ctaHref: rec.ctaHref,
          reason: rec.reason,
        }
      : { title: null, description: null, skill: null, ctaLabel: null, ctaHref: null, reason: null },
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
5. Selalu jawab tiga hal: APA YANG HARUS DILAKUKAN SEKARANG, APA YANG HARUS DIBUAT/DIHASILKAN, dan KE MANA HARUS PERGI untuk memulai.
6. Jika recommendation tersedia, arahkan murid ke aktivitas tersebut; jangan membuat route baru.
7. Jika skill WRITING menjadi fokus, hasil yang dibuat harus berupa karya/tulisan konkret, bukan hanya latihan soal.\n8. Diagnostic evidence adalah bukti asesmen terbaru; gunakan hanya sebagai konteks, jangan mengarang skor yang tidak tersedia.
9. Jangan menggunakan markdown yang kompleks
10. Jangan membuat diagnosis medis/psikologis
11. Jangan memberikan statistik yang tidak ada di context

CONTEXT SISWA:
${contextJson}

OUTPUT FORMAT (JSON):
{
  "headline": "string (maks 80 karakter)",
  "diagnosis": "string (1-2 kalimat)",
  "reason": "string (1-2 kalimat)",
  "action": "string (1-2 kalimat)",
  "doNow": "string — satu aktivitas konkret yang harus dilakukan sekarang",
  "makeThis": "string — satu hal konkret yang harus dibuat/dihasilkan murid",
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
  doNow: string;
  makeThis: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  encouragement: string;
} {
  if (!context.hasEnoughData) {
    return {
      headline: "Belum cukup data",
      diagnosis: "Aku masih mengenali pola belajarmu.",
      reason: "Data belajar belum cukup untuk memberikan analisis yang akurat.",
      action: "Selesaikan beberapa latihan lagi, lalu tanyakan lagi.",
      doNow: "Mainkan satu latihan singkat di Jalur Cerdas.",
      makeThis: "Selesaikan satu tantangan sampai tuntas agar Mentor punya evidence baru.",
      ctaLabel: "Mulai latihan",
      ctaHref: "/arena/jalur-cerdas",
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
    action: `Mulai latihan yang berfokus pada ${focusLabel}. Coba selesaikan satu tantangan hari ini.`,
    doNow: context.recommendation.description || `Latihan ${focusLabel} sekarang.`,
    makeThis: context.recommendation.skill === "WRITING" ? "Satu karya pendek yang selesai dan bisa kamu lihat kembali di Karya." : `Satu tantangan ${focusLabel} yang selesai dengan usaha terbaikmu.`,
    ctaLabel: context.recommendation.ctaLabel,
    ctaHref: context.recommendation.ctaHref,
    encouragement: "Sedikit latihan terarah bisa membuatnya jauh lebih kuat!",
  };
}
