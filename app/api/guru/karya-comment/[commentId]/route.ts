import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Guru screening: hapus komentar tidak pantas pada karya murid di kelasnya.
// Izin: ADMIN / Founder (bebas) ATAU GURU yang mengajar kelas si penulis karya.
// P1-B SPECIAL CASE: bukan guard legacy yang diblokir — rute moderasi ini memang
// permissive. ADMIN/founder bebas; GURU hanya bila penulis karya ada di kelasnya
// (groupMember.findFirst). MURID selalu ditolak 403. Jangan diganti dengan
// isTeacherOrStudent() karena itu akan menambah "ADMIN/founder bebas" (sudah
// ditangani isAdmin) namun tetap mengharuskan GURU mengajar kelas — perilaku
// sama, tapi memakai guard generic di sini mengaburkan niat moderasi ini.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await params;

    const comment = await db.studentKaryaComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        karya: { select: { userId: true } },
      },
    });
    if (!comment) {
      return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN" || user.isFounder;

    if (!isAdmin) {
      if (user.role !== "GURU") {
        return NextResponse.json({ error: "Hanya guru yang dapat menghapus komentar" }, { status: 403 });
      }
      // Penulis karya harus murid di salah satu kelas yang diampu guru ini.
      const teaches = await db.groupMember.findFirst({
        where: { userId: comment.karya.userId, group: { teacherId: user.id } },
        select: { id: true },
      });
      if (!teaches) {
        return NextResponse.json(
          { error: "Kamu hanya bisa menghapus komentar pada karya murid di kelasmu" },
          { status: 403 }
        );
      }
    }

    await db.studentKaryaComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus komentar" }, { status: 500 });
  }
}
