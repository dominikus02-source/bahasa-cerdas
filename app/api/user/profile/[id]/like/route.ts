import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/nickname";
import { rateLimitRoute } from "@/lib/rate-limit";

/**
 * POST /api/user/profile/[id]/like — toggle ProfileLike (idempoten, race-safe).
 *
 * - Auth wajib; tidak boleh like diri sendiri (409).
 * - Body kosong (atau {}) = toggle. Response selalu { liked, profileLikeCount }.
 * - Race-safe (W1): pre-check hanya penentu arah toggle; hasil akhir ditentukan
 *   DB — P2002 saat create => sudah disukai, P2025 saat delete => sudah tidak disukai.
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

    const limited = await rateLimitRoute(req, { maxRequests: 30, windowSeconds: 60, identifier: "bca-social-like" });
    if (limited) return limited;

    if (me.id === id) return NextResponse.json({ error: "Tidak bisa menyukai profil sendiri" }, { status: 409 });

    const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, isFounder: true } });
    if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const existing = await db.profileLike.findUnique({
      where: { likerId_targetId: { likerId: me.id, targetId: id } },
    });

    let liked: boolean;
    if (existing) {
      try {
        await db.profileLike.delete({
          where: { likerId_targetId: { likerId: me.id, targetId: id } },
        });
        liked = false;
      } catch (error) {
        if ((error as { code?: string })?.code === "P2025") {
          liked = false;
        } else {
          throw error;
        }
      }
    } else {
      try {
        await db.profileLike.create({ data: { likerId: me.id, targetId: id } });
        liked = true;
      } catch (error) {
        if ((error as { code?: string })?.code === "P2002") {
          liked = true;
        } else {
          throw error;
        }
      }
    }

    const profileLikeCount = await db.profileLike.count({ where: { targetId: id } });

    if (liked && target.role === "MURID" && !target.isFounder) {
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