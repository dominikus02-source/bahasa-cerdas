import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/nickname";

/**
 * POST /api/user/profile/[id]/like — toggle ProfileLike (idempoten).
 *
 * - Auth wajib; tidak boleh like diri sendiri (409).
 * - Body kosong (atau {}) = toggle. Response selalu { liked, profileLikeCount }.
 * - Notifikasi ke target (best-effort, via after()) — sekali per like baru.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.id === id) return NextResponse.json({ error: "Tidak bisa menyukai profil sendiri" }, { status: 409 });

    const target = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const existing = await db.profileLike.findUnique({
      where: { likerId_targetId: { likerId: me.id, targetId: id } },
    });

    let liked: boolean;
    if (existing) {
      await db.profileLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await db.profileLike.create({ data: { likerId: me.id, targetId: id } });
      liked = true;
    }

    const profileLikeCount = await db.profileLike.count({ where: { targetId: id } });

    if (liked) {
      const meFresh = await db.user
        .findUnique({ where: { id: me.id }, select: { fullName: true, nickname: true } })
        .catch(() => null);
      const displayName = getDisplayName(meFresh ?? { fullName: me.fullName ?? "", nickname: null }, "peer");
      db.notifikasi
        .create({
          data: {
            userId: id,
            title: displayName,
            body: "menyukai profilmu ♥",
            type: "PROFILE_LIKE",
            data: { likerId: me.id, profileId: id },
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ liked, profileLikeCount });
  } catch (error) {
    console.error("Error toggling profile like:", error);
    return NextResponse.json({ error: "Gagal menyukai profil" }, { status: 500 });
  }
}