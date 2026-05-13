import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, fullName: true, email: true, role: true, isPremium: true,
        isFounder: true, xp: true, level: true, createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
