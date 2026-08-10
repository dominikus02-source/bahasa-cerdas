import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/nickname";

/**
 * GET /api/user/profile/[id]/social — data sosial profil (read-only).
 *
 * Publik (tanpa auth): followerCount, followingCount, profileLikeCount.
 * Dengan auth (opt-in): isFollowing / isLiked untuk viewer saat ini.
 * Preview: follower/following terbaru (maks 6) untuk avatar stack.
 *
 * TIDAK di-cache Redis: state sosial berubah cepat (follow/like toggle),
 * tidak boleh memakai cache 300s yang dipakai /api/user/profile/[id].
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getUser().catch(() => null);

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const [followerCount, followingCount, profileLikeCount, followers, following, viewerFollow, viewerLike] =
      await Promise.all([
        db.follow.count({ where: { followingId: id } }),
        db.follow.count({ where: { followerId: id } }),
        db.profileLike.count({ where: { targetId: id } }),
        db.follow.findMany({
          where: { followingId: id },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            follower: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
                avatar: true,
                playerProfile: { select: { currentRank: true } },
              },
            },
          },
        }),
        db.follow.findMany({
          where: { followerId: id },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            following: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
                avatar: true,
                playerProfile: { select: { currentRank: true } },
              },
            },
          },
        }),
        me ? db.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: id } } }) : null,
        me ? db.profileLike.findUnique({ where: { likerId_targetId: { likerId: me.id, targetId: id } } }) : null,
      ]);

    return NextResponse.json({
      followerCount,
      followingCount,
      profileLikeCount,
      isFollowing: me ? !!viewerFollow : null,
      isLiked: me ? !!viewerLike : null,
      followers: followers.map((f) => ({
        id: f.follower.id,
        displayName: getDisplayName(f.follower, "peer"),
        avatar: f.follower.avatar,
        rank: f.follower.playerProfile?.currentRank ?? "BRONZE",
      })),
      following: following.map((f) => ({
        id: f.following.id,
        displayName: getDisplayName(f.following, "peer"),
        avatar: f.following.avatar,
        rank: f.following.playerProfile?.currentRank ?? "BRONZE",
      })),
    });
  } catch (error) {
    console.error("Error fetching social profile:", error);
    return NextResponse.json({ error: "Gagal memuat data sosial" }, { status: 500 });
  }
}