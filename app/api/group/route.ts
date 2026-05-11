import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
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
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/group error:", error);
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
      return NextResponse.json({ error: "Hanya guru yang bisa membuat grup" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, grade, tahunAjaran } = body;

    let code = generateCode();
    const existing = await db.group.findUnique({ where: { accessCode: code } });
    if (existing) code = generateCode();

    const group = await db.group.create({
      data: {
        name,
        description,
        grade,
        tahunAjaran,
        accessCode: code,
        teacherId: dbUser.id,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("POST /api/group error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}