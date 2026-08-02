import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getSkillProfile } from "@/lib/learning-loop/skills";

/**
 * GET /api/player/skills — profil skill bahasa user (terlemah dulu).
 * Mengembalikan `{ skills }`.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const skills = await getSkillProfile(user.id);
  return NextResponse.json({ skills });
}
