import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { spendCoins } from "@/lib/coins";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const item = await db.storeItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }

    await spendCoins(user.id, item.price, `MEMBELI_${item.type}`, itemId);

    const existing = await db.userItem.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
    });

    if (existing) {
      await db.userItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      });
    } else {
      await db.userItem.create({
        data: {
          userId: user.id,
          itemId,
          quantity: 1,
          expiresAt: item.type === "XP_BOOST"
            ? new Date(Date.now() + 86400000)
            : undefined,
        },
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
