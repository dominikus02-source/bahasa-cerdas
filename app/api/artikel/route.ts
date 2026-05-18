import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const [data, total] = await Promise.all([
      db.artikel.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true,
          coverImage: true, tags: true, readCount: true,
          createdAt: true,
          author: { select: { id: true, fullName: true, avatar: true } },
        },
      }),
      db.artikel.count({ where: { isPublished: true } }),
    ]);

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
