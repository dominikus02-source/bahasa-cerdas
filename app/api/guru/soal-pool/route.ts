import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pools = await db.paketKompetensi.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { title: "asc" }],
      take: 50,
    });

    return NextResponse.json({ pools });
  } catch (error) {
    console.error("GET /api/guru/soal-pool error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
