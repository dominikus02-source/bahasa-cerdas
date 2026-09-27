import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getLearnerState } from "@/lib/learner-state/service";

/**
 * GET /api/player/skills — profil skill bahasa user (terlemah dulu).
 * Mengembalikan `{ skills }`.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const skills = await getLearnerState(user.id);
  return NextResponse.json({ skills });
}
