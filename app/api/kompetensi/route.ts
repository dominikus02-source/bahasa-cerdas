import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as any;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { isActive: true };
    if (type === "UKBI") where.type = { in: ["UKBI_SIMULASI", "UKBI_LATIHAN"] };
    else if (type === "TKA") where.type = { in: ["TKA_GURU", "TKA_UTBK"] };
    else if (type) where.type = type;

    const [pakets, total] = await Promise.all([
      db.paketKompetensi.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.paketKompetensi.count({ where }),
    ]);

    const enrichedPakets = await Promise.all(pakets.map(async (paket) => {
      const myResults = await db.progresKompetensi.findMany({
        where: { userId: dbUser.id, paketId: paket.id },
        orderBy: { attemptNumber: "desc" },
        take: 5,
      });
      const myCerts = await db.kompetensiCertificate.findMany({
        where: { userId: dbUser.id, paketId: paket.id },
        orderBy: { score: "desc" },
        take: 1,
      });
      return { ...paket, myResults, myBestCert: myCerts[0] || null };
    }));

    return NextResponse.json({
      data: enrichedPakets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/kompetensi error:", error);
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
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, type, mode, duration, passingScore, passingGrade, sections, totalQuestions, isActive, isPremium, thumbnailUrl, attemptLimit, sectionsData, questionPool } = body;

    if (!title || !type || !duration) {
      return NextResponse.json({ error: "title, type, dan duration wajib diisi" }, { status: 400 });
    }

    const paket = await db.paketKompetensi.create({
      data: {
        title,
        description,
        type: type as any,
        mode: mode || "LATIHAN",
        duration,
        passingScore: passingScore || 0,
        passingGrade: passingGrade || "D",
        sections: sections || [],
        totalQuestions: totalQuestions || 0,
        isActive: isActive ?? true,
        isPremium: isPremium ?? false,
        thumbnailUrl,
        attemptLimit: attemptLimit ?? -1,
        sectionsData,
        questionPool,
        creatorId: dbUser.id,
      },
    });

    return NextResponse.json({ paket }, { status: 201 });
  } catch (error) {
    console.error("POST /api/kompetensi error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}