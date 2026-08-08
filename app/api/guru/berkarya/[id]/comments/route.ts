import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { commentSchema, sanitize } from "@/lib/validations";
import { getDisplayName } from "@/lib/nickname";

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  nickname: true,
  avatar: true,
} as const;

/** cari artikel terbit milik guru (GURU/ADMIN/founder) — seperti filter feed. */
async function findGuruArtikel(id: string) {
  return db.artikel.findFirst({
    where: {
      id,
      isPublished: true,
      author: { OR: [{ role: "GURU" }, { role: "ADMIN" }, { isFounder: true }] },
    },
    select: { id: true },
  });
}

/** GET /api/guru/berkarya/[id]/comments — daftar komentar artikel (lazy-load).
 * Komentar hanya di-fetch saat panel dibuka, bukan eager dari feed. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const artikel = await findGuruArtikel(id);
    if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    const comments = await db.artikelComment.findMany({
      where: { artikelId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { ...AUTHOR_SELECT } },
      },
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        isOwner: c.user.id === user.id,
        author: {
          id: c.user.id,
          fullName: c.user.fullName,
          avatar: c.user.avatar,
          displayName: getDisplayName(c.user, "guru"),
        },
      })),
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat komentar" }, { status: 500 });
  }
}

/** POST /api/guru/berkarya/[id]/comments — tulis komentar.
 * Validasi komentar mengikuti konvensi existing (commentSchema + sanitize).
 * Tidak ada XP/koin/notifikasi untuk komentar guru. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const parsed = commentSchema.safeParse({ konten: body.content });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Komentar tidak valid" },
        { status: 400 }
      );
    }

    const artikel = await findGuruArtikel(id);
    if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    const sanitizedContent = sanitize(parsed.data.konten);

    const [comment, commentCount] = await db.$transaction([
      db.artikelComment.create({
        data: { artikelId: id, userId: user.id, content: sanitizedContent },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { ...AUTHOR_SELECT } },
        },
      }),
      db.artikelComment.count({ where: { artikelId: id } }),
    ]);

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          isOwner: true,
          author: {
            id: comment.user.id,
            fullName: comment.user.fullName,
            avatar: comment.user.avatar,
            displayName: getDisplayName(comment.user, "guru"),
          },
        },
        commentCount,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Gagal menambahkan komentar" }, { status: 500 });
  }
}
