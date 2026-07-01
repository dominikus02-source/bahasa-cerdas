import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrSet } from "@/lib/cache/redis-cache";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "12")));
    const q = searchParams.get("q") || "";

    const where: any = { isPublished: true };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { authorName: { contains: q, mode: "insensitive" } },
        { authorRole: { contains: q, mode: "insensitive" } },
      ];
    }

    const cacheKey = `artikel:page:${page}:limit:${limit}:q:${q || "all"}`;
    const CACHE_TTL = 300;

    const result = await getOrSet(cacheKey, CACHE_TTL, async () => {
      const [data, total] = await Promise.all([
        withQueryTimeout(
          db.artikel.findMany({
            where,
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImage: true,
              coverImageUrl: true,
              tags: true,
              readCount: true,
              createdAt: true,
              publishedAt: true,
              authorName: true,
              authorRole: true,
              author: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true,
                },
              },
            },
          }),
          8000,
          "Artikel list query timeout"
        ),
        withQueryTimeout(
          db.artikel.count({ where }),
          8000,
          "Artikel count query timeout"
        ),
      ]);

      return {
        items: data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });

    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
