import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  KOTAK_HARIAN_REASON,
  getJakartaDateKey,
  getSlotForClaimCount,
  BOX_SLOTS,
} from "@/lib/mystery-box";

/** Status kotak harian: sudah diklaim hari ini atau belum, dan slot berjalan. */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const todayKey = getJakartaDateKey();

    const [claimedToday, claimCount] = await Promise.all([
      db.coinTransaction.findFirst({
        where: { userId: user.id, reason: KOTAK_HARIAN_REASON, reference: todayKey },
        select: { id: true },
      }),
      db.coinTransaction.count({
        where: { userId: user.id, reason: KOTAK_HARIAN_REASON },
      }),
    ]);

    // Kalau hari ini sudah diklaim, slot yang ditampilkan adalah yang barusan
    // dibuka (klaim ke-count), bukan slot besok.
    const slotIndex = Math.max(0, claimedToday ? claimCount - 1 : claimCount);

    return NextResponse.json({
      claimedToday: !!claimedToday,
      claimCount,
      cycleDay: (slotIndex % BOX_SLOTS.length) + 1,
      slot: getSlotForClaimCount(slotIndex),
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat kotak harian" }, { status: 500 });
  }
}
