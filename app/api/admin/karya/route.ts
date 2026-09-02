import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

/**
 * GET /api/admin/karya
 *
 * Admin marketplace management — teacher-sold products (Karya model).
 * NOT student works (StudentKarya). The canonical marketplace product model
 * represents teacher-created goods/services/content that users can purchase.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { seller: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [products, total] = await Promise.all([
      db.karya.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: { select: { id: true, fullName: true, email: true } },
          _count: { select: { purchases: true } },
        },
      }),
      db.karya.count({ where }),
    ]);

    return NextResponse.json({ karya: products, total, page, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.karya.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
