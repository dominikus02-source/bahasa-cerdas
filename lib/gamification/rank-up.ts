import { db } from "@/lib/db";
import type { BadgeRarity, PlayerRank } from "@prisma/client";
import { rankFromLevel, RANK_META, minLevelForRank } from "@/lib/gamification/ranks";
import { RANK_REWARDS } from "@/lib/gamification/rank-rewards";
import { RANK_ORDER } from "@/lib/gamification/rank-assets";

/**
 * RANK-UP REWARD — pencairan reward saat naik Rank (idempotent).
 *
 * Reward (lihat rank-rewards.ts): koin, badge rank, title, frame avatar,
 * border profile, mystery box. Semua dicairkan IDEMPOTENT sehingga aman
 * dipanggil berulang (retry / klaim ganda tidak menggandakan reward).
 *
 * - Koin (+ mystery box): addCoin(reason "RANK_UP", reference "rank-up-<RANK>")
 *   → kombinasi unik, tidak pernah cair dua kali.
 * - Badge: definisi Badge di-upsert; UserBadge createMany skipDuplicates.
 * - Title/frame: di-set ke PlayerProfile HANYA bila masih kosong (menghormati
 *   kustomisasi user).
 *
 * Logika naik level/rank TETAP di XP Engine (lib/gamification/xp-engine.ts) —
 * file ini hanya lapisan reward ADDITIVE di atasnya.
 */

const RANK_TO_RARITY: Record<PlayerRank, BadgeRarity> = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  EMERALD: "GOLD",
  RUBY: "GOLD",
  SAPPHIRE: "GOLD",
  DIAMOND: "LEGENDARY",
  MASTER: "LEGENDARY",
  LEGEND: "LEGENDARY",
};

export interface RankRewardGranted {
  rank: PlayerRank;
  coin: number;
  badge: boolean;
  badgeName: string;
  title: string;
  frame: string | null;
  border: string | null;
  mysteryBox: boolean;
  mysteryBoxCoins: number;
}

export interface RankUpResult {
  rank: PlayerRank;
  title: string;
  color: string;
  granted: RankRewardGranted[];
  /** True bila ada reward baru yang dicairkan. */
  hasNewRewards: boolean;
}

/** Pastikan definisi badge rank ada (idempotent). */
async function ensureRankBadge(rank: PlayerRank, code: string, name: string) {
  const minLevel = minLevelForRank(rank);
  await db.badge.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name,
      icon: "👑",
      description: `Naik ke rank ${RANK_META[rank].label} (Level ${minLevel}+)`,
      condition: { type: "LEVEL", target: minLevel } as never,
      rarity: RANK_TO_RARITY[rank],
      isActive: true,
    },
  });
}

/**
 * Cairkan reward untuk SEMUA rank yang sudah dicapai user (retroaktif untuk
 * pemain existing) secara idempotent. Return reward yang BARU tercairkan.
 */
export async function grantRankUpRewards(userId: string): Promise<RankUpResult> {
  const profile = await db.playerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const currentRank = rankFromLevel(profile.level);
  const targetIndex = RANK_ORDER.indexOf(currentRank);
  const granted: RankRewardGranted[] = [];

  for (let i = 0; i <= targetIndex; i++) {
    const rank = RANK_ORDER[i];
    const reward = RANK_REWARDS[rank];
    const totalCoin = reward.coin + (reward.mysteryBox ? reward.mysteryBoxCoins : 0);

    // Write to User.coins (canonical wallet) — same pattern as awardCoins
    // in lib/coins.ts but with custom amount for rank-up rewards.
    const rankTx = await db.coinTransaction.findFirst({
      where: { userId, reason: "RANK_UP", reference: `rank-up-${rank}` },
      select: { id: true },
    });
    const coin = rankTx ? 0 : totalCoin;
    if (coin > 0) {
      await db.$transaction([
        db.coinTransaction.create({
          data: { userId, amount: coin, reason: "RANK_UP", reference: `rank-up-${rank}` },
        }),
        db.user.update({
          where: { id: userId },
          data: { coins: { increment: coin } },
        }),
      ]);
    }

    let badgeNew = false;
    await ensureRankBadge(rank, reward.badgeCode, reward.badgeName);
    const badgeRow = await db.badge.findUnique({ where: { code: reward.badgeCode } });
    if (badgeRow) {
      const created = await db.userBadge.createMany({
        data: [{ userId, badgeId: badgeRow.id }],
        skipDuplicates: true,
      });
      badgeNew = created.count > 0;
    }

    const patch: { title?: string; frame?: string; lastActiveAt?: Date } = {};
    if (profile.title === null) patch.title = reward.title;
    if (profile.frame === null) patch.frame = reward.frame ?? undefined;
    if (Object.keys(patch).length > 0) {
      patch.lastActiveAt = new Date();
      await db.playerProfile.update({ where: { id: profile.id }, data: patch });
    }

    if (coin > 0 || badgeNew || Object.keys(patch).length > 0) {
      granted.push({
        rank,
        coin,
        badge: badgeNew,
        badgeName: reward.badgeName,
        title: reward.title,
        frame: reward.frame,
        border: reward.border,
        mysteryBox: reward.mysteryBox,
        mysteryBoxCoins: reward.mysteryBox ? reward.mysteryBoxCoins : 0,
      });
    }
  }

  const meta = RANK_META[currentRank];
  return {
    rank: currentRank,
    title: meta.title,
    color: meta.color,
    granted,
    hasNewRewards: granted.length > 0,
  };
}
