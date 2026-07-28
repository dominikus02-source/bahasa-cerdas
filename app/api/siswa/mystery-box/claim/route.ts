import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";
import {
  KOTAK_HARIAN_REASON,
  getJakartaDateKey,
  getRewardForClaimCount,
  BOX_REWARDS,
} from "@/lib/mystery-box";

/**
 * Klaim kotak harian — hanya boleh sekali per hari (WIB).
 *
 * Sebelumnya kotak ini sepenuhnya berjalan di browser dengan localStorage:
 * tidak ada hadiah yang benar-benar masuk ke akun, dan cukup muat ulang
 * halaman untuk membukanya lagi tanpa batas. Sekarang hadiahnya nyata dan
 * penanda klaimnya ada di ledger CoinTransaction (reason + reference =
 * tanggal WIB), pola yang sama dengan klaim misi harian — tanpa kolom baru.
 */
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const todayKey = getJakartaDateKey();

    const result = await db.$transaction(async (tx) => {
      const already = await tx.coinTransaction.findFirst({
        where: { userId: user.id, reason: KOTAK_HARIAN_REASON, reference: todayKey },
        select: { id: true },
      });
      if (already) return { duplicate: true as const };

      const claimCount = await tx.coinTransaction.count({
        where: { userId: user.id, reason: KOTAK_HARIAN_REASON },
      });
      const reward = getRewardForClaimCount(claimCount);

      // Satu baris ledger per hari — inilah penanda "sudah diklaim". Untuk
      // hadiah XP, amount-nya 0: barisnya tetap dibuat sebagai penanda.
      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          amount: reward.jenis === "KOIN" ? reward.jumlah : 0,
          reason: KOTAK_HARIAN_REASON,
          reference: todayKey,
        },
      });

      if (reward.jenis === "KOIN") {
        await tx.user.update({
          where: { id: user.id },
          data: { coins: { increment: reward.jumlah } },
        });
      } else {
        const current = await tx.user.findUnique({
          where: { id: user.id },
          select: { xp: true },
        });
        const newXp = (current?.xp || 0) + reward.jumlah;
        await tx.user.update({
          where: { id: user.id },
          data: {
            xp: newXp,
            level: calcLevel(newXp),
            league: calcLeagueFromXP(newXp),
          },
        });
      }

      return {
        duplicate: false as const,
        reward,
        cycleDay: (claimCount % BOX_REWARDS.length) + 1,
      };
    });

    if (result.duplicate) {
      return NextResponse.json(
        { error: "Kotak hari ini sudah dibuka. Kembali lagi besok!" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      reward: result.reward,
      cycleDay: result.cycleDay,
    });
  } catch {
    return NextResponse.json({ error: "Gagal membuka kotak" }, { status: 500 });
  }
}
