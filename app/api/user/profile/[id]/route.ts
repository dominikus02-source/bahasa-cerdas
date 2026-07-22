import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

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
        _count: {
          select: {
            karya: true,
            artikel: true,
            soals: true,
            ukbiQuestions: true,
            tkaQuestions: true,
            uploadedBankSoals: true,
            uploadedMateris: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // The student's own writings (puisi/cerpen/etc). The profile only ever
    // showed a "Karya" count that reads User.karya — the marketplace relation,
    // which is 0 for students — so a student who had written six pieces saw
    // "Karya 0" and no list. These are the works they actually made.
    const [works, totalWorks] = await Promise.all([
      db.studentKarya.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: { id: true, title: true, type: true, likesCount: true, viewsCount: true, createdAt: true },
      }),
      db.studentKarya.count({ where: { userId: id } }),
    ]);

    // Hitung total penjualan karya
    const totalSold = await db.pembelian.count({
      where: {
        karya: { sellerId: id },
        status: "PAID",
      },
    });

    // Hitung total downloads karya
    const totalDownloads = await db.karya.aggregate({
      where: { sellerId: id, isPublished: true },
      _sum: { downloads: true },
    });

    const result = {
      user: {
        id: user.id,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
        isFounder: user.isFounder,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        league: user.league,
        joinedAt: user.createdAt,
        profile: user.profile,
        works,
        stats: {
          totalKarya: totalWorks,
          totalArtikel: user._count.artikel,
          totalSoal: user._count.soals + user._count.ukbiQuestions + user._count.tkaQuestions + user._count.uploadedBankSoals,
          totalMateri: user._count.uploadedMateris,
          totalSold,
          totalDownloads: totalDownloads._sum.downloads || 0,
        },
      },
    };

    await cache.set(cacheKey, result, 60); // 1 min — profile data changes moderately

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("GET /api/user/profile/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
