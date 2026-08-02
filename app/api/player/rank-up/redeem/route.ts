import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { grantRankUpRewards } from "@/lib/gamification/rank-up";

/** POST /player/rank-up/redeem — klaim reward saat naik rank (idempotent). */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await grantRankUpRewards(user.id);

  return NextResponse.json(result);
}
