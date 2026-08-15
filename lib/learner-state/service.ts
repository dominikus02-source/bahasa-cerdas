import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";
import { calculateLearnerState, RECENT_ATTEMPT_LIMIT } from "./calculator";
import type { EvidenceAggregateRow, LearnerSkillState } from "./types";

export function isLearnerStateInfraUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022";
}

export async function getLearnerState(userId: string): Promise<LearnerSkillState[]> {
  const rows = await withQueryTimeout(
    db.$queryRaw<EvidenceAggregateRow[]>(Prisma.sql`
      WITH ranked AS (
        SELECT
          e."id",
          m."skill",
          e."isCorrect",
          e."answeredAt",
          ROW_NUMBER() OVER (
            PARTITION BY m."skill"
            ORDER BY e."answeredAt" DESC, e."id" DESC
          ) AS "recentRank"
        FROM "LearningEvidence" e
        INNER JOIN "QuestionMetadata" m
          ON m."source" = e."source"
         AND m."questionId" = e."questionId"
        WHERE e."userId" = ${userId}
          AND e."isCorrect" IS NOT NULL
          AND m."status" = 'APPROVED'
          AND m."skill" IS NOT NULL
      )
      SELECT
        "skill",
        COUNT(*)::int AS "attemptCount",
        COUNT(*) FILTER (WHERE "isCorrect" = TRUE)::int AS "correctCount",
        COUNT(*) FILTER (WHERE "recentRank" <= ${RECENT_ATTEMPT_LIMIT})::int AS "recentAttemptCount",
        COUNT(*) FILTER (WHERE "recentRank" <= ${RECENT_ATTEMPT_LIMIT} AND "isCorrect" = TRUE)::int AS "recentCorrectCount",
        COUNT(*) FILTER (WHERE "recentRank" > ${RECENT_ATTEMPT_LIMIT})::int AS "historicalAttemptCount",
        COUNT(*) FILTER (WHERE "recentRank" > ${RECENT_ATTEMPT_LIMIT} AND "isCorrect" = TRUE)::int AS "historicalCorrectCount",
        MIN("answeredAt") AS "firstPracticedAt",
        MAX("answeredAt") AS "lastPracticedAt"
      FROM ranked
      GROUP BY "skill"
    `),
    10000,
    "Learner state aggregation"
  );

  return calculateLearnerState(rows);
}
