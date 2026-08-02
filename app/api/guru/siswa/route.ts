import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groups = await db.group.findMany({
      where: { teacherId: dbUser.id, isActive: true },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true, fullName: true, avatar: true, email: true,
                xp: true, level: true, streak: true, league: true, lastActiveAt: true,
                profile: { select: { noAbsen: true, nisn: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const siswa = groups.flatMap((group) =>
      group.members.map((m) => ({
        ...m.user,
        groupId: group.id,
        groupName: group.name,
      }))
    );

    return NextResponse.json({ siswa });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
