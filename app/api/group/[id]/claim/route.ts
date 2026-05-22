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

    const group = await db.group.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    await db.$transaction(async (tx) => {
      await tx.groupMember.updateMany({
        where: { groupId: id, role: { in: ["ketua", "admin"] } },
        data: { role: "member" },
      });

      const existing = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: dbUser.id } },
      });

      if (existing) {
        await tx.groupMember.update({
          where: { groupId_userId: { groupId: id, userId: dbUser.id } },
          data: { role: "ketua" },
        });
      } else {
        await tx.groupMember.create({
          data: { groupId: id, userId: dbUser.id, role: "ketua" },
        });
      }
    });

    return NextResponse.json({ claimed: true, message: "Anda sekarang menjadi Ketua Kelas!" });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
