import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Guru meninjau & menilai jawaban konstruktif (Menulis/Berbicara) murid di kelasnya.
async function guruStudentIds(teacherId: string): Promise<string[]> {
  const members = await db.groupMember.findMany({
    where: { group: { teacherId } },
    select: { userId: true },
  });
  return Array.from(new Set(members.map((m) => m.userId)));
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isGuru = user.role === "GURU" || user.role === "ADMIN" || user.isFounder;
    if (!isGuru) return NextResponse.json({ error: "Khusus guru" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const paketId = searchParams.get("paketId") || undefined;

    const studentIds = await guruStudentIds(user.id);
    if (studentIds.length === 0) return NextResponse.json({ items: [] });

    const rows = await db.testAnswer.findMany({
      where: {
        userId: { in: studentIds },
        ...(paketId ? { paketId } : {}),
        OR: [{ questionType: "CONSTRUCTED" }, { seksi: { in: ["MENULIS", "BERBICARA"] } }],
        answer: { not: "" },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    if (rows.length === 0) return NextResponse.json({ items: [] });

    const qIds = Array.from(new Set(rows.map((r) => r.questionId).filter(Boolean))) as string[];
    const uIds = Array.from(new Set(rows.map((r) => r.userId)));
    const [questions, users] = await Promise.all([
      db.uKBIQuestion.findMany({ where: { id: { in: qIds } }, select: { id: true, text: true, seksi: true } }),
      db.user.findMany({ where: { id: { in: uIds } }, select: { id: true, fullName: true } }),
    ]);
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const uMap = new Map(users.map((u) => [u.id, u.fullName]));

    const items = rows.map((r) => {
      const seksi = (r.seksi || qMap.get(r.questionId || "")?.seksi || "").toUpperCase();
      const isAudio = seksi === "BERBICARA" && !!r.answer && /^https?:\/\//.test(r.answer);
      return {
        id: r.id,
        student: uMap.get(r.userId) || "Murid",
        seksi,
        questionText: qMap.get(r.questionId || "")?.text || "",
        answer: r.answer || "",
        isAudio,
        score: r.score ?? 0,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isGuru = user.role === "GURU" || user.role === "ADMIN" || user.isFounder;
    if (!isGuru) return NextResponse.json({ error: "Khusus guru" }, { status: 403 });

    const body = await req.json();
    const answerId = String(body.answerId || "");
    const score = Number(body.score);
    if (!answerId || Number.isNaN(score)) {
      return NextResponse.json({ error: "answerId & score wajib" }, { status: 400 });
    }

    const row = await db.testAnswer.findUnique({ where: { id: answerId }, select: { userId: true } });
    if (!row) return NextResponse.json({ error: "Jawaban tidak ditemukan" }, { status: 404 });

    // Pastikan murid ini ada di kelas guru (kecuali admin/founder).
    if (!(user.role === "ADMIN" || user.isFounder)) {
      const students = await guruStudentIds(user.id);
      if (!students.includes(row.userId)) {
        return NextResponse.json({ error: "Murid ini bukan di kelasmu" }, { status: 403 });
      }
    }

    await db.testAnswer.update({
      where: { id: answerId },
      data: { score: Math.max(0, Math.min(100, score)), isCorrect: score > 0 },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan nilai" }, { status: 500 });
  }
}
