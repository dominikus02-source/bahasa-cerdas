import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bankSoal = await db.bankSoal.findMany({
      where: { uploaderId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ bankSoal });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, type, difficulty, fileUrl, fileKey, fileType, kelas, semester, tahunAjaran, KD, isHOTS, jumlahSoal, subject } = body;

    const bankSoal = await db.bankSoal.create({
      data: {
        title: title || "Bank Soal",
        description,
        type: type || "PILIHAN_GANDA",
        difficulty: difficulty || "MEDIUM",
        fileUrl,
        fileKey,
        fileType: fileType || "PDF",
        kelas: kelas || "X",
        semester: semester || 1,
        tahunAjaran,
        KD,
        isHOTS: isHOTS || false,
        jumlahSoal: jumlahSoal || 10,
        subject: subject || "Bahasa Indonesia",
        uploaderId: user.id,
        isPublished: false,
      },
    });

    return NextResponse.json({ bankSoal }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}