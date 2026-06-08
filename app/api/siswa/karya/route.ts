import { NextRequest, NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { karyaSchema, sanitize } from "@/lib/validations";
import cache from "@/lib/redis";
import { invalidateKaryaCache } from "@/lib/ai-queue";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const cursor = searchParams.get("cursor");
    const featured = searchParams.get("featured") === "true";
    const groupId = searchParams.get("groupId");

    const cacheKey = `karya:feed:cursor:${type || "all"}:${cursor || "start"}:${limit}`;

    const cached = await cache.get<{ karya: unknown[]; nextCursor: string | null; total: number }>(cacheKey);
    if (cached && !/page=\d+/.test(req.url)) {
      return NextResponse.json({
        karya: cached.karya,
        nextCursor: cached.nextCursor,
        total: cached.total,
      });
    }

    const where: any = {};
    if (type) where.type = type;
    if (featured) where.isFeatured = true;

    if (groupId) {
      const supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const dbUser = await db.user.findUnique({ where: { supabaseId: authUser.id } });
        if (dbUser) {
          const group = await db.group.findUnique({
            where: { id: groupId },
            select: { teacherId: true },
          });
          if (group && group.teacherId === dbUser.id) {
            const members = await db.groupMember.findMany({
              where: { groupId, role: "member" },
              select: { userId: true },
            });
            where.userId = { in: members.map(m => m.userId) };
          }
        }
      }
    }

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const [karya, total] = await Promise.all([
      db.studentKarya.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatar: true, profile: { select: { school: true, city: true } } } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      }),
      db.studentKarya.count({ where: { ...where, createdAt: undefined } }),
    ]);

    const hasMore = karya.length > limit;
    const items = hasMore ? karya.slice(0, limit) : karya;
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    const result = { karya: items, nextCursor, total };
    await cache.set(cacheKey, result, 120);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = karyaSchema.safeParse({
      judul: body.title,
      jenis: body.type,
      konten: body.content,
      coverImage: body.coverImage || null,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { judul, konten, jenis, coverImage } = parsed.data;
    const sanitizedContent = sanitize(konten);
    const excerpt = sanitizedContent.replace(/<[^>]*>/g, "").slice(0, 150);

    const karya = await db.studentKarya.create({
      data: {
        title: sanitize(judul),
        content: sanitizedContent,
        excerpt,
        type: jenis,
        coverImage: coverImage || null,
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
      invalidateKaryaCache(),
    ]);

    return NextResponse.json({ karya, coinsEarned: 10 }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
