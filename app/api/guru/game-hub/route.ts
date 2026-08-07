import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Optional filter params (additive; tanpa params = perilaku legacy):
//   page, limit  → paginasi untuk halaman riwayat aktivitas
//   search       → cari nama murid (contains, case-insensitive)
//   muridId      → filter satu murid
//   gameType     → filter GameType enum
//   roomId       → filter berdasarkan nama ruang gim (identitas game unik)
//   from, to     → rentang tanggal (YYYY-MM-DD, WIB)
export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "GURU" && !user.isFounder && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = new URL(request.url).searchParams;
    const studentIdsRes = await db.groupMember.findMany({
      where: { group: { teacherId: user.id, isActive: true } },
      select: { userId: true },
    });
    const studentIds = studentIdsRes.map((s) => s.userId);

    const whereStudent: any = { userId: { in: studentIds } };
    const studentParam = params.get("murid");
    if (studentIds.length > 0 && studentParam) {
      whereStudent.userId = { in: [studentParam] };
    }
    const gameType = params.get("gameType")?.trim();
    if (gameType) {
      whereStudent.room = { gameType: gameType as any };
    }
    const roomId = params.get("roomId")?.trim();
    if (roomId) {
      whereStudent.roomId = roomId;
    }
    const search = params.get("search")?.trim();
    if (search) {
      whereStudent.user = { fullName: { contains: search, mode: "insensitive" } };
    }
    const from = params.get("from")?.trim();
    const to = params.get("to")?.trim();
    if (from || to) {
      whereStudent.createdAt = {};
      if (from) whereStudent.createdAt.gte = new Date(`${from}T00:00:00+07:00`);
      if (to) whereStudent.createdAt.lte = new Date(`${to}T23:59:59+07:00`);
    }

    const rawPage = parseInt(params.get("page") || "1", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const rawLimit = parseInt(params.get("limit") || "20", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const isFiltered = !!params.get("page") || !!params.get("search") || !!params.get("murid") || !!params.get("gameType") || !!params.get("roomId") || !!params.get("from") || !!params.get("to");

    const [questionCount, recentResults, activeRooms, total, studentResults, gameOptions] = await Promise.all([
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
      studentIds.length > 0 && isFiltered
        ? db.gameResult.count({ where: whereStudent })
        : studentIds.length > 0
          ? db.gameResult.count({ where: { userId: { in: studentIds } } })
          : 0,
      studentIds.length > 0
        ? db.gameResult.findMany({
            where: whereStudent,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              room: { select: { name: true, gameType: true } },
              session: { select: { joinedAt: true, finishedAt: true } },
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true,
                  xp: true,
                  streak: true,
                  level: true,
                  profile: { select: { school: true } },
                },
              },
            },
          })
        : [],
      studentIds.length > 0
        ? db.gameResult.findMany({
            where: { userId: { in: studentIds } },
            select: { roomId: true, room: { select: { name: true, gameType: true } } },
            distinct: ["roomId"],
            orderBy: { createdAt: "desc" },
          })
        : [],
    ]);

    return NextResponse.json({
      questionCount,
      myResults: recentResults,
      studentResults,
      activeRooms,
      // ── additive: metadata untuk halaman riwayat ─────────────
      total: total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
      games: gameOptions,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
