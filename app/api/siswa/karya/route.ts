import { NextRequest, NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { karyaSchema, sanitize } from "@/lib/validations";
import cache from "@/lib/redis";
import { invalidateKaryaCache } from "@/lib/ai-queue";
import { getDisplayName } from "@/lib/nickname";

function withDisplayName<T extends { user: { fullName: string; nickname?: string | null } }>(item: T) {
  return { ...item, user: { ...item.user, displayName: getDisplayName(item.user, "peer") } };
}

async function attachLikedStatus<T extends { id: string }>(
  items: T[],
  userId: string | null,
): Promise<(T & { likedByCurrentUser: boolean })[]> {
  if (!userId || items.length === 0) {
    return items.map((k) => ({ ...k, likedByCurrentUser: false }));
  }
  const likes = await db.studentKaryaLike.findMany({
    where: { userId, karyaId: { in: items.map((k) => k.id) } },
    select: { karyaId: true },
  });
  const likedIds = new Set(likes.map((l) => l.karyaId));
  return items.map((k) => ({ ...k, likedByCurrentUser: likedIds.has(k.id) }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const cursor = searchParams.get("cursor");
    const featured = searchParams.get("featured") === "true";

    const user = await getUser();
    const userId = user?.id || null;

    const where: any = {};
    if (type) where.type = type;
    if (featured) where.isFeatured = true;

    const karya = await db.studentKarya.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, nickname: true, avatar: true, profile: { select: { school: true, city: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = karya.length > limit;
    const items = hasMore ? karya.slice(0, limit) : karya;

    const withDisplay = items.map((k) => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      user: { ...k.user, displayName: getDisplayName(k.user, "peer") },
    }));

    const withLikes = await attachLikedStatus(withDisplay, userId);

    const total = await db.studentKarya.count({ where });

    return NextResponse.json({
      karya: withLikes,
      total,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching karya:", error);
    return NextResponse.json({ error: "Gagal memuat karya" }, { status: 500 });
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
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitize(parsed.data.konten);
    const excerpt = sanitizedContent.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);

    const karya = await db.studentKarya.create({
      data: {
        userId: user.id,
        title: parsed.data.judul,
        type: parsed.data.jenis,
        content: sanitizedContent,
        excerpt,
      },
    });

    awardCoins(user.id, "MENULIS_KARYA", `Karya: ${karya.title}`).catch(() => {});
    trackQuestProgress(user.id, "TULIS_KARYA").catch(() => {});
    if (!user.isFounder) trackDailyStreak(user.id).catch(() => {});

    invalidateKaryaCache().catch(() => {});

    return NextResponse.json({ karya }, { status: 201 });
  } catch (error) {
    console.error("Error creating karya:", error);
    return NextResponse.json({ error: "Gagal membuat karya" }, { status: 500 });
  }
}
