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
    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const kategori = await db.nilaiKategori.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ kategori });
  } catch (error) {
    console.error("GET /api/guru/nilai-kategori error:", error);
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
    const { groupId, nama, bobot } = body;
    if (!groupId || !nama) {
      return NextResponse.json({ error: "groupId dan nama wajib" }, { status: 400 });
    }

    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const kategori = await db.nilaiKategori.create({
      data: { groupId, nama, bobot: bobot || 100 },
    });

    return NextResponse.json({ kategori }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/nilai-kategori error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
