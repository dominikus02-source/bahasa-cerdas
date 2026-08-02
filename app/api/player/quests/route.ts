import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { getOrCreateDailyQuests, claimQuestReward, getClaimedQuestIds } from "@/lib/coins";

/** GET /player/quests — misi harian + status klaim. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quests = await getOrCreateDailyQuests(user.id);
  const claimed = await getClaimedQuestIds(user.id, quests.map((q) => q.id));

  return NextResponse.json({
    quests: quests.map((q) => ({ ...q, claimed: claimed.has(q.id) })),
  });
}

/** POST /player/quests { questId } — klaim reward misi harian. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "bca-player-quests" });
  if (limited) return limited;

  let body: { questId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.questId) {
    return NextResponse.json({ error: "questId wajib diisi" }, { status: 400 });
  }

  try {
    await claimQuestReward(user.id, body.questId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal klaim" }, { status: 400 });
  }
}
