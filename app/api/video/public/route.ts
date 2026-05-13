import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const where: any = { isPublished: true };
    if (category) where.category = category;

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy: { views: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, description: true, videoUrl: true,
          thumbnailUrl: true, duration: true, source: true, category: true,
          grade: true, views: true, isPremium: true, createdAt: true,
          creator: { select: { id: true, fullName: true } },
        },
      }),
      db.video.count({ where }),
    ]);

    return NextResponse.json({ videos, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
