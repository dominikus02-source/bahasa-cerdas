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
 *   4. catat ledger, dan
 *   5. perbarui progresi murid: User.xp + PlayerProfile, dengan level & rank
 *      dari kurva RESMI.
 *
 * ── Satu sistem progresi ──────────────────────────────────────────────────
 * `User.xp` adalah SATU-SATUNYA total XP. `PlayerProfile.totalXP` adalah
 * cerminnya, ditulis di transaksi yang sama supaya tidak pernah bisa
 * berbeda. Level & rank SELALU dihitung dari total itu memakai
 * `lib/gamification/levels.ts` + `ranks.ts` — tidak ada rumus kedua.
 *
 * Sampai Sprint 6 ada dua tumpukan paralel: `lib/xp.ts` (level = xp/500,
 * liga 4 tingkat) menulis User, sementara `lib/gamification/` menulis
 * PlayerProfile. Akibatnya murid dengan 8.000 XP tampil "Level 17 Berlian" di
 * beranda Arena dan "Level 21 Gold" di dasbor Pemain. `lib/xp.ts` sudah dihapus;
 * jangan hidupkan lagi.
 *
 * `User.league` sengaja TIDAK ditulis lagi: enum `LeagueType` hanya memuat 4
 * nilai dan tidak akan pernah bisa menampung 9 rank resmi. Rank pemain hidup di
 * `PlayerProfile.currentRank`.
 *
 * Dua tabel catatan yang tetap ada, dengan peran berbeda (bukan sistem ganda):
 *   - `XpLedger`     → penghitung anti-penyalahgunaan (kuota harian).
 *   - `XPTransaction`→ riwayat XP yang dilihat murid + sumber untuk badge.
 */
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { weekKey, seasonPeriodKey } from "@/lib/gamification/season";
import { LEVEL_UP_COIN_REWARD, MILESTONE_COIN_REWARD } from "@/lib/gamification/xp-engine";
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
  /** Rank resmi (BRONZE..LEGEND) sesudah pemberian ini. */
  rank: string;
  /** Koin bonus naik level / milestone yang ikut diberikan. */
  koinDidapat: number;
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
    // Idempotensi: (userId, source, reference) unik di XPTransaction. Retry,
    // double-submit, dan replay attempt basi tidak menambah XP dua kali.
    if (reference) {
      const sudahAda = await tx.xPTransaction.findUnique({
        where: { userId_source_reference: { userId, source: sumber, reference } },
      });
      if (sudahAda) {
        const prof = await tx.user.findUnique({ where: { id: userId }, select: { xp: true } });
        const lv = levelFromXp(prof?.xp ?? 0);
        return {
          xpDiberikan: 0, boosted: false, kuotaHabis: false,
          totalXp: prof?.xp ?? 0, levelLama: lv, levelBaru: lv,
          naikLevel: false, rank: rankFromLevel(lv), koinDidapat: 0,
        };
      }
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    if (!user) {
      return {
        xpDiberikan: 0, boosted: false, kuotaHabis: false,
        totalXp: 0, levelLama: 1, levelBaru: 1, naikLevel: false,
        rank: "BRONZE", koinDidapat: 0,
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

    // Level lama dihitung ulang dari total, bukan dibaca dari User.level —
    // baris lama masih menyimpan level hasil rumus usang (xp/500).
    const levelLama = levelFromXp(user.xp);

    if (xpDiberikan <= 0) {
      return {
        xpDiberikan: 0,
        boosted: multiplier > 1,
        kuotaHabis: kuota.terpotong,
        totalXp: user.xp,
        levelLama,
        levelBaru: levelLama,
        naikLevel: false,
        rank: rankFromLevel(levelLama),
        koinDidapat: 0,
      };
    }

    const totalXp = user.xp + xpDiberikan;
    const levelBaru = levelFromXp(totalXp);
    const rank = rankFromLevel(levelBaru);
    const naikLevel = levelBaru > levelLama;

    // ── Catatan anti-penyalahgunaan (kuota harian) ──────────────────────
    await tx.xpLedger.create({
      data: { userId, amount: xpDiberikan, source: sumber, reference },
    });

    await tx.user.update({
      where: { id: userId },
      // league sengaja tidak ditulis — lihat catatan di kepala berkas.
      data: { xp: totalXp, level: levelBaru, lastActiveAt: new Date() },
    });

    // ── Sinkronkan PlayerProfile di transaksi yang SAMA ─────────────────
    const profile = await tx.playerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const wk = weekKey();
    const sp = seasonPeriodKey();
    // Lazy reset: kalau kunci minggu/season sudah bergeser, mulai dari 0.
    const weeklyBase = profile.weeklyXPWeekKey === wk ? profile.weeklyXP : 0;
    const seasonBase = profile.seasonPeriodKey === sp ? profile.seasonXP : 0;

    const koinNaikLevel = naikLevel ? LEVEL_UP_COIN_REWARD : 0;
    const koinMilestone = naikLevel && levelBaru % 10 === 0 ? MILESTONE_COIN_REWARD : 0;
    const koinDidapat = koinNaikLevel + koinMilestone;

    await tx.playerProfile.update({
      where: { id: profile.id },
      data: {
        totalXP: totalXp, // cermin User.xp — tidak pernah dihitung terpisah
        level: levelBaru,
        currentRank: rank,
        weeklyXP: weeklyBase + xpDiberikan,
        weeklyXPWeekKey: wk,
        seasonXP: seasonBase + xpDiberikan,
        seasonPeriodKey: sp,
        lastActiveAt: new Date(),
        coin: { increment: koinDidapat },
      },
    });

    // ── Riwayat XP yang dilihat murid ──────────────────────────────────
    await tx.xPTransaction.create({
      data: {
        userId,
        profileId: profile.id,
        source: sumber,
        amount: xpDiberikan,
        reference,
      },
    });

    if (koinDidapat > 0) {
      await tx.coinTransaction.create({
        data: {
          userId,
          amount: koinDidapat,
          reason: "LEVEL_UP",
          reference: `level-${levelBaru}-${wk}`,
        },
      });
    }

    return {
      xpDiberikan,
      boosted: multiplier > 1,
      kuotaHabis: kuota.terpotong,
      totalXp,
      levelLama,
      levelBaru,
      naikLevel,
      rank,
      koinDidapat,
    };
  });
}
