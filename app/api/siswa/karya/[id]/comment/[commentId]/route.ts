import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, commentId } = await params;

    const comment = await db.studentKaryaComment.findUnique({
      where: { id: commentId },
      select: { userId: true, karyaId: true },
    });

    if (!comment) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
    if (comment.karyaId !== id) return NextResponse.json({ error: "Komentar tidak terkait dengan karya ini" }, { status: 400 });
    if (comment.userId !== user.id) return NextResponse.json({ error: "Tidak dapat menghapus komentar orang lain" }, { status: 403 });

    await db.studentKaryaComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
