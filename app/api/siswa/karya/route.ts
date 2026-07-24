import { NextRequest, NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { karyaSchema, sanitize } from "@/lib/validations";
import cache from "@/lib/redis";
import { invalidateKaryaCache } from "@/lib/ai-queue";
import { getDisplayName } from "@/lib/nickname";

// Peers/public only ever see the nickname layer for a karya's author — guru
// consumers of this same endpoint (e.g. guru/feed-karya) keep reading
// `user.fullName` untouched, so it stays real for moderation.
function withDisplayName<T extends { user: { fullName: string; nickname?: string | null } }>(item: T) {
  return { ...item, user: { ...item.user, displayName: getDisplayName(item.user, "peer") } };
}

// Attaches the current user's like status per item. Kept OUT of the shared
// cache because it is per-user — the base list stays cacheable and public.
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
    const groupId = searchParams.get("groupId");

    // Current user id (best-effort) — used for likedByCurrentUser + group scope.
    let currentUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const dbUser = await db.user.findUnique({ where: { supabaseId: authUser.id }, select: { id: true } });
        currentUserId = dbUser?.id ?? null;
      }
    } catch {}

    const cacheKey = `karya:feed:cursor:${type || "all"}:${cursor || "start"}:${limit}`;

    const cached = await cache.get<{ karya: any[]; nextCursor: string | null; total: number }>(cacheKey);
    if (cached && !/page=\d+/.test(req.url)) {
      return NextResponse.json({
        karya: (await attachLikedStatus(cached.karya, currentUserId)).map(withDisplayName),
        nextCursor: cached.nextCursor,
        total: cached.total,
      });
    }

    const where: any = {};
    if (type) where.type = type;
    if (featured) where.isFeatured = true;

    if (groupId && currentUserId) {
      const group = await db.group.findUnique({
        where: { id: groupId },
        select: { teacherId: true },
      });
      if (group && group.teacherId === currentUserId) {
        const members = await db.groupMember.findMany({
          where: { groupId, role: "member" },
          select: { userId: true },
        });
        where.userId = { in: members.map(m => m.userId) };
      }
    }

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const [karya, total] = await Promise.all([
      db.studentKarya.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, nickname: true, avatar: true, profile: { select: { school: true, city: true } } } },
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
    await cache.set(cacheKey, result, 120); // base list (no per-user field) stays cacheable

    return NextResponse.json({ ...result, karya: (await attachLikedStatus(items, currentUserId)).map(withDisplayName) });
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
        user: { select: { id: true, fullName: true, nickname: true, avatar: true, profile: { select: { school: true, city: true } } } },
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
