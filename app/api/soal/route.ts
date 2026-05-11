import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const soal = await db.soal.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ soal });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, type, difficulty, options, correctAnswer, explanation, isHOTS, KD } = body;

    const soal = await db.soal.create({
      data: {
        text,
        type: type || "PILIHAN_GANDA",
        difficulty: difficulty || "MEDIUM",
        options: options || [],
        correctAnswer,
        explanation,
        isHOTS: isHOTS || false,
        KD,
        creatorId: user.id,
      },
    });

    return NextResponse.json({ soal }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}