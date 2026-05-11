import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const memberships = await db.groupMember.findMany({
      where: { userId: dbUser.id },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, fullName: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ memberships });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}