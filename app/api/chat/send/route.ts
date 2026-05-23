import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId, content } = await req.json();
    if (!groupId || !content?.trim()) {
      return NextResponse.json({ error: "groupId dan content wajib diisi" }, { status: 400 });
    }

    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const message = await db.chatMessage.create({
      data: { groupId, userId: user.id, content: content.trim() },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
