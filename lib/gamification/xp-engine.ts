import { db } from "@/lib/db";
import { levelFromXp, cumulativeXpForLevel, levelAfterXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { weekKey, seasonPeriodKey, startOfWeekWIB } from "@/lib/gamification/season";

/**
 * XP Engine BC Arena — pintu pemberian XP UNIVERSAL.
 *
 * Semua fitur (Jalur Cerdas, Arena, Karya, UKBI/TKA, Penugasan, AI, dll) harus
 * memberikan XP lewat addXp() sehingga:
 *   1. XP tercatat 1:1 di XPTransaction (audit penuh, bisa di-trace balik).
 *   2. Kombinasi (userId, source, reference) UNIK → idempotent. Retry / klik
 *      ganda tidak pernah menggandakan XP.
 *   3. PlayerProfile di-update secara atomik: totalXP, level, rank, weeklyXP,
 *      seasonXP. Level & rank dihitung otomatis dari totalXP.
 *   4. weeklyXP di-reset otomatis saat minggu bergeser (lazy, tanpa cron).
 *   5. Naik level memicu reward koin otomatis.
 *
 * Catatan keamanan: fungsi ini TIDAK punya guard batas per-submit. Endpoint
 * /api/player/xp (yang menerima input klien) memakai lib/xp-guard.ts — fungsi
 * ini sendiri dipanggil server-side oleh fitur yang menghitung XP-nya sendiri.
 */

/** Sumber XP yang dikenal (untuk konsistensi metadata). */
export const XP_SOURCES = [
  "JALUR_CERDAS",
  "ARENA",
  "KARYA_SISWA",
  "ARTIKEL",
  "UKBI",
  "TKA",
  "PENUGASAN",
  "AI",
  "GAME",
  "KATASTRA",
  "MENARA",
  "KOMPETENSI",
  "SIMULASI",
  "DAILY_QUEST",
  "BADGE",
  "ACHIEVEMENT",
  "SYSTEM",
] as const;

export type XpSource = (typeof XP_SOURCES)[number];

/** Reward koin otomatis saat naik level. */
export const LEVEL_UP_COIN_REWARD = 20;

/** Reward koin per pencapaian level penting (level 10, 20, ...). */
const MILESTONE_COIN_REWARD = 50;

export interface AddXpParams {
  userId: string;
  source: XpSource;
  amount: number;
  /** Metadata JSON bebas (unitId, paketId, karyaId, ...). */
  metadata?: Record<string, unknown>;
  /** Referensi idempotency. WAJIB untuk sumber yang bisa terpanggil berulang. */
  reference?: string;
  /** Nonaktifkan reward koin saat naik level (untuk migrasi/bulk import). */
  silent?: boolean;
}

export interface AddXpResult {
  xpAdded: number;
  totalXp: number;
  level: number;
  rank: string;
  weeklyXp: number;
  seasonXp: number;
  levelUp: boolean;
  levelBefore: number;
  coinsEarned: number;
  /** True kalau permintaan ditolak karena sudah pernah dicatat (idempotent). */
  duplicate: boolean;
}

export async function addXp(params: AddXpParams): Promise<AddXpResult> {
  const amount = Math.max(1, Math.floor(params.amount));
  const source = params.source;

  return db.$transaction(async (tx) => {
    // ── 1. Idempotency guard ────────────────────────────────────────────
    // Kombinasi (userId, source, reference) unik di DB. Retry aman.
    if (params.reference) {
      const existing = await tx.xPTransaction.findUnique({
        where: { userId_source_reference: { userId: params.userId, source, reference: params.reference } },
      });
      if (existing) {
        const prof = await tx.playerProfile.findUnique({ where: { userId: params.userId } });
        return {
          xpAdded: 0,
          totalXp: prof?.totalXP ?? 0,
          level: prof?.level ?? 1,
          rank: prof?.currentRank ?? "BRONZE",
          weeklyXp: prof?.weeklyXP ?? 0,
          seasonXp: prof?.seasonXP ?? 0,
          levelUp: false,
          levelBefore: prof?.level ?? 1,
          coinsEarned: 0,
          duplicate: true,
        };
      }
    }

    // ── 2. Pastikan profile ada (lazy create) ───────────────────────────
    const profile = await tx.playerProfile.upsert({
      where: { userId: params.userId },
      update: {},
      create: { userId: params.userId },
    });

    // ── 3. Lazy weekly reset ────────────────────────────────────────────
    const wk = weekKey();
    const sp = seasonPeriodKey();
    const weeklyXpBase = profile.weeklyXPWeekKey === wk ? profile.weeklyXP : 0;
    const seasonXpBase = profile.seasonPeriodKey === sp ? profile.seasonXP : 0;

    // ── 4. Hitung level/rank BARU dari totalXP (computed, bukan hardcode) ──
    const levelBefore = profile.level;
    const totalXp = profile.totalXP + amount;
    const level = levelFromXp(totalXp);
    const rank = rankFromLevel(level);
    const levelUp = level > levelBefore;

    // ── 5. Simpan atomik ────────────────────────────────────────────────
    await tx.xPTransaction.create({
      data: {
        userId: params.userId,
        profileId: profile.id,
        source,
        amount,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        reference: params.reference,
      },
    });

    const levelUpCoins = levelUp && !params.silent ? LEVEL_UP_COIN_REWARD : 0;
    const milestone = levelUp && !params.silent && level % 10 === 0 ? MILESTONE_COIN_REWARD : 0;
    const coinsEarned = levelUpCoins + milestone;

    await tx.playerProfile.update({
      where: { id: profile.id },
      data: {
        totalXP: totalXp,
        level,
        currentRank: rank,
        weeklyXP: weeklyXpBase + amount,
        weeklyXPWeekKey: wk,
        seasonXP: seasonXpBase + amount,
        seasonPeriodKey: sp,
        lastActiveAt: new Date(),
        coin: { increment: coinsEarned },
      },
    });

    // ── 6. Catat reward koin naik level di CoinTransaction (audit) ───────
    if (coinsEarned > 0 && !params.silent) {
      await tx.coinTransaction.create({
        data: {
          userId: params.userId,
          amount: coinsEarned,
          reason: "LEVEL_UP",
          reference: `level-${level}-${wk}`,
        },
      });
    }

    return {
      xpAdded: amount,
      totalXp,
      level,
      rank,
      weeklyXp: weeklyXpBase + amount,
      seasonXp: seasonXpBase + amount,
      levelUp,
      levelBefore,
      coinsEarned,
      duplicate: false,
    };
  });
}

/**
 * Total XP yang dibutuhkan untuk level berikutnya (dipakai UI).
 */
export function xpNeededForNextLevel(level: number): number {
  return cumulativeXpForLevel(level + 1) - cumulativeXpForLevel(level);
}

export { levelFromXp, levelAfterXp, cumulativeXpForLevel };
export { startOfWeekWIB };
