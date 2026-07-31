import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

// GET /api/murid/pengumuman — semua pengumuman kelas murid + status kumpulnya.
export async function GET() {
  try {
    const user = await getUser();
    if (!user || (user.role !== "MURID" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const pengumuman = await db.pengumuman.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        group: { select: { id: true, name: true, grade: true } },
        teacher: { select: { id: true, fullName: true } },
        submissions: {
          where: { userId: user.id },
          select: { id: true, karyaUrl: true, catatan: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = pengumuman.map((p) => ({
      id: p.id,
      judul: p.judul,
      deskripsi: p.deskripsi,
      tenggat: p.tenggat,
      lampiran: p.lampiran,
      lampiranNama: p.lampiranNama,
      createdAt: p.createdAt,
      group: p.group,
      teacher: p.teacher,
      submission: p.submissions[0] || null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/murid/pengumuman error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
