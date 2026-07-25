import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import { getDisplayName } from "@/lib/nickname";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cacheKey = `profile:public:${id}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        avatar: true,
        role: true,
        isFounder: true,
        isPremium: true,
        premiumPlan: true,
        xp: true,
        level: true,
        streak: true,
        league: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            nip: true,
            nuptk: true,
            school: true,
            subject: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const [karyaCount, totalLikes, totalViews] = await Promise.all([
      db.studentKarya.count({ where: { userId: id } }),
      db.studentKarya.aggregate({ where: { userId: id }, _sum: { likesCount: true } }),
      db.studentKarya.aggregate({ where: { userId: id }, _sum: { viewsCount: true } }),
    ]);

    const response = {
      user: {
        ...user,
        displayName: getDisplayName(user, "peer"),
        bio: user.profile?.bio || null,
        school: user.profile?.school || null,
      },
      stats: {
        karyaCount,
        totalLikes: totalLikes._sum.likesCount || 0,
        totalViews: totalViews._sum.viewsCount || 0,
      },
    };

    await cache.set(cacheKey, response, 300);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}
