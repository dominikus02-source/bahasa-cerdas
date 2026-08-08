import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import type { Prisma } from "@prisma/client";

/** GET /api/guru/berkarya — feed "Guru Berkarya": karya (Artikel + Puisi)
 * terbaru dari guru lain yang sudah terbit. Role-gated guru/founder.
 * Query: ?limit=N (default 8, maks 20) &excludeMe=0 (default 1 = kecualikan diri sendiri). */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "8", 10) || 8, 20);
    const excludeMe = url.searchParams.get("excludeMe") !== "0";

    const where: Prisma.ArtikelWhereInput = {
      isPublished: true,
      author: { OR: [{ role: "GURU" }, { role: "ADMIN" }, { isFounder: true }] },
    };
    if (excludeMe) where.authorId = { not: user.id };

    const data = await db.artikel.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        articleType: true,
        coverImage: true,
        readCount: true,
        createdAt: true,
        publishedAt: true,
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            profile: { select: { school: true } },
          },
        },
      },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
