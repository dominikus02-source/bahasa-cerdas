import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getOrCreateDailyQuests, trackDailyStreak } from "@/lib/coins";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await trackDailyStreak(user.id);
    const quests = await getOrCreateDailyQuests(user.id);

    return NextResponse.json({ quests });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
