import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getLearnerState } from "@/lib/learner-state/service";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [skills, evidence] = await Promise.all([
    getLearnerState(user.id).catch(() => []),
    db.learningEvidence.findMany({
      where: { userId: user.id },
      orderBy: { answeredAt: "desc" },
      take: 300,
      select: { source: true, skill: true, selectedAnswer: true, isCorrect: true, score: true, answeredAt: true, metadata: true },
    }).catch(() => []),
  ]);

  const diagnostic = evidence.filter((e) => e.source === "DIAGNOSTIC_DAILY" || e.source === "DIAGNOSTIC_DAILY_WRITING" || e.source === "AI_DIAGNOSTIC");
  const writing = evidence.filter((e) => e.source === "DIAGNOSTIC_DAILY_WRITING" && Boolean(e.selectedAnswer));
  const days = new Set(diagnostic.map((e) => e.answeredAt.toISOString().slice(0, 10)));

  return NextResponse.json({
    skills,
    diagnostic: {
      evidenceCount: diagnostic.length,
      activeDays: days.size,
      writingCount: writing.length,
      latestWritingAt: writing[0]?.answeredAt ?? null,
      latestWritingPreview: writing[0]?.selectedAnswer ? writing[0].selectedAnswer.slice(0, 180) : null,
    },
  });
}
