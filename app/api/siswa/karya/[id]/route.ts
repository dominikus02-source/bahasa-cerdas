import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const karya = await db.studentKarya.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, avatar: true, profile: { select: { school: true, city: true } } } },
        comments: {
          include: {
            user: { select: { id: true, fullName: true, avatar: true } },
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

    return NextResponse.json({ karya });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true } });
    if (!karya) return NextResponse.json({ error: "Karya tidak ditemukan" }, { status: 404 });

    if (karya.userId !== user.id && user.role !== "GURU" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.studentKarya.delete({ where: { id } });

    // Update user's total likes if the karya had likes
    const likes = await db.studentKaryaLike.count({ where: { karyaId: id } });
    if (likes > 0) {
      await db.user.update({
        where: { id: karya.userId },
        data: { totalLikes: { decrement: likes } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "GURU") return NextResponse.json({ error: "Hanya guru" }, { status: 403 });

    const body = await req.json();
    const updated = await db.studentKarya.update({
      where: { id },
      data: { isFeatured: body.isFeatured },
    });

    return NextResponse.json({ karya: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
