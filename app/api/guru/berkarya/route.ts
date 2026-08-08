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

    // Feed = karya TERBIT (isPublished) dari guru (GURU/ADMIN/founder).
    // Karya penulis yang sedang melihat selalu ikut tampil (badge "Karya Anda"
    // di UI) — tanpa pengecualian karya sendiri. Tanpa filter tanggal, tanpa
    // filter type — ARTIKEL & PUISI tampil, urut publishedAt DESC.
    const where: Prisma.ArtikelWhereInput = {
      isPublished: true,
      author: { OR: [{ role: "GURU" }, { role: "ADMIN" }, { isFounder: true }] },
    };

    // 1) Query DASAR feed — hanya menyentuh Artikel/User/Profile, sehingga feed
    //    tetap tampil walau tabel sosial (ArtikelLike/ArtikelComment) belum ada
    //    di DB (migrasi manual belum di-apply). Urutan publishedAt DESC.
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
      },
    });

    // 2) Enrichment sosial BEST-EFFORT (groupBy, tanpa N+1): likeCount,
    //    commentCount, likedByCurrentUser. Jika tabel sosial belum ada (migrasi
    //    belum di-apply), hitungan jatuh ke 0 — ITEM FEED TIDAK HILANG.
    const ids = rows.map((r) => r.id);
    let likeCountById = new Map<string, number>();
    let commentCountById = new Map<string, number>();
    const likedByCurrentUserIds = new Set<string>();
    if (ids.length > 0) {
      try {
        const [likeAgg, commentAgg, myLikes] = await Promise.all([
          db.artikelLike.groupBy({ by: ["artikelId"], where: { artikelId: { in: ids } }, _count: { _all: true } }),
          db.artikelComment.groupBy({ by: ["artikelId"], where: { artikelId: { in: ids } }, _count: { _all: true } }),
          db.artikelLike.findMany({ where: { artikelId: { in: ids }, userId: user.id }, select: { artikelId: true } }),
        ]);
        for (const g of likeAgg) likeCountById.set(g.artikelId, g._count._all);
        for (const g of commentAgg) commentCountById.set(g.artikelId, g._count._all);
        for (const l of myLikes) likedByCurrentUserIds.add(l.artikelId);
      } catch {
        // Tabel sosial belum tersedia → like/komentar tampil 0, feed tetap utuh.
      }
    }

    // Shape api stabil: likeCount/commentCount/likedByCurrentUser dibungkus
    // field sendiri supaya UI tidak tahu detail Prisma.
    const data = rows.map((r) => ({
      ...r,
      likeCount: likeCountById.get(r.id) ?? 0,
      commentCount: commentCountById.get(r.id) ?? 0,
      likedByCurrentUser: likedByCurrentUserIds.has(r.id),
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
