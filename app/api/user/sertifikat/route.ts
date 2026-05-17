import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await db.kompetensiCertificate.findMany({
      where: { userId: user.id },
      include: { 
        paket: { select: { title: true, type: true } },
        user: { select: { fullName: true } }
      },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
