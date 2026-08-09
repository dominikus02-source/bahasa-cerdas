import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const kategori = await db.nilaiKategori.findUnique({
      where: { id },
      include: { group: { select: { teacherId: true } } },
    });
    if (!kategori || kategori.group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const updated = await db.nilaiKategori.update({
      where: { id },
      data: { nama: body.nama, bobot: body.bobot },
    });

    return NextResponse.json({ kategori: updated });
  } catch (error) {
    console.error("PUT /api/guru/nilai-kategori error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const kategori = await db.nilaiKategori.findUnique({
      where: { id },
      include: { group: { select: { teacherId: true } } },
    });
    if (!kategori || kategori.group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.nilaiKategori.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/nilai-kategori error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
