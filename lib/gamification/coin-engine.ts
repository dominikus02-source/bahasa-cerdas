import { db } from "@/lib/db";
import { weekKey } from "@/lib/gamification/season";

/**
 * Coin Engine BC Arena — saldo koin di PlayerProfile.coin, diaudit lewat
 * tabel CoinTransaction yang sudah ada (prefix reason "BCA_" supaya tidak
 * bentrok dengan koin eksisting User.coins yang memakai reason lain).
 *
 * Semua mutasi saldo koin engine WAJIB lewat addCoin/deductCoin supaya selalu
 * ada jejak audit 1:1 di CoinTransaction.
 */

export interface CoinOpResult {
  balance: number;
  amount: number;
  duplicate: boolean;
}

/**
 * Tambah koin ke PlayerProfile.coin + catat audit.
 * Idempotent: kombinasi (reason, reference) tidak boleh cair dua kali.
 */
export async function addCoin(
  userId: string,
  amount: number,
  reason: string,
  reference?: string,
): Promise<CoinOpResult> {
  const amt = Math.max(1, Math.floor(amount));

  return db.$transaction(async (tx) => {
    // Idempotency: satu (reason, reference) hanya bisa cair sekali.
    if (reference) {
      const existing = await tx.coinTransaction.findFirst({
        where: { userId, reason: `BCA_${reason}`, reference },
        select: { id: true },
      });
      if (existing) {
        const prof = await tx.playerProfile.findUnique({ where: { userId } });
        return { balance: prof?.coin ?? 0, amount: 0, duplicate: true };
      }
    }

    const profile = await tx.playerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await tx.playerProfile.update({
      where: { id: profile.id },
      data: { coin: { increment: amt }, lastActiveAt: new Date() },
    });
    await tx.coinTransaction.create({
      data: { userId, amount: amt, reason: `BCA_${reason}`, reference: reference ?? `bcacoin-${weekKey()}` },
    });

    return { balance: profile.coin + amt, amount: amt, duplicate: false };
  });
}

/**
 * Kurangi koin dari PlayerProfile.coin (transaksi atomik, tolak jika saldo
 * tidak cukup). Selalu mencatat transaksi negatif di CoinTransaction.
 */
export async function deductCoin(
  userId: string,
  amount: number,
  reason: string,
  reference?: string,
): Promise<{ balance: number; success: boolean }> {
  const amt = Math.max(1, Math.floor(amount));

  return db.$transaction(async (tx) => {
    const profile = await tx.playerProfile.findUnique({ where: { userId } });
    if (!profile || profile.coin < amt) {
      return { balance: profile?.coin ?? 0, success: false };
    }

    await tx.playerProfile.update({
      where: { id: profile.id },
      data: { coin: { decrement: amt }, lastActiveAt: new Date() },
    });
    await tx.coinTransaction.create({
      data: { userId, amount: -amt, reason: `BCA_${reason}`, reference },
    });

    return { balance: profile.coin - amt, success: true };
  });
}

/** Saldo koin engine saat ini. */
export async function getCoinBalance(userId: string): Promise<number> {
  const profile = await db.playerProfile.findUnique({ where: { userId } });
  return profile?.coin ?? 0;
}
