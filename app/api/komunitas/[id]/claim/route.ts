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

    await db.$transaction(async (tx) => {
      await tx.communityMember.updateMany({
        where: { communityId: id, role: { in: ["ketua", "admin"] } },
        data: { role: "member" },
      });

      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: id, userId: dbUser.id } },
      });

      if (existing) {
        await tx.communityMember.update({
          where: { communityId_userId: { communityId: id, userId: dbUser.id } },
          data: { role: "ketua" },
        });
      } else {
        await tx.communityMember.create({
          data: { communityId: id, userId: dbUser.id, role: "ketua" },
        });
        await tx.community.update({
          where: { id },
          data: { memberCount: { increment: 1 } },
        });
      }
    });

    return NextResponse.json({ claimed: true, message: "Anda sekarang menjadi Ketua komunitas ini" });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
