import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

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

/** count like artikel (sumber kebenaran, bukan kolom denormal). */
function countLike(artikelId: string) {
  return db.artikelLike.count({ where: { artikelId } });
}

/** GET tidak disediakan — status like dibaca lewat feed (likedByCurrentUser). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const artikel = await findGuruArtikel(id);
    if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    const existing = await db.artikelLike.findUnique({
      where: { artikelId_userId: { artikelId: id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ success: true, liked: true, likeCount: await countLike(id) });
    }

    // Batched (not interactive) — pola yang sama seperti like karya murid agar
    // tidak menahan pooled connection pada Supabase transaction pooler.
    const [, likeCount] = await db.$transaction([
      db.artikelLike.create({ data: { artikelId: id, userId: user.id } }),
      countLike(id),
    ]);

    return NextResponse.json({ success: true, liked: true, likeCount });
  } catch {
    return NextResponse.json({ error: "Belum berhasil menyukai artikel.", code: "ARTIKEL_LIKE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const artikel = await findGuruArtikel(id);
    if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    const existing = await db.artikelLike.findUnique({
      where: { artikelId_userId: { artikelId: id, userId: user.id } },
    });

    // Idempotent: unlike yang sudah tidak ada tetap berhasil (state tidak berubah).
    if (!existing) {
      return NextResponse.json({ success: true, liked: false, likeCount: await countLike(id) });
    }

    const [, likeCount] = await db.$transaction([
      db.artikelLike.delete({ where: { id: existing.id } }),
      countLike(id),
    ]);

    return NextResponse.json({ success: true, liked: false, likeCount });
  } catch {
    return NextResponse.json({ error: "Belum berhasil batal menyukai artikel.", code: "ARTIKEL_UNLIKE_FAILED" }, { status: 500 });
  }
}
