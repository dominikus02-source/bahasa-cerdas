import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getDisplayName } from "@/lib/nickname";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const karya = await db.studentKarya.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true, fullName: true, nickname: true, avatar: true,
            equippedFrame: true, equippedNameColor: true, equippedBadge: true,
            profile: { select: { school: true, city: true } },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true, fullName: true, nickname: true, avatar: true,
                equippedFrame: true, equippedNameColor: true, equippedBadge: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!karya) {
      return NextResponse.json({ error: "Karya tidak ditemukan" }, { status: 404 });
    }

    await db.studentKarya.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    const withDisplay = {
      ...karya,
      user: { ...karya.user, displayName: getDisplayName(karya.user, "peer") },
      comments: karya.comments.map((c) => ({ ...c, user: { ...c.user, displayName: getDisplayName(c.user, "peer") } })),
    };

    return NextResponse.json({ karya: withDisplay });
  } catch (error) {
    console.error("Error fetching karya detail:", error);
    return NextResponse.json({ error: "Gagal memuat karya" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const { id } = await params;

    const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true } });
    if (!karya) return NextResponse.json({ error: "Karya tidak ditemukan" }, { status: 404 });
    if (karya.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.studentKarya.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting karya:", error);
    return NextResponse.json({ error: "Gagal menghapus karya" }, { status: 500 });
  }
}
