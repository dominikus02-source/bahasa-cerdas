import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getDisplayName } from "@/lib/nickname";
import { RANK_META } from "@/lib/gamification/ranks";
import { awardGuruXp } from "@/lib/gamification/teacher-xp";
import type { PlayerRank } from "@prisma/client";

const USER_RANK_SELECT = { playerProfile: { select: { currentRank: true } } } as const;

function withRank<T extends { playerProfile?: { currentRank?: string } | null }>(user: T) {
  const rank = user.playerProfile?.currentRank ?? "BRONZE";
  const meta = RANK_META[rank as PlayerRank];
  return {
    ...user,
    rank,
    rankLabel: meta?.label ?? rank,
    rankTitle: meta?.title ?? rank,
    rankColor: meta?.color ?? "#64748b",
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const karya = await db.studentKarya.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true, fullName: true, nickname: true, avatar: true,
            equippedFrame: true, equippedNameColor: true, equippedBadge: true,
            playerProfile: { select: { currentRank: true } },
            profile: { select: { school: true, city: true } },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true, fullName: true, nickname: true, avatar: true,
                equippedFrame: true, equippedNameColor: true, equippedBadge: true,
                playerProfile: { select: { currentRank: true } },
              },
            },
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
      user: { ...withRank(karya.user), displayName: getDisplayName(karya.user, "peer") },
      comments: karya.comments.map((c) => ({ ...c, user: { ...withRank(c.user), displayName: getDisplayName(c.user, "peer") } })),
    };

    return NextResponse.json({ karya: withDisplay });
  } catch (error) {
    console.error("Error fetching karya detail:", error);
    return NextResponse.json({ error: "Gagal memuat karya" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });
    if (user.role !== "GURU" && !user.isFounder && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya guru yang bisa memilih karya terbaik" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (typeof body.isFeatured !== "boolean") {
      return NextResponse.json({ error: "isFeatured wajib diisi boolean" }, { status: 400 });
    }

    const karya = await db.studentKarya.update({
      where: { id },
      data: { isFeatured: body.isFeatured },
    });

    // Guru XP: memilih karya murid (Editor Choice) = 25 XP, sekali per karya.
    if (body.isFeatured) {
      awardGuruXp({
        guruId: user.id,
        sumber: "GURU_FEATURED",
        reference: `feature-${id}`,
        metadata: { karyaId: id, muridId: karya.userId },
      }).catch(() => {});
    }

    return NextResponse.json({ karya });
  } catch (error) {
    console.error("Error toggling featured karya:", error);
    return NextResponse.json({ error: "Gagal mengubah status pilihan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const { id } = await params;

    const karya = await db.studentKarya.findUnique({ where: { id }, select: { userId: true } });
    if (!karya) return NextResponse.json({ error: "Karya tidak ditemukan" }, { status: 404 });
    if (karya.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.studentKarya.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting karya:", error);
    return NextResponse.json({ error: "Gagal menghapus karya" }, { status: 500 });
  }
}
