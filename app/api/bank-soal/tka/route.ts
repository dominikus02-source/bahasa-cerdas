import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Hanya guru yang dapat mengakses bank soal" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kompetensi = searchParams.get("kompetensi");
    const difficulty = searchParams.get("difficulty");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { isActive: true };
    if (kompetensi) where.kompetensi = kompetensi;
    if (difficulty) where.difficulty = difficulty;

    const [questions, total] = await Promise.all([
      db.tKAQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { uploader: { select: { id: true, fullName: true } } },
      }),
      db.tKAQuestion.count({ where }),
    ]);

    const stats = await db.tKAQuestion.groupBy({
      by: ["kompetensi", "difficulty"],
      _count: true,
      where: { isActive: true },
    });

    return NextResponse.json({ soal: questions, total, page, totalPages: Math.ceil(total / limit), stats });
  } catch (error) {
    console.error("GET /api/bank-soal/tka error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Hanya guru yang dapat menambahkan soal" }, { status: 403 });
    }

    const body = await req.json();
    const {
      kompetensi, subKompetensi, text, passage, type, options,
      correctAnswer, explanation, difficulty, weight, year, source, isVerified,
    } = body;

    if (!kompetensi || !text || !correctAnswer || !options) {
      return NextResponse.json({ error: "kompetensi, text, correctAnswer, dan options wajib diisi" }, { status: 400 });
    }

    const validKompetensi = ["PEDAGOGIK", "PROFESIONAL", "SOSIAL", "KEPRIBADIAN"];
    if (!validKompetensi.includes(kompetensi)) {
      return NextResponse.json({ error: "Kompetensi tidak valid" }, { status: 400 });
    }

    const question = await db.tKAQuestion.create({
      data: {
        kompetensi: kompetensi as any,
        subKompetensi,
        text,
        passage,
        type: type || "PILIHAN_GANDA",
        options,
        correctAnswer,
        explanation,
        difficulty: difficulty || "MEDIUM",
        weight: weight || 1.0,
        year,
        source,
        isVerified: dbUser.role === "ADMIN" ? (isVerified ?? true) : false,
        uploaderId: dbUser.id,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bank-soal/tka error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}