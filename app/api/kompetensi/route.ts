import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const paket = await db.paketKompetensi.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ paket });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { paketId, totalScore, predikat, seksiScores } = body;

    const progres = await db.progresKompetensi.create({
      data: {
        userId: user.id,
        paketId,
        totalScore,
        predikat,
        seksiScores,
        completed: true,
        completedAt: new Date(),
      },
    });

    const xpEarned = Math.floor((totalScore || 0) / 10) * 5;
    if (xpEarned > 0) {
      await db.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpEarned } },
      });
    }

    return NextResponse.json({ progres, xpEarned }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}