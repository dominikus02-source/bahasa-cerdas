import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const body = await req.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json({ error: "questionIds array required" }, { status: 400 });
    }

    const set = await db.soalSet.findUnique({ where: { id } });
    if (!set || set.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const currentCount = await db.soal.count({ where: { soalSetId: id } });
    const availableSlots = set.maxQuestions - currentCount;

    if (questionIds.length > availableSlots) {
      return NextResponse.json({
        error: `Maksimal ${set.maxQuestions} soal per set. Tersisa ${availableSlots} slot.`,
        availableSlots,
      }, { status: 400 });
    }

    await db.soal.updateMany({
      where: { id: { in: questionIds } },
      data: { soalSetId: id },
    });

    const updatedCount = await db.soal.count({ where: { soalSetId: id } });

    return NextResponse.json({
      success: true,
      added: questionIds.length,
      totalQuestions: updatedCount,
    });
  } catch (error) {
    console.error("POST /api/guru/soal-set/[id]/questions error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const searchParams = req.nextUrl.searchParams;
    const questionIds = searchParams.getAll("questionId");

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    const set = await db.soalSet.findUnique({ where: { id } });
    if (!set || set.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await db.soal.updateMany({
      where: { id: { in: questionIds } },
      data: { soalSetId: null },
    });

    return NextResponse.json({ success: true, removed: questionIds.length });
  } catch (error) {
    console.error("DELETE /api/guru/soal-set/[id]/questions error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
