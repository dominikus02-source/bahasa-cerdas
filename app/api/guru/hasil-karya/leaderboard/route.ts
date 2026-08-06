import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { RANK_META } from "@/lib/gamification/ranks";

// ════════════════════════════════════════════════════════════════════
// GET /api/guru/hasil-karya/leaderboard?scope=all|school|city|province|country
// Hasil Karya — hub sosial guru (additive, read-only).
// - topCreator : Top Creator Minggu Ini (karya + like + komentar terbanyak)
// - topSchools : Top 10 sekolah paling aktif (karya + like + komentar)
// - topTeachers: Top 10 Guru Penggerak Literasi
// - leaderboard: peringkat creator minggu ini (per scope)
// Semua dalam rentang minggu berjalan (Senin 00:00 WIB → sekarang).
// ════════════════════════════════════════════════════════════════════

const WIB_MS = 7 * 60 * 60 * 1000;

function weekStartWIB(): Date {
  const now = new Date(Date.now() + WIB_MS);
  const day = (now.getUTCDay() + 6) % 7; // Senin = 0
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - WIB_MS);
}

interface CreatorRow {
  user: {
    id: string;
    fullName: string;
    avatar: string | null;
    playerProfile?: { level: number; currentRank: string } | null;
    profile?: { school: string | null; city: string | null; province: string | null } | null;
  };
  karya: { id: string; title: string; type: string; likesCount: number; viewsCount: number; isFeatured: boolean };
  engagement: number;
  likes: number;
  comments: number;
}

