import { identitySelect, resolveIdentity } from "@/lib/account/identity";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import { getDisplayName } from "@/lib/nickname";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cacheKey = `profile:public:v3:${id}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        avatar: true,
        ...identitySelect,
        xp: true,
        level: true,
        streak: true,
        league: true,
        createdAt: true,
        // Kosmetik toko koin — bingkai avatar, warna nama, badge
        equippedFrame: true,
        equippedNameColor: true,
        equippedBadge: true,
        profile: {
          select: {
            bio: true,
            school: true,
            subject: true,
          },
        },
      },
    });

    if (!user || user.fullName === "Akun dihapus") {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const [karyaCount, totalLikes, totalViews, works] = await Promise.all([
      db.studentKarya.count({ where: { userId: id } }),
      db.studentKarya.aggregate({ where: { userId: id }, _sum: { likesCount: true } }),
      db.studentKarya.aggregate({ where: { userId: id }, _sum: { viewsCount: true } }),
      db.studentKarya.findMany({
        where: { userId: id },
        select: { id: true, title: true, type: true, likesCount: true, viewsCount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const isStudent = user.role === "MURID";
    const displayName = isStudent ? (user.nickname?.trim() || "Murid BahasaCerdas") : getDisplayName(user, "peer");
    const profile = isStudent ? null : user.profile;

    const response = {
      user: {
        id: user.id,
        role: user.role,
        isFounder: user.isFounder,
        fullName: isStudent ? displayName : user.fullName,
        nickname: user.nickname,
        avatar: isStudent ? null : user.avatar,
        displayName,
        trialEndsAt: user.role === "GURU" ? user.trialEndsAt : null,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        league: user.league,
        createdAt: user.createdAt,
        equippedFrame: user.equippedFrame,
        equippedNameColor: user.equippedNameColor,
        equippedBadge: user.equippedBadge,
        profile,
        bio: profile?.bio ?? null,
        school: profile?.school ?? null,
        ...resolveIdentity(user),
      },
      works,
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
