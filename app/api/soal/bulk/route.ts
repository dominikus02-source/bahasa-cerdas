import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { soalList } = body;

    if (!Array.isArray(soalList) || soalList.length === 0) {
      return NextResponse.json({ error: "Invalid soal list" }, { status: 400 });
    }

    const created = await db.soal.createMany({
      data: soalList.map((soal: any) => ({
        text: soal.text,
        type: soal.type || "PILIHAN_GANDA",
        difficulty: soal.difficulty || "MEDIUM",
        options: soal.options || [],
        correctAnswer: soal.correctAnswer,
        explanation: soal.explanation,
        isHOTS: soal.isHOTS || false,
        creatorId: user.id,
      })),
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}