import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const community = await db.community.findUnique({ where: { id } });
    if (!community) return NextResponse.json({ error: "Komunitas tidak ditemukan" }, { status: 404 });

    // Cek keanggotaan — hanya anggota komunitas yang bisa claim
    const callerMembership = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId: dbUser.id } },
    });
    if (!callerMembership) return NextResponse.json({ error: "Hanya anggota komunitas yang bisa menjadi Ketua" }, { status: 403 });

    // Cek apakah sudah ada ketua yang aktif (posting dalam 30 hari terakhir)
    const existingKetua = await db.communityMember.findFirst({
      where: { communityId: id, role: "ketua" },
    });

    if (existingKetua && existingKetua.userId !== dbUser.id) {
      const recentPost = await db.communityPost.findFirst({
        where: { communityId: id, userId: existingKetua.userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: "desc" },
      });
      if (recentPost) {
        return NextResponse.json({ error: "Komunitas masih memiliki Ketua aktif. Tidak bisa mengambil alih." }, { status: 403 });
      }
    }

    await db.$transaction(async (tx) => {
      await tx.communityMember.updateMany({
        where: { communityId: id, role: { in: ["ketua", "admin"] } },
        data: { role: "member" },
      });

      await tx.communityMember.update({
        where: { communityId_userId: { communityId: id, userId: dbUser.id } },
        data: { role: "ketua" },
      });
    });

    return NextResponse.json({ claimed: true, message: "Anda sekarang menjadi Ketua komunitas ini" });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
