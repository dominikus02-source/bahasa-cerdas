import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { listAchievements, claimAchievement } from "@/lib/gamification/achievement-engine";

/** GET /player/achievements — daftar achievement + progress + klaim. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const achievements = await listAchievements(user.id);

  return NextResponse.json({
    achievements,
    summary: {
      total: achievements.length,
      completed: achievements.filter((a) => a.completed).length,
      claimed: achievements.filter((a) => a.claimed).length,
    },
  });
}

/** POST /player/achievements { code } — klaim reward achievement selesai. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "bca-player-achievement" });
  if (limited) return limited;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Kode achievement wajib diisi" }, { status: 400 });
  }

  const result = await claimAchievement(user.id, body.code);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
