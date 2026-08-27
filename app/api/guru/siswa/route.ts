import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent, getTeacherStudents, getTeacherStudentsForClass } from "@/lib/teacher/students";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Optional: filter by specific class membership
    const groupId = req.nextUrl.searchParams.get("groupId");
    const siswa = groupId
      ? await getTeacherStudentsForClass(dbUser.id, groupId)
      : await getTeacherStudents(dbUser.id);

    return NextResponse.json({ siswa });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}