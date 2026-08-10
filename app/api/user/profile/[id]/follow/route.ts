import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/nickname";
import { rateLimitRoute } from "@/lib/rate-limit";

/**
 * POST /api/user/profile/[id]/follow — toggle Follow (idempoten, race-safe).
 *
 * - Auth wajib; tidak boleh follow diri sendiri (409).
 * - Body kosong (atau {}) = toggle. Response selalu { following, followerCount }.
 * - Race-safe (W1): pre-check hanya penentu arah toggle; hasil akhir ditentukan
 *   DB — P2002 saat create => sudah follow, P2025 saat delete => sudah unfollow.
 * - Rate limit (W2): 30 toggle/menit per sesi pengguna.
 * - Notifikasi (W4): hanya ke akun MURID (bukan GURU/ADMIN/founder), best-effort.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = await rateLimitRoute(req, { maxRequests: 30, windowSeconds: 60, identifier: "bca-social-follow" });
    if (limited) return limited;

    if (me.id === id) return NextResponse.json({ error: "Tidak bisa mengikuti diri sendiri" }, { status: 409 });

    const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, isFounder: true } });
    if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: id } },
    });

    let following: boolean;
    if (existing) {
      try {
        await db.follow.delete({
          where: { followerId_followingId: { followerId: me.id, followingId: id } },
        });
        following = false;
      } catch (error) {
        if ((error as { code?: string })?.code === "P2025") {
          following = false;
        } else {
          throw error;
        }
      }
    } else {
      try {
        await db.follow.create({ data: { followerId: me.id, followingId: id } });
        following = true;
      } catch (error) {
        if ((error as { code?: string })?.code === "P2002") {
          following = true;
        } else {
          throw error;
        }
      }
    }

    const followerCount = await db.follow.count({ where: { followingId: id } });

    // Notifikasi best-effort; hanya ke akun MURID (W4: MURID->GURU/ADMIN/founder tidak dikirim).
    if (following && target.role === "MURID" && !target.isFounder) {
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