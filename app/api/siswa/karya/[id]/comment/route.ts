import { NextRequest, NextResponse, after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { awardCoins, trackQuestProgress, trackDailyStreak } from "@/lib/coins";
import { commentSchema, sanitize } from "@/lib/validations";
import { getDisplayName } from "@/lib/nickname";
import { awardGuruXp, getMuridGuruIds, notifyGuruMurid } from "@/lib/gamification/teacher-xp";

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

    // Balasan selalu menempel ke komentar tingkat-atas — kalau parentId yang
    // dikirim ternyata milik balasan lain, ikuti ke induknya supaya thread
    // tetap datar 2 tingkat (komentar + balasan), bukan bersarang tanpa akhir.
    let parentId: string | null = null;
    if (typeof body.parentId === "string" && body.parentId) {
      const parent = await db.studentKaryaComment.findUnique({
        where: { id: body.parentId },
        select: { id: true, karyaId: true, parentId: true },
      });
      if (!parent || parent.karyaId !== id) {
        return NextResponse.json({ error: "Komentar yang dibalas tidak ditemukan" }, { status: 400 });
      }
      parentId = parent.parentId || parent.id;
    }

    const karya = await db.studentKarya.findUnique({
      where: { id },
      select: { userId: true, title: true },
    });
    if (!karya) {
      return NextResponse.json({ error: "Karya tidak ditemukan" }, { status: 404 });
    }

    const comment = await db.studentKaryaComment.create({
      data: {
        karyaId: id,
        userId: user.id,
        content: sanitizedContent,
        parentId,
      },
      include: {
        user: {
          select: {
            id: true, fullName: true, nickname: true, avatar: true,
            equippedFrame: true, equippedNameColor: true, equippedBadge: true,
            isFounder: true, isPremium: true,
          },
        },
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

      // Guru: karya muridnya dikomentari → XP + notifikasi (best-effort).
      if (karya.userId !== user.id) {
        try {
          const guruIds = await getMuridGuruIds(karya.userId);
          if (guruIds.length > 0) {
            await notifyGuruMurid(guruIds, {
              title: "Karya Murid Dikomentari 💬",
              body: `${user.fullName} berkomentar di "${karya.title}" milik muridmu`,
              type: "MURID_KOMENTAR",
              data: { link: "/guru/feed-karya", karyaId: id },
            });
            for (const guruId of guruIds) {
              await awardGuruXp({
                guruId,
                sumber: "MURID_KOMENTAR",
                reference: `komentar-${comment.id}`,
                metadata: { karyaId: id, muridId: karya.userId },
              });
            }
          }
        } catch {}
      }
    });

    return NextResponse.json({ comment: commentWithDisplay }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Gagal menambahkan komentar" }, { status: 500 });
  }
}
