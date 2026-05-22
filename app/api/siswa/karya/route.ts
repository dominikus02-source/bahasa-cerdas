import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const featured = searchParams.get("featured") === "true";

    const where: any = {};
    if (type) where.type = type;
    if (featured) where.isFeatured = true;

    const [karya, total] = await Promise.all([
      db.studentKarya.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatar: true, profile: { select: { school: true, city: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.studentKarya.count({ where }),
    ]);

    return NextResponse.json({ karya, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, content, type, coverImage } = body;

    if (!title || !content || !type) {
      return NextResponse.json({ error: "title, content, dan type wajib diisi" }, { status: 400 });
    }

    const excerpt = content.replace(/<[^>]*>/g, "").slice(0, 150);

    const karya = await db.studentKarya.create({
      data: {
        title,
        content,
        excerpt,
        type,
        coverImage,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true, profile: { select: { school: true, city: true } } } },
      },
    });

    await Promise.all([
      awardCoins(user.id, "MENULIS_KARYA", karya.id),
      trackDailyStreak(user.id),
      trackQuestProgress(user.id, "MENULIS"),
    ]);

    return NextResponse.json({ karya, coinsEarned: 10 }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
