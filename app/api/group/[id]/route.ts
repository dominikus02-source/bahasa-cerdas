import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const group = await db.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, avatar: true, email: true } },
          },
        },
        quizzes: {
          include: {
            results: true,
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (group.teacherId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const memberIds = group.members.map((m) => m.userId);

    if (memberIds.length > 0) {
      const [progresList, quizResults, ukbiResults, tkaResults] = await Promise.all([
        db.progresKompetensi.findMany({
          where: { userId: { in: memberIds } },
          include: { paket: { select: { id: true, title: true, type: true } } },
          orderBy: { finishedAt: "desc" },
        }),
        db.quizSession.findMany({
          where: { userId: { in: memberIds } },
          orderBy: { startedAt: "desc" },
        }),
        db.progresKompetensi.findMany({
          where: {
          userId: { in: memberIds },
          paket: {
            type: { in: ["UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN"] },
          },
        },
          include: { paket: { select: { title: true } } },
        }),
        db.progresKompetensi.findMany({
          where: {
          userId: { in: memberIds },
          paket: {
            type: { in: ["TKA_GURU", "TKA_UTBK"] },
          },
        },
          include: { paket: { select: { title: true } } },
        }),
      ]);

      const memberProgressMap: Record<string, any> = {};
      for (const prog of progresList) {
        if (!memberProgressMap[prog.userId]) memberProgressMap[prog.userId] = [];
        memberProgressMap[prog.userId].push(prog);
      }

      const memberQuizMap: Record<string, any> = {};
      for (const q of quizResults) {
        if (!memberQuizMap[q.userId]) memberQuizMap[q.userId] = [];
        memberQuizMap[q.userId].push(q);
      }

      const enrichedMembers = group.members.map((m) => ({
        ...m,
        progress: memberProgressMap[m.userId] || [],
        quizResults: memberQuizMap[m.userId] || [],
        ukbiCount: ukbiResults.filter((r) => r.userId === m.userId).length,
        tkaCount: tkaResults.filter((r) => r.userId === m.userId).length,
      }));

      const ketua = enrichedMembers.find((m) => m.role === "ketua") || null;

      return NextResponse.json({ group: { ...group, members: enrichedMembers }, ketua });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("GET /api/group/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    const isPrivileged = dbUser?.role === "ADMIN" || dbUser?.isFounder;
    if (!dbUser || (dbUser.role !== "GURU" && !isPrivileged)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const group = await db.group.findUnique({ where: { id } });
    if (!group || (group.teacherId !== dbUser.id && !isPrivileged)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, description, grade, tahunAjaran, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (grade !== undefined) updateData.grade = grade;
    if (tahunAjaran !== undefined) updateData.tahunAjaran = tahunAjaran;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.group.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    const isPrivileged = dbUser?.role === "ADMIN" || dbUser?.isFounder;
    if (!dbUser || (dbUser.role !== "GURU" && !isPrivileged)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const group = await db.group.findUnique({ where: { id } });
    if (!group || (group.teacherId !== dbUser.id && !isPrivileged)) {
      return NextResponse.json({ error: "Kelas tidak ditemukan", code: "CLASS_NOT_FOUND" }, { status: 404 });
    }

    // Only a completely pristine class (a mistake with no student/task/grade data)
    // may be hard-deleted; anything with important relations is archived instead so
    // no student/task/grade data is ever destroyed.
    const [members, quizzes, assignments, penugasans, nilais, messages, kategoris] = await Promise.all([
      db.groupMember.count({ where: { groupId: id } }),
      db.groupQuiz.count({ where: { groupId: id } }),
      db.quizAssignment.count({ where: { groupId: id } }),
      db.penugasan.count({ where: { groupId: id } }),
      db.nilai.count({ where: { groupId: id } }),
      db.chatMessage.count({ where: { groupId: id } }),
      db.nilaiKategori.count({ where: { groupId: id } }),
    ]);
    const hasRelations = members + quizzes + assignments + penugasans + nilais + messages + kategoris > 0;

    if (hasRelations) {
      await db.group.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ success: true, data: { id, deleted: false, archived: true } });
    }

    await db.group.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id, deleted: true, archived: false } });
  } catch (error) {
    return NextResponse.json({ error: "Kelas belum berhasil dihapus.", code: "CLASS_DELETE_FAILED" }, { status: 500 });
  }
}