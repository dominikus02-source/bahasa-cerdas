import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";
import { getUser } from "@/lib/supabase/server";
import { calculateLearnerState, RECENT_ATTEMPT_LIMIT } from "@/lib/learner-state/calculator";
import type { EvidenceAggregateRow } from "@/lib/learner-state/types";

function isMissingMetadataInfra(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022";
}

/**
 * GET /api/player/learner-state
 *
 * Read-only, own-user learner state. Only evidence joined to APPROVED
 * QuestionMetadata with a valid skill contributes to this projection.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
          WHERE e."userId" = ${user.id}
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

    return NextResponse.json({
      stateVersion: "1.0",
      recentAttemptLimit: RECENT_ATTEMPT_LIMIT,
      skills: calculateLearnerState(rows),
    });
  } catch (error) {
    if (isMissingMetadataInfra(error)) {
      return NextResponse.json(
        { code: "LEARNER_STATE_UNAVAILABLE", error: "Data learner state belum tersedia" },
        { status: 503 }
      );
    }
    console.error("Learner state error:", error);
    return NextResponse.json({ error: "Gagal menghitung learner state" }, { status: 500 });
  }
}
