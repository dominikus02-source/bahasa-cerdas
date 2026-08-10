import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/nickname";

/**
 * POST /api/user/profile/[id]/follow — toggle Follow (idempoten).
 *
 * - Auth wajib; tidak boleh follow diri sendiri (409).
 * - Body kosong (atau {}) = toggle. Response selalu { following, followerCount }.
 * - Notifikasi ke target (best-effort, via after()) — sekali per follow baru,
 *   tidak saat unfollow.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.id === id) return NextResponse.json({ error: "Tidak bisa mengikuti diri sendiri" }, { status: 409 });

    const target = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: id } },
    });

    let following: boolean;
    if (existing) {
      await db.follow.delete({ where: { id: existing.id } });
      following = false;
    } else {
      await db.follow.create({ data: { followerId: me.id, followingId: id } });
      following = true;
    }

    const followerCount = await db.follow.count({ where: { followingId: id } });

    // Notifikasi best-effort setelah response (sekali per follow baru).
    if (following) {
      const meFresh = await db.user
        .findUnique({ where: { id: me.id }, select: { fullName: true, nickname: true } })
        .catch(() => null);
      const displayName = getDisplayName(meFresh ?? { fullName: me.fullName ?? "", nickname: null }, "peer");
      db.notifikasi
        .create({
          data: {
            userId: id,
            title: displayName,
            body: "mulai mengikutimu.",
            type: "FOLLOW",
            data: { followerId: me.id, profileId: id },
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ following, followerCount });
  } catch (error) {
    console.error("Error toggling follow:", error);
    return NextResponse.json({ error: "Gagal mengikuti" }, { status: 500 });
  }
}