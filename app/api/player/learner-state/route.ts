import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { RECENT_ATTEMPT_LIMIT } from "@/lib/learner-state/calculator";
import { getLearnerState, isLearnerStateInfraUnavailable } from "@/lib/learner-state/service";

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
    return NextResponse.json({
      stateVersion: "1.0",
      recentAttemptLimit: RECENT_ATTEMPT_LIMIT,
      skills: await getLearnerState(user.id),
    });
  } catch (error) {
    if (isLearnerStateInfraUnavailable(error)) {
      return NextResponse.json(
        { code: "LEARNER_STATE_UNAVAILABLE", error: "Data learner state belum tersedia" },
        { status: 503 }
      );
    }
    console.error("Learner state error:", error);
    return NextResponse.json({ error: "Gagal menghitung learner state" }, { status: 500 });
  }
}
