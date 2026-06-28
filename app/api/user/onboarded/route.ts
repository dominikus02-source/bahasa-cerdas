import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import cache from "@/lib/redis";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { onboarded: true },
    });

    // Bust GET /api/user/me Redis cache so fresh onboarded state is returned
    const cacheKey = `user:me:${user.email}`;
    try { await cache.del(cacheKey); } catch {}

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarded update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
