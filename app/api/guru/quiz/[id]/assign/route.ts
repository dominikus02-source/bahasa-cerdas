import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const body = await req.json();
    const { groupIds, dueDate, notes } = body;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ error: "groupIds array required" }, { status: 400 });
    }

    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, teacherId: dbUser.id },
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: "No valid groups found" }, { status: 404 });
    }

    const assignments = await Promise.all(
      groups.map(async (group) => {
        const existing = await db.quizAssignment.findUnique({
          where: { quizId_groupId: { quizId: id, groupId: group.id } },
        });

        if (existing) {
          return db.quizAssignment.update({
            where: { quizId_groupId: { quizId: id, groupId: group.id } },
            data: {
              dueDate: dueDate ? new Date(dueDate) : null,
              notes: notes || null,
              isPublished: true,
            },
            include: { group: { select: { id: true, name: true, accessCode: true } } },
          });
        }

        return db.quizAssignment.create({
          data: {
            quizId: id,
            groupId: group.id,
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null,
            isPublished: true,
          },
          include: { group: { select: { id: true, name: true, accessCode: true } } },
        });
      })
    );

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("POST /api/guru/quiz/[id]/assign error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
