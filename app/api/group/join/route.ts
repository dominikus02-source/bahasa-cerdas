import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { accessCode } = body;

    if (!accessCode) return NextResponse.json({ error: "Kode akses wajib diisi" }, { status: 400 });

    const group = await db.group.findUnique({
      where: { accessCode: accessCode.toUpperCase(), isActive: true },
    });

    if (!group) return NextResponse.json({ error: "Kode tidak valid atau grup sudah tidak aktif" }, { status: 404 });

    const existing = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: dbUser.id } },
    });

    if (existing) return NextResponse.json({ error: "Anda sudah terdaftar di grup ini", group }, { status: 409 });

    const member = await db.groupMember.create({
      data: { groupId: group.id, userId: dbUser.id },
    });

    return NextResponse.json({ message: "Berhasil bergabung", group, member });
  } catch (error) {
    console.error("POST /api/group/join error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}