import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// DELETE /api/chat/message/[messageId] — moderasi pesan (soft-delete).
//
// Authorization (server-side):
//  1. authenticated?
//  2. message exists?
//  3. message belongs to an ACTIVE group?
//  4. requester owns the message OR requester is the class teacher (admin/founder)?
//  5. execute (set deletedAt/deletedBy — konten tidak pernah dihapus dari DB,
//     audit tetap utuh; klien hanya melihat placeholder "Pesan telah dihapus").
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await params;

    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true, groupId: true, deletedAt: true, group: { select: { isActive: true, teacherId: true } } },
    });
    if (!message || !message.group.isActive) {
      return NextResponse.json({ error: "Pesan tidak ditemukan", code: "CHAT_MESSAGE_NOT_FOUND" }, { status: 404 });
    }
    if (message.deletedAt) {
      return NextResponse.json({ success: true, id: message.id, deleted: true });
    }

    const isTeacher = message.group.teacherId === user.id || user.role === "ADMIN" || user.isFounder;
    const isOwner = message.userId === user.id;
    if (!isOwner && !isTeacher) {
      return NextResponse.json({ error: "Tidak memiliki izin", code: "CHAT_DELETE_FORBIDDEN" }, { status: 403 });
    }

    await db.chatMessage.update({
      where: { id: message.id },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });

    return NextResponse.json({ success: true, id: message.id, deleted: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
