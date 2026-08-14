
import { db } from "@/lib/db";
import type { Difficulty, LearningSkillType, Prisma } from "@prisma/client";

export const LEARNING_EVIDENCE_VERSION = "1.0";

export interface LearningEvidenceInput {
  userId: string;
  source: string;
  activityId: string;
  questionId: string;
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
  score?: number | null;
  skill?: LearningSkillType | null;
  difficulty?: Difficulty | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Simpan evidence server-verified. Composite unique key membuat retry jawaban
 * yang sama meng-update baris yang sama, bukan membuat evidence duplikat.
 */
export function upsertLearningEvidence(input: LearningEvidenceInput) {
  const where = {
    userId_source_activityId_questionId: {
      userId: input.userId,
      source: input.source,
      activityId: input.activityId,
      questionId: input.questionId,
    },
  };
  const data = {
    selectedAnswer: input.selectedAnswer ?? null,
    isCorrect: input.isCorrect ?? null,
    score: input.score ?? null,
    skill: input.skill ?? null,
    difficulty: input.difficulty ?? null,
    answeredAt: new Date(),
    metadata: input.metadata,
  };

  return db.learningEvidence.upsert({
    where,
    update: data,
    create: { ...input, metadata: input.metadata },
  });
}

/** Batch replace untuk satu submission; dua operasi DB, retry-safe, tanpa N+1 upsert. */
export async function replaceLearningEvidenceBatch(inputs: LearningEvidenceInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const first = inputs[0];
  await db.$transaction([
    db.learningEvidence.deleteMany({
      where: { userId: first.userId, source: first.source, activityId: first.activityId },
    }),
    db.learningEvidence.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        source: input.source,
        activityId: input.activityId,
        questionId: input.questionId,
        selectedAnswer: input.selectedAnswer ?? null,
        isCorrect: input.isCorrect ?? null,
        score: input.score ?? null,
        skill: input.skill ?? null,
        difficulty: input.difficulty ?? null,
        metadata: input.metadata,
      })),
      skipDuplicates: true,
    }),
  ]);
}
