import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;

    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before");

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
