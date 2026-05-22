import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: dbUser.id } },
      include: {
        group: {
          include: {
            teacher: { select: { id: true, fullName: true, avatar: true } },
            members: {
              include: { user: { select: { id: true, fullName: true, avatar: true } } },
            },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Anda tidak tergabung di kelas ini" }, { status: 403 });
    }

    const group = membership.group;
    const ketua = group.members.find((m) => m.role === "ketua") || null;
    const currentMemberRole = membership.role;

    return NextResponse.json({ group, ketua, currentMemberRole });
  } catch (error) {
    console.error("GET /api/group/[id]/student error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
