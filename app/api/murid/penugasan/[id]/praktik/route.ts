import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

// Student submits a Praktik result (photo/document URL). It then awaits the
// teacher's manual review + grade (Google-Classroom style).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { url } = await req.json().catch(() => ({}));
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Berkas praktik belum ada." }, { status: 400 });
    }

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      include: { group: { include: { members: { where: { userId: user.id }, select: { id: true } } } } },
    });
    if (!penugasan || penugasan.group.members.length === 0) {
      return NextResponse.json({ error: "Tugas tidak ditemukan", code: "TUGAS_NOT_FOUND" }, { status: 404 });
    }

    await db.penugasanSubmission.upsert({
      where: { penugasanId_userId: { penugasanId: id, userId: user.id } },
      update: { praktikUrl: url, praktikDinilai: false, startedAt: new Date() },
      create: { penugasanId: id, userId: user.id, status: "IN_PROGRESS", praktikUrl: url, startedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/murid/penugasan/[id]/praktik error:", error);
    return NextResponse.json({ error: "Praktik belum berhasil dikirim. Silakan coba lagi." }, { status: 500 });
  }
}
