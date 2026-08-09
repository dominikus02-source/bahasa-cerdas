import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { cekMisiGuru } from "@/lib/guru/misi-guru-status";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return err(ERR.UNAUTHORIZED.error, ERR.UNAUTHORIZED.code, ERR.UNAUTHORIZED.status);
    if (!isTeacherOrStudent(user)) return err(ERR.UNAUTHORIZED.error, ERR.UNAUTHORIZED.code, ERR.UNAUTHORIZED.status);

    const data = await cekMisiGuru(user.id);
    return NextResponse.json({ success: true, data });
  } catch {
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}
