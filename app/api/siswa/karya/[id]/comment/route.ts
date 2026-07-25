import { NextRequest, NextResponse, after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { commentSchema, sanitize } from "@/lib/validations";
import { getDisplayName } from "@/lib/nickname";

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
        user: { select: { id: true, fullName: true, nickname: true, avatar: true } },
      },
    });

    const commentWithDisplay = { ...comment, user: { ...comment.user, displayName: getDisplayName(comment.user, "peer") } };

    after(async () => {
      try {
        await Promise.all([
          awardCoins(user.id, "MEMBERI_KOMENTAR", `Karya ${id}`),
          trackQuestProgress(user.id, "MENGOMENTARI"),
          trackDailyStreak(user.id),
        ]);
      } catch {}
    });

    return NextResponse.json({ comment: commentWithDisplay }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Gagal menambahkan komentar" }, { status: 500 });
  }
}
