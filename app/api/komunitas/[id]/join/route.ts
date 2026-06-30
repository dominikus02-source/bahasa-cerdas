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
    if (!dbUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const community = await db.community.findUnique({ where: { id } });
    if (!community) return NextResponse.json({ error: "Komunitas tidak ditemukan" }, { status: 404 });
    if (community.status !== "APPROVED" || !community.isPublic) {
      return NextResponse.json({ error: "Komunitas ini tidak dapat diakses" }, { status: 403 });
    }

    const existing = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId: dbUser.id } },
    });

    if (existing) {
      await db.communityMember.delete({
        where: { communityId_userId: { communityId: id, userId: dbUser.id } },
      });
      await db.community.update({
        where: { id },
        data: { memberCount: { decrement: 1 } },
      });
      return NextResponse.json({ joined: false, message: "Berhasil keluar komunitas" });
    }

    await db.communityMember.create({
      data: { communityId: id, userId: dbUser.id, role: "member" },
    });
    await db.community.update({
      where: { id },
      data: { memberCount: { increment: 1 } },
    });
    return NextResponse.json({ joined: true, message: "Berhasil bergabung" });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}