import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;

    // Access: the class teacher (owner), an enrolled member, or admin/founder.
    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan", code: "CLASS_NOT_FOUND" }, { status: 404 });

    let allowed = group.teacherId === user.id || user.role === "ADMIN" || user.isFounder;
    if (!allowed) {
      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });
      allowed = !!membership;
    }
    if (!allowed) return NextResponse.json({ error: "Tidak memiliki akses", code: "CLASS_MESSAGE_FORBIDDEN" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);
    const before = searchParams.get("before");
    // `after` powers polling: the client sends the timestamp of the newest
    // message it already has, so a quiet class costs an empty array instead of
    // re-sending the last 50 messages every few seconds. Served by the existing
    // @@index([groupId, createdAt]).
    const after = searchParams.get("after");
    const afterDate = after ? new Date(after) : null;
    const validAfter = afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;

    if (validAfter) {
      const messages = await db.chatMessage.findMany({
        where: { groupId, createdAt: { gt: validAfter } },
        include: { user: { select: { id: true, fullName: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
      return NextResponse.json({ messages });
    }

    const messages = await db.chatMessage.findMany({
      where: { groupId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
