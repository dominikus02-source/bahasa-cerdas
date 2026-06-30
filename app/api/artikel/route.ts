import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
    const q = searchParams.get("q") || "";
    const author = searchParams.get("author") || "";

    const where: any = { isPublished: true };

    if (author) {
      const authorFilter = author.toLowerCase();
      where.author = {
        OR: [
          { fullName: { contains: authorFilter, mode: "insensitive" } },
        ],
      };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { authorName: { contains: q, mode: "insensitive" } },
        { authorRole: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
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
      db.artikel.count({ where }),
    ]);

    return NextResponse.json({
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
