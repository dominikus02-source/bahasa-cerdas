import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  KOTAK_HARIAN_REASON,
  getJakartaDateKey,
  getRewardForClaimCount,
  BOX_REWARDS,
} from "@/lib/mystery-box";

/** Status kotak harian: sudah diklaim hari ini atau belum, dan hadiah berikutnya. */
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

    // Kalau hari ini sudah diklaim, hadiah yang ditampilkan adalah yang barusan
    // didapat (klaim ke-count), bukan hadiah besok.
    const rewardIndex = claimedToday ? claimCount - 1 : claimCount;

    return NextResponse.json({
      claimedToday: !!claimedToday,
      claimCount,
      cycleDay: (rewardIndex % BOX_REWARDS.length) + 1,
      reward: getRewardForClaimCount(Math.max(0, rewardIndex)),
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat kotak harian" }, { status: 500 });
  }
}
