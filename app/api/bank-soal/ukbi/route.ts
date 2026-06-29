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
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Hanya guru yang dapat mengakses bank soal" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const seksi = searchParams.get("seksi");
    const difficulty = searchParams.get("difficulty");
    const verified = searchParams.get("verified");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { isActive: true };
    if (seksi) where.seksi = seksi;
    if (difficulty) where.difficulty = difficulty;
    if (verified === "true") where.isVerified = true;
    if (verified === "false") where.isVerified = false;

    const [questions, total] = await Promise.all([
      db.uKBIQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { uploader: { select: { id: true, fullName: true } } },
      }),
      db.uKBIQuestion.count({ where }),
    ]);

    const stats = await db.uKBIQuestion.groupBy({
      by: ["seksi", "difficulty"],
      _count: true,
      where: { isActive: true },
    });

    return NextResponse.json({ soal: questions, total, page, totalPages: Math.ceil(total / limit), stats });
  } catch (error) {
    console.error("GET /api/bank-soal/ukbi error:", error);
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
      seksi, text, audioUrl, imageUrl, passage, type, options,
      correctAnswer, explanation, difficulty, cognitive, domain,
      passageType, wordCount, keywords, isVerified,
    } = body;

    if (!seksi || !text || !correctAnswer || !options) {
      return NextResponse.json({ error: "seksi, text, correctAnswer, dan options wajib diisi" }, { status: 400 });
    }

    const validSekis = ["MENDENGARKAN", "MERESPONS_KAIDAH", "MEMBACA", "MENULIS", "BERBICARA"];
    if (!validSekis.includes(seksi)) {
      return NextResponse.json({ error: "Seksi tidak valid" }, { status: 400 });
    }

    const question = await db.uKBIQuestion.create({
      data: {
        seksi: seksi as any,
        text,
        audioUrl,
        imageUrl,
        passage,
        type: type || "PILIHAN_GANDA",
        options,
        correctAnswer,
        explanation,
        difficulty: difficulty || "MEDIUM",
        cognitive: cognitive || "PENERAPAN",
        domain: domain || "SOSIAL",
        passageType,
        wordCount,
        keywords: keywords || [],
        isVerified: dbUser.role === "ADMIN" ? (isVerified ?? true) : false,
        uploaderId: dbUser.id,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bank-soal/ukbi error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}