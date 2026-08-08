import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { GURU_XP_NILAI } from "@/lib/gamification/teacher-xp";
import type { Prisma } from "@prisma/client";

/** GET /api/guru/berkarya — feed "Guru Berkarya": karya (Artikel + Puisi)
 * terbaru yang sudah terbit, TERMASUK karya guru yang sedang melihat
 * (current user selalu tampil, ditandai "Karya Anda" di UI). Role-gated
 * guru/founder.
 * Urutan: publishedAt DESC (karya terbaru pertama) — bukan popularitas.
 * Query: ?limit=N (default 8, maks 20).
 * Response: { data, currentUserId, meta: { xpArtikel, xpPuisi } } — meta
 * berisi nilai XP riil dari GURU_XP_NILAI agar UI tidak hardcode angka. */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "8", 10) || 8, 20);

    const where: Prisma.ArtikelWhereInput = {
      isPublished: true,
      author: { OR: [{ role: "GURU" }, { role: "ADMIN" }, { isFounder: true }] },
    };

    const rows = await db.artikel.findMany({
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
        likes: {
          where: { userId: user.id },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    // Shape api stabil: likeCount/commentCount/likedByCurrentUser dibungkus
    // field sendiri (bukan _count/relation) supaya UI tidak tahu detail Prisma.
    const data = rows.map(({ likes, _count, ...rest }) => ({
      ...rest,
      likeCount: _count.likes,
      commentCount: _count.comments,
      likedByCurrentUser: likes.length > 0,
    }));

    return NextResponse.json({
      data,
      currentUserId: user.id,
      meta: {
        xpArtikel: GURU_XP_NILAI.GURU_ARTIKEL,
        xpPuisi: GURU_XP_NILAI.GURU_PUISI,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
