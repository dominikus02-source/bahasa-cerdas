import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pools = await db.paketKompetensi.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { title: "asc" }],
      take: 50,
    });

    return NextResponse.json({ pools });
  } catch (error) {
    console.error("GET /api/guru/soal-pool error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
