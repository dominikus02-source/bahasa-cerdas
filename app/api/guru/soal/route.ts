import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get("kelas");
    const topik = searchParams.get("topik");
    const source = searchParams.get("source");

    const where: any = { uploaderId: dbUser.id };
    if (kelas) where.kelas = kelas;
    if (topik) where.topik = topik;
    if (source) where.source = source;

    const soals = await db.soal.findMany({ where, orderBy: { createdAt: "desc" } });

    const kelasList = await db.soal.findMany({
      where: { uploaderId: dbUser.id },
      select: { kelas: true },
      distinct: ["kelas"],
      orderBy: { kelas: "asc" },
    });

    const topikList = await db.soal.findMany({
      where: { uploaderId: dbUser.id, topik: { not: null } },
      select: { topik: true },
      distinct: ["topik"],
      orderBy: { topik: "asc" },
    });

    return NextResponse.json({
      data: soals,
      total: soals.length,
      kelasList: kelasList.map(k => k.kelas),
      topikList: topikList.map(t => t.topik).filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/guru/soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const body = await req.json();
    const { text, type, difficulty, options, correctAnswer, explanation, isHOTS, kelas, topik, kd, subject, source } = body;

    if (!text || !kelas) {
      return NextResponse.json({ error: "Pertanyaan dan kelas diperlukan" }, { status: 400 });
    }

    const soal = await db.soal.create({
      data: {
        text,
        type: type || "PILIHAN_GANDA",
        difficulty: difficulty || "MEDIUM",
        options: options || [],
        correctAnswer: String(correctAnswer || ""),
        explanation: explanation || null,
        isHOTS: isHOTS || false,
        kelas,
        topik: topik || null,
        KD: kd || null,
        subject: subject || "Bahasa Indonesia",
        source: source || "MANUAL",
        uploaderId: dbUser.id,
      },
    });

    return NextResponse.json({ success: true, soal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await db.soal.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    const soal = await db.soal.update({ where: { id }, data });
    return NextResponse.json({ soal });
  } catch (error) {
    console.error("PUT /api/guru/soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await db.soal.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    await db.soal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
