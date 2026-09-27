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
          CASE WHEN e."source" = 'DIAGNOSTIC_BASELINE_V2' THEN e."skill"::text ELSE m."skill"::text END AS "skill",
          e."isCorrect",
          e."answeredAt",
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN e."source" = 'DIAGNOSTIC_BASELINE_V2' THEN e."skill"::text ELSE m."skill"::text END
            ORDER BY e."answeredAt" DESC, e."id" DESC
          ) AS "recentRank"
        FROM "LearningEvidence" e
        LEFT JOIN "QuestionMetadata" m
          ON m."questionId" = e."questionId"
         AND m."source" = e."source"
        WHERE e."userId" = ${userId}
          AND e."isCorrect" IS NOT NULL
          AND (
            (e."source" = 'DIAGNOSTIC_BASELINE_V2' AND e."skill" IS NOT NULL)
            OR (e."source" <> 'DIAGNOSTIC_BASELINE_V2' AND m."status" = 'APPROVED' AND m."skill" IS NOT NULL)
          )
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
