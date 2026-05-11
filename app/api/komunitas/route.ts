import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const region = searchParams.get("region");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { isPublic: true };
    if (type) where.type = type;
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [communities, total] = await Promise.all([
      db.community.findMany({
        where,
        include: { creator: { select: { id: true, fullName: true, avatar: true } } },
        orderBy: { memberCount: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.community.count({ where }),
    ]);

    return NextResponse.json({ communities, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/komunitas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Hanya guru yang dapat membuat komunitas" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, type, region, province, city, school, avatarUrl, bannerUrl } = body;

    const community = await db.community.create({
      data: {
        name,
        description,
        type: type || "MGMP",
        region,
        province,
        city,
        school,
        avatarUrl,
        bannerUrl,
        creatorId: dbUser.id,
        memberCount: 1,
      },
    });

    await db.communityMember.create({
      data: { communityId: community.id, userId: dbUser.id, role: "admin" },
    });

    return NextResponse.json({ community }, { status: 201 });
  } catch (error) {
    console.error("POST /api/komunitas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}