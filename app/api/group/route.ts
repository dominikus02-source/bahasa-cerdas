import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isTeacherOrHigher(user: { role: string; isFounder: boolean }): boolean {
  return user.role === "GURU" || user.role === "ADMIN" || user.isFounder === true;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrHigher(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const groups = await db.group.findMany({
      where: { teacherId: dbUser.id, isActive: true },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, avatar: true } } },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/group error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat memuat kelas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrHigher(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa membuat kelas" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const grade = typeof body.grade === "string" ? body.grade.trim() : "";
    const tahunAjaran = typeof body.tahunAjaran === "string" ? body.tahunAjaran.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Nama kelas wajib diisi", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!grade) {
      return NextResponse.json({ error: "Tingkat/kelas wajib dipilih", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!tahunAjaran) {
      return NextResponse.json({ error: "Tahun ajaran wajib diisi", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    let code = generateCode();
    const existing = await db.group.findUnique({ where: { accessCode: code } });
    if (existing) code = generateCode();

    const group = await db.group.create({
      data: {
        name,
        description: description || null,
        grade,
        tahunAjaran,
        accessCode: code,
        teacherId: dbUser.id,
      },
    });

    return NextResponse.json({ group, code: group.accessCode }, { status: 201 });
  } catch (error) {
    console.error("POST /api/group error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat membuat kelas" }, { status: 500 });
  }
}
