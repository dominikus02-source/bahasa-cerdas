import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const purchases = await db.pembelian.findMany({
      where: { buyerId: user.id },
      include: { karya: { select: { id: true, title: true, fileUrl: true, type: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Deduplicate by karyaId — keep latest Pembelian per unique karya
    const seen = new Set<string>();
    const orders = purchases.filter((p) => {
      if (seen.has(p.karyaId)) return false;
      seen.add(p.karyaId);
      return true;
    });

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
