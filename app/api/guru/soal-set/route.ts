import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

const COVER_COLORS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-cyan-600",
  "from-amber-500 to-orange-600",
  "from-red-500 to-rose-600",
  "from-pink-500 to-fuchsia-600",
  "from-indigo-500 to-blue-600",
  "from-lime-500 to-green-600",
];

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const kelas = searchParams.get("kelas");
    const topik = searchParams.get("topik");
    const search = searchParams.get("search");

    const where: Prisma.SoalSetWhereInput = { creatorId: dbUser.id };
    if (kelas) where.kelas = kelas;
    if (topik) where.topik = topik;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const sets = await db.soalSet.findMany({
      where,
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: sets });
  } catch (error) {
    console.error("GET /api/guru/soal-set error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const dbUser = await getUser();
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { title, description, kelas, topik, subject, maxQuestions, questionIds } = body;

    if (!title || !kelas) {
      return NextResponse.json({ error: "Title and kelas required" }, { status: 400 });
    }

    if (questionIds !== undefined && (!Array.isArray(questionIds) || questionIds.some(value => typeof value !== "string"))) return NextResponse.json({ error: "Daftar soal tidak valid." }, { status: 400 });
    if (questionIds?.length) {
      const ownCount = await db.soal.count({ where: { id: { in: questionIds }, uploaderId: dbUser.id } });
      if (ownCount !== new Set(questionIds).size) return NextResponse.json({ error: "Pilih soal milikmu sendiri." }, { status: 404 });
    }

    const randomColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];

    const set = await db.soalSet.create({
      data: {
        title,
        description: description || null,
        coverColor: randomColor,
        kelas,
        topik: topik || null,
        subject: subject || "Bahasa Indonesia",
        maxQuestions: maxQuestions || 50,
        creatorId: dbUser.id,
      },
    });

    if (questionIds && questionIds.length > 0) {
      await db.soal.updateMany({
        where: { id: { in: questionIds }, uploaderId: dbUser.id },
        data: { soalSetId: set.id },
      });
    }

    return NextResponse.json({ set });
  } catch (error) {
    console.error("POST /api/guru/soal-set error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
