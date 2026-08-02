import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getSessionSummary } from "@/lib/learning-loop/session";

/**
 * GET /api/player/session — ringkasan sesi mentor harian untuk user yang
 * sedang masuk. Mengembalikan `SessionSummary` (insights, nextAction, skills,
 * agregat aktivitas hari ini).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await getSessionSummary(user.id, user.fullName);
  return NextResponse.json(summary);
}
