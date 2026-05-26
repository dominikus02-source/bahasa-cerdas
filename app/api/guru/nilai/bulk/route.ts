import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
    }

    const body = await req.json();
    const { groupId, kategoriId, scores } = body;
    // scores: [{ userId, skor, keterangan? }]

    if (!groupId || !kategoriId || !scores?.length) {
      return NextResponse.json({ error: "groupId, kategoriId, scores wajib" }, { status: 400 });
    }

    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let created = 0, updated = 0;

    for (const s of scores) {
      if (s.skor === undefined || s.skor === null) continue;
      const skor = Math.min(100, Math.max(0, Math.round(s.skor)));

      const existing = await db.nilai.findFirst({
        where: { userId: s.userId, kategoriId, sumberType: "MANUAL", sumberId: null },
      });

      if (existing) {
        await db.nilai.update({ where: { id: existing.id }, data: { skor, keterangan: s.keterangan || null } });
        updated++;
      } else {
        await db.nilai.create({
          data: { userId: s.userId, groupId, kategoriId, skor, sumberType: "MANUAL", keterangan: s.keterangan || null },
        });
        created++;
      }
    }

    return NextResponse.json({ created, updated, total: created + updated });
  } catch (error) {
    console.error("POST /api/guru/nilai/bulk error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
