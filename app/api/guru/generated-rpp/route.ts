import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const where: any = { uploaderId: dbUser.id };
    if (type) where.type = type;

    const [list, total] = await Promise.all([
      db.generatedRPP.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
      db.generatedRPP.count({ where }),
    ]);

    return NextResponse.json({ data: list, total });
  } catch (error) {
    console.error("GET /api/guru/generated-rpp error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const body = await req.json();
    const { type, title, description, kelas, semester, tahunAjaran, kds, methods, curriculum, schoolInfo, content } = body;

    if (!title || !kelas || !content) {
      return NextResponse.json({ error: "title, kelas, and content are required" }, { status: 400 });
    }

    const rpp = await db.generatedRPP.create({
      data: {
        type: type || "RPP",
        title,
        description,
        kelas,
        semester: semester || "1 (Ganjil)",
        tahunAjaran: tahunAjaran || "2025/2026",
        curriculum: curriculum || "MERDEKA",
        schoolInfo: schoolInfo || null,
        kds: kds || [],
        methods: methods || [],
        content,
        isPublished: true,
        uploaderId: dbUser.id,
      },
    });

    return NextResponse.json({ success: true, data: rpp }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/generated-rpp error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await db.generatedRPP.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    await db.generatedRPP.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/generated-rpp error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
