import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// How many Jalur Cerdas units this student has finished — the figure the avatar
// picker uses to decide what is unlocked. Kept as its own tiny endpoint so the
// picker can be a client component without the settings page having to fetch
// learning data it otherwise has no use for.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const completedUnits = await db.userUnitProgress.count({
      where: { userId: user.id, completed: true },
    });

    return NextResponse.json({ completedUnits });
  } catch {
    // Fail closed to zero: showing fewer avatars as available is recoverable,
    // handing out locked ones is not.
    return NextResponse.json({ completedUnits: 0 });
  }
}
