import { NextRequest, NextResponse, after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { commentSchema, sanitize } from "@/lib/validations";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const parsed = commentSchema.safeParse({ konten: body.content });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Komentar tidak valid" },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitize(parsed.data.konten);

    const comment = await db.studentKaryaComment.create({
      data: {
        karyaId: id,
        userId: user.id,
        content: sanitizedContent,
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    // Coins/streak/quest/notif run after the response: none of them change what
    // the client renders, and awaiting them made posting a comment wait on
    // several extra roundtrips. They were also under Promise.all, so one failing
    // bonus returned a 500 for a comment that had in fact been saved.
    after(async () => {
      await Promise.allSettled([
        awardCoins(user.id, "MEMBERI_KOMENTAR", id),
        trackDailyStreak(user.id),
        trackQuestProgress(user.id, "MENGOMENTARI"),
        (async () => {
          const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true, title: true } });
          if (!karya || karya.userId === user.id) return;
          await db.notifikasi.create({
            data: {
              userId: karya.userId,
              title: "Komentar Baru 💬",
              body: `${user.fullName} berkomentar di "${sanitize(karya.title)}"`,
              type: "COMMENT",
              data: { karyaId: id, userId: user.id, userName: sanitize(user.fullName), commentId: comment.id },
            },
          });
        })(),
      ]);
    });

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
      take: 50,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
