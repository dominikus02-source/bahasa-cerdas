import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cacheKey = "karya:published";
    const cached = await cache.get<{ karya: unknown[] }>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

    const karya = await db.karya.findMany({
      where: { isPublished: true },
      include: { seller: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });

    const result = { karya };
    await cache.set(cacheKey, result, 30);

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, type, price, fileUrl, grade, subject } = body;

    const karya = await db.karya.create({
      data: {
        title,
        description,
        type,
        price: price || 0,
        fileUrl,
        grade,
        subject,
        sellerId: user.id,
        isPublished: false,
      },
    });

    return NextResponse.json({ karya }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}