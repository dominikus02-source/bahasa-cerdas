import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const boost = await db.userItem.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        item: { type: "XP_BOOST" },
      },
      select: {
        expiresAt: true,
        item: { select: { name: true, icon: true } },
      },
    });

    if (!boost || !boost.expiresAt) {
      return NextResponse.json({ active: false, multiplier: 1, remainingMs: 0 });
    }

    const remainingMs = Math.max(0, boost.expiresAt.getTime() - Date.now());

    return NextResponse.json({
      active: true,
      multiplier: 2,
      expiresAt: boost.expiresAt.toISOString(),
      remainingMs,
      itemName: boost.item.name,
    });
  } catch {
    return NextResponse.json({ active: false, multiplier: 1, remainingMs: 0 });
  }
}
