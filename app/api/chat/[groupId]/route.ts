import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;

    // Access: the class teacher (owner), an enrolled member, or admin/founder.
    // `isActive` wajib: kelas yang sudah diarsipkan guru (isActive=false) tidak
    // boleh lagi dibuka chat-nya — integritas akses, bukan sekadar tampilan.
    const group = await db.group.findUnique({
      where: { id: groupId, isActive: true },
      select: { teacherId: true, chatLocked: true },
    });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan", code: "CLASS_NOT_FOUND" }, { status: 404 });

    let allowed = group.teacherId === user.id || user.role === "ADMIN" || user.isFounder;
    const isTeacher = group.teacherId === user.id;
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
      return NextResponse.json({
        messages: sanitizeMessages(messages),
        locked: group.chatLocked,
        moderation: isTeacher ? await moderationStats(db, groupId) : undefined,
      });
    }

    const messages = await db.chatMessage.findMany({
      where: { groupId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      messages: sanitizeMessages(messages.reverse()),
      locked: group.chatLocked,
      moderation: isTeacher ? await moderationStats(db, groupId) : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Pesan yang di-soft-delete guru (moderasi) tidak pernah bocor isinya ke
// klien — hanya placeholder. Konten asli tetap aman di database untuk audit.
function sanitizeMessages(messages: any[]) {
  return messages.map((m) =>
    m.deletedAt
      ? { id: m.id, deleted: true, content: null, createdAt: m.createdAt, user: null }
      : { id: m.id, deleted: false, content: m.content, createdAt: m.createdAt, user: m.user }
  );
}

// Statistik moderasi guru (hanya dikirim ke guru kelas): hitungan WIB hari ini.
function moderationStats(db: any, groupId: string) {
  const wibOffset = 7 * 60 * 60 * 1000;
  const startWIB = new Date(Date.now() + wibOffset);
  startWIB.setUTCHours(0, 0, 0, 0);
  const startToday = new Date(startWIB.getTime() - wibOffset);
  return Promise.all([
    db.chatMessage.count({ where: { groupId, createdAt: { gte: startToday } } }),
    db.chatMessage.count({ where: { groupId, deletedAt: { not: null } } }),
  ]).then(([messagesToday, messagesDeleted]) => ({ messagesToday, messagesDeleted }));
}
