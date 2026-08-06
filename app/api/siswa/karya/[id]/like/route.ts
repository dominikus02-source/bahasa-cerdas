import { NextRequest, NextResponse, after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { awardGuruXp, getMuridGuruIds, notifyGuruMurid } from "@/lib/gamification/teacher-xp";

/** Milestone like yang memicu notifikasi "Karya Trending 🔥" ke guru. */
const TRENDING_MILESTONES = [25, 50, 100, 250, 500, 1000];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await db.studentKaryaLike.findUnique({
      where: { karyaId_userId: { karyaId: id, userId: user.id } },
    });

    // Batched (not interactive) so the pair costs one roundtrip and holds a
    // pooled connection only for that instant — interactive transactions are
    // what exhaust `connection_limit` behind the Supabase transaction pooler.
    if (existing) {
      const [, updated] = await db.$transaction([
        db.studentKaryaLike.delete({ where: { id: existing.id } }),
        db.studentKarya.update({
          where: { id },
          data: { likesCount: { decrement: 1 } },
          select: { likesCount: true },
        }),
      ]);
      return NextResponse.json({ success: true, liked: false, likeCount: Math.max(0, updated.likesCount) });
    }

    const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true, title: true } });
    if (!karya) return NextResponse.json({ error: "Karya tidak ditemukan", code: "KARYA_NOT_FOUND" }, { status: 404 });

    const [, updated] = await db.$transaction([
      db.studentKaryaLike.create({ data: { karyaId: id, userId: user.id } }),
      db.studentKarya.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      }),
    ]);

    // Bonus side-effects (streak/quest/coins/notif) are best-effort and none of
    // them affect what the client renders, so they run AFTER the response is
    // sent. Awaiting them used to add ~4 sequential DB roundtrips — three of
    // them interactive transactions — to every tap of the like button.
    after(async () => {
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

      // Guru: karya muridnya dapat like → XP + notifikasi; plus "Trending"
      // saat like menembus milestone (25/50/100/250/500/1000).
      if (karya.userId !== user.id) {
        try {
          const guruIds = await getMuridGuruIds(karya.userId);
          if (guruIds.length > 0) {
            const trending = TRENDING_MILESTONES.includes(updated.likesCount);
            await notifyGuruMurid(guruIds, {
              title: trending ? "Karya Muridmu Trending 🔥" : "Karya Murid Disukai ❤️",
              body: trending
                ? `"${karya.title}" milik muridmu tembus ${updated.likesCount} like!`
                : `"${karya.title}" milik muridmu disukai ${user.fullName}`,
              type: trending ? "TRENDING" : "MURID_LIKE",
              data: { link: "/guru/feed-karya", karyaId: id, likeCount: updated.likesCount },
            });
            for (const guruId of guruIds) {
              await awardGuruXp({
                guruId,
                sumber: "MURID_LIKE",
                reference: `like-${id}-${user.id}`,
                metadata: { karyaId: id, muridId: karya.userId },
              });
            }
          }
        } catch {}
      }
    });

    return NextResponse.json({ success: true, liked: true, likeCount: updated.likesCount });
  } catch (error) {
    return NextResponse.json({ error: "Belum berhasil menyukai karya.", code: "KARYA_LIKE_FAILED" }, { status: 500 });
  }
}
