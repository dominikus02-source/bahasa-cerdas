import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // P1-B: hanya GURU/ADMIN/founder yang boleh memakai set soal.
    if (!isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { useType } = body;

    if (!useType || !["KUIS", "LATIHAN", "GAME"].includes(useType)) {
      return NextResponse.json({ error: "useType must be KUIS, LATIHAN, or GAME" }, { status: 400 });
    }

    const set = await db.soalSet.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    // P1-B: ownership — hanya pemilik set yang boleh memakai set ini.
    if (set.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    if (set.questions.length === 0) {
      return NextResponse.json({ error: "Set belum memiliki soal" }, { status: 400 });
    }

    await db.soalSet.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    const questionIds = set.questions.map(q => q.id);

    if (useType === "KUIS") {
      return NextResponse.json({
        redirect: `/guru/kuis/new?soalIds=${questionIds.join(",")}&setTitle=${encodeURIComponent(set.title)}`,
      });
    }

    if (useType === "GAME") {
      return NextResponse.json({
        redirect: `/guru/game/lobby?soalIds=${questionIds.join(",")}`,
      });
    }

    return NextResponse.json({
      redirect: `/guru/kuis/new?soalIds=${questionIds.join(",")}&setTitle=${encodeURIComponent(set.title)}`,
    });
  } catch (error) {
    console.error("POST /api/guru/soal-set/[id]/use error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
