import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isFounder: user.isFounder,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      streak: user.streak,
      avatar: user.avatar,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
