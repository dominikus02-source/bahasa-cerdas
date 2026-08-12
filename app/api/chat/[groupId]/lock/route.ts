import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// POST /api/chat/[groupId]/lock — kunci/buka obrolan kelas (guru saja).
//
// Authorization (server-side):
//  1. authenticated?
//  2. group exists AND active?
//  3. requester is the class teacher (admin/founder)?
//  4. update lock state.
// Murid dan guru kelas lain selalu ditolak (403) — role tidak pernah
// dipercaya dari client.
export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const body = await req.json();
    const locked = Boolean(body?.locked);

    const group = await db.group.findUnique({
      where: { id: groupId, isActive: true },
      select: { id: true, teacherId: true },
    });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan", code: "CLASS_NOT_FOUND" }, { status: 404 });

    const isTeacher = group.teacherId === user.id || user.role === "ADMIN" || user.isFounder;
    if (!isTeacher) {
      return NextResponse.json({ error: "Hanya guru kelas yang bisa mengelola obrolan", code: "CHAT_LOCK_FORBIDDEN" }, { status: 403 });
    }

    await db.group.update({
      where: { id: group.id },
      data: { chatLocked: locked },
    });

    return NextResponse.json({ success: true, locked });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
