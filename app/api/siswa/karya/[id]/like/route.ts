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
      const updated = await db.studentKarya.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
        select: { likesCount: true },
      });
      return NextResponse.json({ success: true, liked: false, likeCount: Math.max(0, updated.likesCount) });
    }

    const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true, title: true } });
    if (!karya) return NextResponse.json({ error: "Karya tidak ditemukan", code: "KARYA_NOT_FOUND" }, { status: 404 });

    await db.studentKaryaLike.create({ data: { karyaId: id, userId: user.id } });
    const updated = await db.studentKarya.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
      select: { likesCount: true },
    });

    // Bonus side-effects (streak/quest/coins/notif) are best-effort — a failure
    // here must never break the like itself.
    try {
      await Promise.allSettled([
        trackDailyStreak(user.id),
        trackQuestProgress(user.id, "MEMBERI_LIKE"),
        ...(karya.userId !== user.id
          ? [
              awardCoins(karya.userId, "MENDAPAT_LIKE", id),
              db.notifikasi.create({
                data: {
                  userId: karya.userId,
                  title: "Karya Disukai ❤️",
                  body: `${user.fullName} menyukai karyamu "${karya.title}"`,
                  type: "LIKE",
                  data: { karyaId: id, userId: user.id, userName: user.fullName },
                },
              }),
            ]
          : []),
      ]);
    } catch { /* ignore — the like already succeeded */ }

    return NextResponse.json({ success: true, liked: true, likeCount: updated.likesCount });
  } catch (error) {
    return NextResponse.json({ error: "Belum berhasil menyukai karya.", code: "KARYA_LIKE_FAILED" }, { status: 500 });
  }
}
