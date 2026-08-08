import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

/** DELETE /api/guru/berkarya/[id]/comments/[commentId]
 * Hapus komentar: hanya pemilik komentar ATAU role moderasi (ADMIN/founder).
 * Komentar harus milik artikel `id` yang sama dengan path. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, commentId } = await params;

    const comment = await db.artikelComment.findUnique({
      where: { id: commentId },
      select: { userId: true, artikelId: true },
    });

    if (!comment) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
    if (comment.artikelId !== id) return NextResponse.json({ error: "Komentar tidak terkait dengan artikel ini" }, { status: 400 });

    const isModerasi = user.role === "ADMIN" || user.isFounder === true;
    if (comment.userId !== user.id && !isModerasi) {
      return NextResponse.json({ error: "Tidak dapat menghapus komentar orang lain" }, { status: 403 });
    }

    const [deleted, commentCount] = await db.$transaction([
      db.artikelComment.delete({ where: { id: commentId } }),
      db.artikelComment.count({ where: { artikelId: id } }),
    ]);

    return NextResponse.json({ success: true, deleted: deleted.id, commentCount });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
