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
        user: { select: { id: true, fullName: true, nickname: true, avatar: true, profile: { select: { school: true, city: true } } } },
        comments: {
          include: {
            user: { select: { id: true, fullName: true, nickname: true, avatar: true } },
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
