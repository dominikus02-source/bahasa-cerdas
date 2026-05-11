import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { bankSoalList } = body;

    if (!Array.isArray(bankSoalList) || bankSoalList.length === 0) {
      return NextResponse.json({ error: "Invalid bank soal list" }, { status: 400 });
    }

    const created = await db.bankSoal.createMany({
      data: bankSoalList.map((soal: any) => ({
        title: soal.title || "Bank Soal",
        description: soal.description,
        type: soal.type || "PILIHAN_GANDA",
        difficulty: soal.difficulty || "MEDIUM",
        fileUrl: soal.fileUrl,
        fileKey: soal.fileKey,
        fileType: soal.fileType || "PDF",
        kelas: soal.kelas || "X",
        semester: soal.semester || 1,
        tahunAjaran: soal.tahunAjaran,
        KD: soal.KD,
        isHOTS: soal.isHOTS || false,
        jumlahSoal: soal.jumlahSoal || 10,
        subject: soal.subject || "Bahasa Indonesia",
        uploaderId: user.id,
        isPublished: false,
      })),
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}