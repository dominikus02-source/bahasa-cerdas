import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "GURU" && !user.isFounder && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [questionCount, recentResults, activeRooms] = await Promise.all([
      db.gameQuestion.count(),
      db.gameResult.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { room: { select: { name: true, gameType: true } } },
      }),
      db.gameRoom.findMany({
        where: { hostId: user.id, status: { in: ["WAITING", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const studentIds = await db.groupMember.findMany({
      where: { group: { teacherId: user.id, isActive: true } },
      select: { userId: true },
    });

    const studentResults = studentIds.length > 0
      ? await db.gameResult.findMany({
          where: { userId: { in: studentIds.map(s => s.userId) } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            room: { select: { name: true, gameType: true } },
            user: { select: { id: true, fullName: true, avatar: true } },
          },
        })
      : [];

    return NextResponse.json({
      questionCount,
      myResults: recentResults,
      studentResults,
      activeRooms,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
