import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await db.studentKaryaLike.findUnique({
      where: { karyaId_userId: { karyaId: id, userId: user.id } },
    });

    if (existing) {
      await db.studentKaryaLike.delete({ where: { id: existing.id } });
      await db.studentKarya.update({ where: { id }, data: { likesCount: { decrement: 1 } } });
      return NextResponse.json({ liked: false });
    }

    const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true, title: true } });

    await db.studentKaryaLike.create({ data: { karyaId: id, userId: user.id } });
    await db.studentKarya.update({ where: { id }, data: { likesCount: { increment: 1 } } });

    await Promise.all([
      trackDailyStreak(user.id),
      trackQuestProgress(user.id, "MEMBERI_LIKE"),
    ]);

    if (karya && karya.userId !== user.id) {
      await awardCoins(karya.userId, "MENDAPAT_LIKE", id);
      await db.notifikasi.create({
        data: {
          userId: karya.userId,
          title: "Karya Disukai ❤️",
          body: `${user.fullName} menyukai karyamu "${karya.title}"`,
          type: "LIKE",
          data: { karyaId: id, userId: user.id, userName: user.fullName },
        },
      });
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
