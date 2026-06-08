import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [purchases, history] = await Promise.all([
      db.pembelian.findMany({
        where: { buyerId: user.id },
        include: { karya: { select: { id: true, title: true, fileUrl: true, type: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.purchaseHistory.findMany({
        where: { buyerId: user.id },
        orderBy: { soldAt: "desc" },
        take: 50,
      }),
    ]);

    const orders = [...purchases, ...history].sort((a: any, b: any) => {
      const da = new Date(a.createdAt || a.soldAt).getTime();
      const db = new Date(b.createdAt || b.soldAt).getTime();
      return db - da;
    });

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
