import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const kategoriId = searchParams.get("kategoriId");
    const userId = searchParams.get("userId");

    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const where: any = { groupId };
    if (kategoriId) where.kategoriId = kategoriId;
    if (userId) where.userId = userId;

    const nilais = await db.nilai.findMany({
      where,
      include: {
        kategori: { select: { id: true, nama: true, bobot: true } },
        user: { select: { id: true, fullName: true, avatar: true, profile: { select: { nisn: true, school: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ nilais });
  } catch (error) {
    console.error("GET /api/guru/nilai error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, groupId, kategoriId, skor, sumberType, sumberId, keterangan } = body;

    if (!userId || !groupId || !kategoriId || skor === undefined || !sumberType) {
      return NextResponse.json({ error: "userId, groupId, kategoriId, skor, sumberType wajib" }, { status: 400 });
    }

    if (skor < 0 || skor > 100) {
      return NextResponse.json({ error: "Skor harus 0-100" }, { status: 400 });
    }

    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Upsert — if same userId + kategoriId + sumberType + sumberId exists, update
    const existing = await db.nilai.findFirst({
      where: { userId, kategoriId, sumberType, sumberId: sumberId || null },
    });

    let nilai;
    if (existing) {
      nilai = await db.nilai.update({
        where: { id: existing.id },
        data: { skor, keterangan, groupId },
      });
    } else {
      nilai = await db.nilai.create({
        data: { userId, groupId, kategoriId, skor, sumberType, sumberId: sumberId || null, keterangan },
      });
    }

    return NextResponse.json({ nilai }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("POST /api/guru/nilai error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
