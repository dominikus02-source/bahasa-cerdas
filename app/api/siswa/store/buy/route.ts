import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { spendCoins } from "@/lib/coins";
import { db } from "@/lib/db";
import { hitungExpiresAtBoost } from "@/lib/xp-boost";

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

    // Durasi boost diambil dari barangnya sendiri — dulu SEMUA XP_BOOST diberi
    // 24 jam, sehingga "Double XP 15 Menit" (75 koin) diam-diam berlaku 96x
    // lebih lama daripada yang dijanjikan namanya.
    const isXpBoost = item.type === "XP_BOOST";

    // Coin Shop 2.4 — Pak beri quantity lebih dari 1.
    // HINT_TOKEN_PACK memberikan 5 Hint Token sekaligus.
    const packQuantity = item.type === "HINT_TOKEN_PACK" ? 5 : 1;

    if (existing) {
      await db.userItem.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: packQuantity },
          // Baris UserItem unik per (userId, itemId), jadi pembelian ulang hanya
          // menambah quantity. Tanpa memperpanjang masa aktif, boost kedua yang
          // dibeli murid tidak akan pernah berlaku.
          ...(isXpBoost
            ? { expiresAt: hitungExpiresAtBoost(item, existing.expiresAt) }
            : {}),
        },
      });
    } else {
      await db.userItem.create({
        data: {
          userId: user.id,
          itemId,
          quantity: packQuantity,
          expiresAt: isXpBoost ? hitungExpiresAtBoost(item) : undefined,
        },
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
