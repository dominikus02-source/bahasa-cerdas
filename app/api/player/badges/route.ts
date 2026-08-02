import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listUserBadges } from "@/lib/gamification/badge-engine";

/** GET /player/badges — daftar badge + status unlock. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badges = await listUserBadges(user.id);

  return NextResponse.json({
    badges,
    summary: {
      total: badges.length,
      unlocked: badges.filter((b) => b.unlocked).length,
    },
  });
}
