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
