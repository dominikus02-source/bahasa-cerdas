import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: "Komentar tidak boleh kosong" }, { status: 400 });
    }

    const comment = await db.studentKaryaComment.create({
      data: {
        karyaId: id,
        userId: user.id,
        content: body.content.trim(),
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    await Promise.all([
      awardCoins(user.id, "MEMBERI_KOMENTAR", id),
      trackDailyStreak(user.id),
      trackQuestProgress(user.id, "MENGOMENTARI"),
    ]);

    return NextResponse.json({ comment, coinsEarned: 1 }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const comments = await db.studentKaryaComment.findMany({
      where: { karyaId: id },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
