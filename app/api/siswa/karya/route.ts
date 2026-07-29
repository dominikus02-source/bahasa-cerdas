import { NextRequest, NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak, awardChallengeBonus, COIN_MENULIS_KARYA } from "@/lib/coins";
import { getWeeklyChallenge } from "@/lib/weekly-challenge";
import { karyaSchema, sanitize } from "@/lib/validations";
import { transformImageUrl } from "@/lib/image-transform";
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
    const q = searchParams.get("q")?.trim();
    const groupId = searchParams.get("groupId")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const cursor = searchParams.get("cursor");
    const featured = searchParams.get("featured") === "true";

    const karyaInclude = {
      user: {
        select: {
          id: true, fullName: true, nickname: true, avatar: true,
          // Kosmetik toko koin — dipakai untuk bingkai avatar, warna nama, badge
          equippedFrame: true, equippedNameColor: true, equippedBadge: true,
          profile: { select: { school: true, city: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    } as const;

    const user = await getUser().catch(() => null);
    const userId = user?.id || null;

    let items: any[];
    let hasMore = false;

    if (featured) {
      // Karya Pilihan: automatically curated by engagement, not a manual guru
      // toggle. A guru-pinned karya (isFeatured=true) still guarantees a slot
      // — the rest fills from the most-liked karya of the last 30 days, and
      // falls back to all-time best if recent activity is too thin.
      const pinned = await db.studentKarya.findMany({
        where: { isFeatured: true },
        include: karyaInclude,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      const remaining = limit - pinned.length;
      let auto: any[] = [];
      if (remaining > 0) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const excludeIds = pinned.map((k) => k.id);
        auto = await db.studentKarya.findMany({
          where: { id: { notIn: excludeIds }, createdAt: { gte: since } },
          include: karyaInclude,
          orderBy: [{ likesCount: "desc" }, { viewsCount: "desc" }],
          take: remaining,
        });
        if (auto.length < remaining) {
          const more = await db.studentKarya.findMany({
            where: { id: { notIn: [...excludeIds, ...auto.map((k) => k.id)] } },
            include: karyaInclude,
            orderBy: [{ likesCount: "desc" }, { viewsCount: "desc" }],
            take: remaining - auto.length,
          });
          auto = [...auto, ...more];
        }
      }
      items = [...pinned, ...auto];
    } else {
      const where: any = {};
      if (type) where.type = type;
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { user: { fullName: { contains: q, mode: "insensitive" } } },
        ];
      }
      if (groupId) {
        const group = await db.group.findUnique({
          where: { id: groupId },
          select: { teacherId: true },
        });
        if (!group) {
          return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
        }
        if (user && user.role === "GURU" && group.teacherId !== user.id) {
          return NextResponse.json({ error: "Anda tidak berhak mengakses kelas ini" }, { status: 403 });
        }
        const members = await db.groupMember.findMany({
          where: { groupId, role: "member" },
          select: { userId: true },
        });
        const memberIds = members.map((m) => m.userId);
        where.userId = { in: memberIds };
      }

      // Cache first page (no cursor) for 30s — absorbs feed bursts from a whole class
      // Skip cache when searching so results are always fresh
      const cacheKey = cursor || q || groupId ? null : `feed:${type || "all"}:${limit}`;
      let karya: any[];
      if (cacheKey) {
        const cached = await cache.get<any[]>(cacheKey);
        if (cached) {
          karya = cached;
        } else {
          karya = await db.studentKarya.findMany({
            where,
            include: karyaInclude,
            orderBy: { createdAt: "desc" },
            take: limit + 1,
          });
          cache.set(cacheKey, karya, 30).catch(() => {});
        }
      } else {
        karya = await db.studentKarya.findMany({
          where,
          include: karyaInclude,
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
      }
      hasMore = karya.length > limit;
      items = hasMore ? karya.slice(0, limit) : karya;
    }

      const withDisplay = items.map((k) => ({
        ...k,
        createdAt: typeof k.createdAt === "string" ? k.createdAt : k.createdAt.toISOString(),
        user: { ...k.user, avatar: transformImageUrl(k.user.avatar, { width: 80, height: 80, quality: 85 }), displayName: getDisplayName(k.user, "peer") },
      }));

    const withLikes = await attachLikedStatus(withDisplay, userId);

    return NextResponse.json({
      karya: withLikes,
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
      coverImage: body.coverImage || undefined,
      photos: Array.isArray(body.photos) ? body.photos : undefined,
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
        coverImage: parsed.data.coverImage || null,
        photos: parsed.data.photos || [],
      },
    });

    awardCoins(user.id, "MENULIS_KARYA", `Karya: ${karya.title}`).catch(() => {});
    // Must match QUEST_POOL's type string in lib/coins.ts ("MENULIS") — this
    // used to say "TULIS_KARYA", which matches nothing, so the "Tulis 1
    // Karya" daily quest could never actually be completed by writing one.
    trackQuestProgress(user.id, "MENULIS").catch(() => {});
    if (!user.isFounder) trackDailyStreak(user.id).catch(() => {});

    // Bonus tantangan mingguan — awaited (bukan fire-and-forget) supaya jumlah
    // koinnya bisa ikut dikembalikan dan langsung ditampilkan ke murid.
    const challenge = getWeeklyChallenge();
    const challengeBonus = karya.type === challenge.type
      ? await awardChallengeBonus(user.id, challenge.id, karya.id)
      : 0;

    cache.delPattern("feed:*").catch(() => {});
    invalidateKaryaCache().catch(() => {});

    return NextResponse.json({
      karya,
      id: karya.id,
      coins: COIN_MENULIS_KARYA,
      challengeBonus,
      challengeTheme: challengeBonus > 0 ? challenge.theme : null,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating karya:", error);
    return NextResponse.json({ error: "Gagal membuat karya" }, { status: 500 });
  }
}