const isTeacher = (user: { role: string; isFounder?: boolean }) =>
  user.role === "GURU" || user.role === "ADMIN" || !!user.isFounder;

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = req.nextUrl.searchParams.get("scope") || "all";
    const since = weekStartWIB();

    // 1) Karya minggu ini + agregat like/komentar (rentang sama)
    const [karyaList, likesAgg, commentsAgg] = await Promise.all([
      db.studentKarya.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true, title: true, type: true, likesCount: true, viewsCount: true, isFeatured: true,
          user: {
            select: {
              id: true, fullName: true, avatar: true,
              playerProfile: { select: { level: true, currentRank: true } },
              profile: { select: { school: true, city: true, province: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3000,
      }),
      db.studentKaryaLike.groupBy({ by: ["karyaId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      db.studentKaryaComment.groupBy({ by: ["karyaId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    ]);

    const likeMap = new Map(likesAgg.map((r) => [r.karyaId, r._count._all]));
    const commentMap = new Map(commentsAgg.map((r) => [r.karyaId, r._count._all]));

    const rows: CreatorRow[] = karyaList.map((k) => {
      const likes = likeMap.get(k.id) ?? 0;
      const comments = commentMap.get(k.id) ?? 0;
      return {
        user: k.user,
        karya: { ...k, likesCount: likes, viewsCount: k.viewsCount, isFeatured: k.isFeatured },
        engagement: likes + comments,
        likes,
        comments,
      };
    });

    // 2) Scope leaderboard (filter karya berdasarkan profil sekolah guru)
    let myProfile: { school: string | null; city: string | null; province: string | null } | null = null;
    if (scope !== "all" && scope !== "country") {
      const p = await db.profile.findUnique({ where: { userId: user.id }, select: { school: true, city: true, province: true } });
      myProfile = p;
    }

    let scopedRows = rows;
    if (scope === "school" && myProfile?.school) {
      scopedRows = rows.filter((r) => r.user.profile?.school === myProfile.school);
    } else if (scope === "city" && myProfile?.city) {
      scopedRows = rows.filter((r) => r.user.profile?.city === myProfile.city);
    } else if (scope === "province" && myProfile?.province) {
      scopedRows = rows.filter((r) => r.user.profile?.province === myProfile.province);
    }

    const leaderboard = scopedRows
      .sort((a, b) => b.engagement - a.engagement || b.likes - a.likes)
      .slice(0, 20)
      .map((r, i) => ({
        rank: i + 1,
        user: {
          id: r.user.id,
          fullName: r.user.fullName,
          avatar: r.user.avatar,
          level: r.user.playerProfile?.level ?? 0,
          rank: r.user.playerProfile?.currentRank ?? "BRONZE",
          rankTitle: RANK_META[r.user.playerProfile?.currentRank as keyof typeof RANK_META]?.title ?? "Pemula",
          school: r.user.profile?.school ?? null,
          city: r.user.profile?.city ?? null,
        },
        karya: { id: r.karya.id, title: r.karya.title, type: r.karya.type },
        engagement: r.engagement,
        likes: r.likes,
        comments: r.comments,
      }));

    // 3) Top Creator Minggu Ini (karya dengan engagement tertinggi)
    const best = [...rows].sort((a, b) => b.engagement - a.engagement || b.likes - a.likes)[0] ?? null;
    const topCreator = best
      ? {
          user: {
            id: best.user.id,
            fullName: best.user.fullName,
            avatar: best.user.avatar,
            school: best.user.profile?.school ?? null,
            level: best.user.playerProfile?.level ?? 0,
            rank: best.user.playerProfile?.currentRank ?? "BRONZE",
            rankTitle: RANK_META[best.user.playerProfile?.currentRank as keyof typeof RANK_META]?.title ?? "Pemula",
          },
          karya: { id: best.karya.id, title: best.karya.title, type: best.karya.type },
          likes: best.likes,
          comments: best.comments,
        }
      : null;

    // 4) Top 10 Sekolah Paling Aktif (karya + like + komentar minggu ini)
    const schoolMap = new Map<string, { karyaCount: number; likeCount: number; commentCount: number }>();
    for (const r of rows) {
      const school = r.user.profile?.school ?? "Tanpa Sekolah";
      const cur = schoolMap.get(school) ?? { karyaCount: 0, likeCount: 0, commentCount: 0 };
      cur.karyaCount += 1;
      cur.likeCount += r.likes;
      cur.commentCount += r.comments;
      schoolMap.set(school, cur);
    }
    const topSchools = [...schoolMap.entries()]
      .sort((a, b) => (b[1].karyaCount + b[1].likeCount + b[1].commentCount) - (a[1].karyaCount + a[1].likeCount + a[1].commentCount))
      .slice(0, 10)
      .map(([school, s], i) => ({
        rank: i + 1,
        school,
        karyaCount: s.karyaCount,
        likeCount: s.likeCount,
        commentCount: s.commentCount,
        total: s.karyaCount + s.likeCount + s.commentCount,
      }));

    // 5) Top 10 Guru Penggerak Literasi (murid upload + like + komentar minggu ini)
    const guruGroups = await db.group.findMany({
      where: { teacherId: user.id },
      select: {
        id: true,
        name: true,
        members: { select: { userId: true }, where: { role: "member" } },
      },
    });
    const memberSet = new Set(guruGroups.flatMap((g) => g.members.map((m) => m.userId)));
    const teacherStatMap = new Map<string, { muridKarya: number; likeCount: number; commentCount: number; school: string | null }>();
    for (const r of rows) {
      if (!memberSet.has(r.user.id)) continue;
      const school = r.user.profile?.school ?? null;
      const cur = teacherStatMap.get(school ?? "__none__") ?? { muridKarya: 0, likeCount: 0, commentCount: 0, school };
      cur.muridKarya += 1;
      cur.likeCount += r.likes;
      cur.commentCount += r.comments;
      teacherStatMap.set(school ?? "__none__", cur);
    }
    const topTeachers = [...teacherStatMap.entries()]
      .filter(([, s]) => s.school !== null)
      .sort((a, b) => (b[1].muridKarya + b[1].likeCount + b[1].commentCount) - (a[1].muridKarya + a[1].likeCount + a[1].commentCount))
      .slice(0, 10)
      .map(([, s], i) => ({
        rank: i + 1,
        school: s.school,
        muridKarya: s.muridKarya,
        likeCount: s.likeCount,
        commentCount: s.commentCount,
        total: s.muridKarya + s.likeCount + s.commentCount,
      }));

    const week = { start: since.toISOString(), end: new Date().toISOString() };

    return NextResponse.json({ week, topCreator, topSchools, topTeachers, leaderboard, scope, totalKarya: rows.length });
  } catch (error) {
    console.error("GET /api/guru/hasil-karya/leaderboard error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
