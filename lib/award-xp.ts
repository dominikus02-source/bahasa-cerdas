/**
 * Satu-satunya pintu pemberian XP.
 *
 * Sebelumnya setiap rute menghitung dan menyimpan XP-nya sendiri-sendiri, dan
 * dua di antaranya (`/api/game/xp`, `/api/game/result`) memakai angka kiriman
 * klien apa adanya — dipakai tiga murid untuk mencapai Level 751 dengan
 * autoclicker. Menyebar logikanya seperti itu berarti setiap rute baru berisiko
 * mengulang lubang yang sama.
 *
 * Semua yang harus benar dikerjakan di sini, dalam satu transaksi:
 *   1. pangkas ke batas per submit sesuai sumbernya,
 *   2. tegakkan kuota harian dari XpLedger (bukan Redis — lihat catatan di
 *      lib/xp-guard.ts soal pembatas laju yang gagal-terbuka),
 *   3. kalikan XP Boost hanya atas XP yang sudah lolos batas,
 *   4. catat satu baris ledger, dan
 *   5. perbarui xp/level/liga murid.
 */
import { db } from "@/lib/db";
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";
import { getXpMultiplier } from "@/lib/xp-boost";
import { batasiXpSubmit, terapkanKuotaHarian, awalHariWIB } from "@/lib/xp-guard";

export type HasilPemberianXp = {
  /** XP yang benar-benar masuk ke akun (sesudah batas, kuota, dan boost). */
  xpDiberikan: number;
  /** True kalau XP Boost aktif dan ikut mengalikan. */
  boosted: boolean;
  /** True kalau permintaan dipangkas karena kuota harian sudah habis. */
  kuotaHabis: boolean;
  /** Total XP murid sesudah pemberian ini. */
  totalXp: number;
  levelLama: number;
  levelBaru: number;
  naikLevel: boolean;
  liga: string;
};

/**
 * Berikan XP ke murid dengan seluruh pengaman terpasang.
 *
 * `xpMentah` adalah XP hasil hitungan server (JANGAN pernah mengoper angka
 * yang berasal dari badan permintaan klien).
 */
export async function awardXp(
  userId: string,
  sumber: string,
  xpMentah: number,
  reference?: string,
): Promise<HasilPemberianXp> {
  const diminta = batasiXpSubmit(sumber, xpMentah);

  // Boost dibaca di luar transaksi: query read-only dan tidak boleh memperpanjang
  // kunci baris User lebih lama dari yang perlu.
  const multiplier = await getXpMultiplier(userId);

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    if (!user) {
      return {
        xpDiberikan: 0, boosted: false, kuotaHabis: false,
        totalXp: 0, levelLama: 1, levelBaru: 1, naikLevel: false, liga: "BRONZE",
      };
    }

    // Kuota dihitung di dalam transaksi supaya dua permintaan yang berbarengan
    // tidak sama-sama membaca sisa kuota yang sudah usang.
    const terpakai = await tx.xpLedger.aggregate({
      where: { userId, createdAt: { gte: awalHariWIB() } },
      _sum: { amount: true },
    });
    const kuota = terapkanKuotaHarian(terpakai._sum.amount || 0, diminta);

    const xpDiberikan = Math.round(kuota.xp * multiplier);

    if (xpDiberikan <= 0) {
      return {
        xpDiberikan: 0,
        boosted: multiplier > 1,
        kuotaHabis: kuota.terpotong,
        totalXp: user.xp,
        levelLama: user.level,
        levelBaru: user.level,
        naikLevel: false,
        liga: calcLeagueFromXP(user.xp),
      };
    }

    const totalXp = user.xp + xpDiberikan;
    const levelBaru = calcLevel(totalXp);
    const liga = calcLeagueFromXP(totalXp);

    await tx.xpLedger.create({
      data: { userId, amount: xpDiberikan, source: sumber, reference },
    });

    await tx.user.update({
      where: { id: userId },
      data: { xp: totalXp, level: levelBaru, league: liga as any, lastActiveAt: new Date() },
    });

    return {
      xpDiberikan,
      boosted: multiplier > 1,
      kuotaHabis: kuota.terpotong,
      totalXp,
      levelLama: user.level,
      levelBaru,
      naikLevel: levelBaru > user.level,
      liga,
    };
  });
}
