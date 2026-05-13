import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== "MURID") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const results = await db.groupQuizResult.findMany({
      where: { userId: user.id, status: "ASSIGNED" },
      include: {
        groupQuiz: {
          include: { group: { select: { name: true } } },
        },
      },
      orderBy: { groupQuiz: { assignedAt: "desc" } },
      take: 10,
    });

    return NextResponse.json({ data: results });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
