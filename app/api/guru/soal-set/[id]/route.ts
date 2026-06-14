import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function getDbUser(req: NextRequest) {
  let dbUser: any = null
  try {
    const user = await getUser();
    if (user) dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  } catch {}
  if (!dbUser) {
    const sid = req.nextUrl.searchParams.get("supabaseId")
    if (sid) dbUser = await db.user.findUnique({ where: { supabaseId: sid } })
  }
  return dbUser
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbUser = await getDbUser(req);
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const set = await db.soalSet.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { questions: true } },
      },
    });

    if (!set || set.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    return NextResponse.json({ set });
  } catch (error) {
    console.error("GET /api/guru/soal-set/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbUser = await getDbUser(req);
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, coverColor, coverEmoji, kelas, topik, maxQuestions } = body;

    const set = await db.soalSet.findUnique({ where: { id } });
    if (!set || set.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const updated = await db.soalSet.update({
      where: { id },
      data: {
        title: title || set.title,
        description: description !== undefined ? description : set.description,
        coverColor: coverColor || set.coverColor,
        coverEmoji: coverEmoji !== undefined ? coverEmoji : set.coverEmoji,
        kelas: kelas || set.kelas,
        topik: topik !== undefined ? topik : set.topik,
        maxQuestions: maxQuestions || set.maxQuestions,
      },
    });

    return NextResponse.json({ set: updated });
  } catch (error) {
    console.error("PUT /api/guru/soal-set/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbUser = await getDbUser(req);
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const set = await db.soalSet.findUnique({ where: { id } });
    if (!set || set.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await db.soal.updateMany({
      where: { soalSetId: id },
      data: { soalSetId: null },
    });

    await db.soalSet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/soal-set/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
