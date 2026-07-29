import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

// Daftar Materi (file) yang gurunya kirim ke kelas murid ini.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return NextResponse.json({ data: [] });

    const kirims = await db.materiKirim.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        materi: {
          select: {
            id: true, title: true, description: true, fileUrl: true, fileType: true,
            tema: true, subject: true, grade: true,
          },
        },
        group: { select: { name: true } },
        teacher: { select: { fullName: true } },
      },
    });

    const data = kirims.map((k) => ({
      id: k.id,
      createdAt: k.createdAt,
      groupName: k.group.name,
      teacherName: k.teacher.fullName,
      materi: k.materi,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/murid/materi error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
