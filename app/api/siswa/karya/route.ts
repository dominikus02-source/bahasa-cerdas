import { NextRequest, NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { karyaSchema, sanitize } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const featured = searchParams.get("featured") === "true";
    const groupId = searchParams.get("groupId");

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

    const [karya, total] = await Promise.all([
      db.studentKarya.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatar: true, profile: { select: { school: true, city: true } } } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.studentKarya.count({ where }),
    ]);

    return NextResponse.json({ karya, total, page, totalPages: Math.ceil(total / limit) });
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
    ]);

    return NextResponse.json({ karya, coinsEarned: 10 }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
