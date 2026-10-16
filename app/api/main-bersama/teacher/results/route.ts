import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveVerifiedTeacherActor } from "@/src/main-bersama/adapters/auth/teacher-actor";

export async function GET(request: NextRequest) {
  const actor = await resolveVerifiedTeacherActor();
  if (!actor)
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED" },
      { status: 401 },
    );
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId)
    return NextResponse.json(
      { ok: false, code: "SESSION_NOT_FOUND" },
      { status: 400 },
    );
  try {
    const session = await db.mainSession.findFirst({
      where: { id: sessionId, teacherId: actor.userId },
      select: { classId: true, phase: true },
    });
    if (!session)
      return NextResponse.json(
        { ok: false, code: "SESSION_NOT_FOUND" },
        { status: 404 },
      );
    if (session.phase !== "SUMMARY" && session.phase !== "ENDED")
      return NextResponse.json(
        { ok: false, code: "INVALID_PHASE" },
        { status: 400 },
      );
    const groups = await db.group.findMany({
      where: { teacherId: actor.userId, isActive: true },
      select: { id: true, name: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
    const saved = await db.nilai.findMany({
      where: {
        sumberType: "MAIN_BERSAMA",
        sumberId: sessionId,
        groupId: { in: groups.map((group) => group.id) },
      },
      distinct: ["groupId", "userId"],
      select: { groupId: true },
    });
    const counts = new Map<string, number>();
    for (const entry of saved)
      counts.set(entry.groupId, (counts.get(entry.groupId) ?? 0) + 1);
    return NextResponse.json(
      {
        ok: true,
        classId: session.classId,
        classes: groups.map((group) => ({
          id: group.id,
          name: group.name,
          memberCount: group._count.members,
          savedCount: counts.get(group.id) ?? 0,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, code: "INTERNAL" }, { status: 500 });
  }
}
