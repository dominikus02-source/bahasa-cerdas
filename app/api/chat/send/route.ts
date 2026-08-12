import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId, content } = await req.json();
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (!groupId || !trimmed) {
      return NextResponse.json({ error: "Isi pesan tidak boleh kosong.", code: "CLASS_MESSAGE_EMPTY" }, { status: 400 });
    }
    if (trimmed.length > 1000) {
      return NextResponse.json({ error: "Pesan terlalu panjang (maksimal 1000 karakter).", code: "CLASS_MESSAGE_TOO_LONG" }, { status: 400 });
    }

    // Access: the class teacher (owner), an enrolled member, or admin/founder.
    // `isActive` wajib: kelas yang sudah diarsipkan guru tidak boleh menerima
    // pesan baru — integritas akses (history tetap aman di database).
    const group = await db.group.findUnique({
      where: { id: groupId, isActive: true },
      select: { teacherId: true, chatLocked: true },
    });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan", code: "CLASS_NOT_FOUND" }, { status: 404 });

    let allowed = group.teacherId === user.id || user.role === "ADMIN" || user.isFounder;
    const isTeacher = group.teacherId === user.id || user.role === "ADMIN" || user.isFounder;
    if (!allowed) {
      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });
      allowed = !!membership;
    }
    if (!allowed) {
      return NextResponse.json({ error: "Kamu tidak memiliki akses ke kelas ini.", code: "CLASS_MESSAGE_FORBIDDEN" }, { status: 403 });
    }

    // Chat lock server-enforced: hanya guru kelas (dan admin/founder) yang
    // boleh tetap menulis saat obrolan dikunci. Murid ditolak 403.
    if (group.chatLocked && !isTeacher) {
      return NextResponse.json(
        { error: "Obrolan sedang dikunci oleh guru.", code: "CLASS_CHAT_LOCKED" },
        { status: 403 }
      );
    }

    // Light sanitize: strip HTML tags but keep ordinary text (render is already
    // React-escaped, so this is defense-in-depth).
    const safe = trimmed.replace(/<\/?[a-z][^>]*>/gi, "").slice(0, 1000);

    const message = await db.chatMessage.create({
      data: { groupId, userId: user.id, content: safe },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Pesan belum terkirim. Silakan coba lagi.", code: "CLASS_MESSAGE_SEND_FAILED" }, { status: 500 });
  }
}
