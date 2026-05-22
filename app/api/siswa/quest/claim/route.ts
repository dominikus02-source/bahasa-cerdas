import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { claimQuestReward } from "@/lib/coins";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { questId } = await req.json();
    if (!questId) return NextResponse.json({ error: "questId required" }, { status: 400 });

    await claimQuestReward(user.id, questId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
