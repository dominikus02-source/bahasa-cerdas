import { db } from "./db";

const COIN_REWARDS = {
  MENULIS_KARYA: 10,
  TANTANGAN_MINGGUAN: 25,
  MENDAPAT_LIKE: 2,
  MEMBERI_KOMENTAR: 1,
  DAILY_LOGIN: 5,
  QUEST_COMPLETE: 0,
  STREAK_7: 30,
  STREAK_30: 150,
  STREAK_100: 1000,
} as const;

/** Koin dasar untuk setiap karya yang diterbitkan (dipakai UI untuk umpan balik). */
export const COIN_MENULIS_KARYA = COIN_REWARDS.MENULIS_KARYA;

// Every type in this pool MUST have a tracker call somewhere, or the quest can
// appear on a student's list and be permanently uncompletable. MAIN_GAME and
// STREAK_LOGIN used to sit here with no tracker anywhere in the codebase —
// dead quests waiting to be picked. Removed until something actually tracks
// them. Trackers today: MENULIS/MENGOMENTARI/MEMBERI_LIKE in the karya routes,
// BACA_MATERI on Jalur Cerdas unit completion, MENJAWAB_KUIS on each answered
// Jalur Cerdas question.
const QUEST_POOL = [
  { type: "MENULIS", target: 1, rewardCoins: 10 },
  { type: "MENGOMENTARI", target: 3, rewardCoins: 5 },
  { type: "MEMBERI_LIKE", target: 5, rewardCoins: 5 },
  { type: "MENJAWAB_KUIS", target: 10, rewardCoins: 10 },
  { type: "BACA_MATERI", target: 2, rewardCoins: 15 },
] as const;

// One learning quest is guaranteed every day. The quests used to be whatever a
// hash happened to pick, and on 2026-07-22 all three were social — the daily
// missions were pushing students toward like-farming on the very day learning
// finally overtook it. Learning also pays better than any social quest, so the
// missions and the leaderboard point the same way.
const LEARNING_TYPES = ["BACA_MATERI", "MENJAWAB_KUIS"] as const;

function pickDailyQuests(seed: number) {
  const learning = QUEST_POOL.filter(q => (LEARNING_TYPES as readonly string[]).includes(q.type));
  const social = QUEST_POOL.filter(q => !(LEARNING_TYPES as readonly string[]).includes(q.type));
  const picks = [
    learning[seed % learning.length],
    social[seed % social.length],
    social[(seed + 1) % social.length],
  ];
  return picks.map(q => ({ type: q.type, target: q.target, rewardCoins: q.rewardCoins }));
}

export async function awardCoins(
  userId: string,
  reason: keyof typeof COIN_REWARDS,
  reference?: string
) {
  const amount = COIN_REWARDS[reason];
  if (!amount) return { coins: 0 };

  const [tx] = await db.$transaction([
    db.coinTransaction.create({
      data: { userId, amount, reason, reference },
    }),
    db.user.update({
      where: { id: userId },
      data: { coins: { increment: amount } },
    }),
  ]);

  return { coins: amount, transaction: tx };
}

/**
 * Bonus koin untuk karya yang menjawab tantangan minggu berjalan.
 *
 * Hanya cair sekali per periode tantangan. Sama seperti claimQuestReward,
 * ledger CoinTransaction sendiri yang jadi catatannya (reason + reference),
 * jadi tidak perlu kolom baru: satu transaksi per challengeId per murid.
 *
 * Mengembalikan jumlah koin yang benar-benar diberikan (0 kalau sudah pernah).
 */
export async function awardChallengeBonus(
  userId: string,
  challengeId: string,
  karyaId: string
): Promise<number> {
  const amount = COIN_REWARDS.TANTANGAN_MINGGUAN;

  try {
    return await db.$transaction(async (tx) => {
      const already = await tx.coinTransaction.findFirst({
        where: { userId, reason: "TANTANGAN_MINGGUAN", reference: challengeId },
        select: { id: true },
      });
      if (already) return 0;

      await tx.coinTransaction.create({
        data: { userId, amount, reason: "TANTANGAN_MINGGUAN", reference: challengeId },
      });
      await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: amount } },
      });
      return amount;
    });
  } catch {
    // Bonus gagal tidak boleh menggagalkan penyimpanan karyanya.
    return 0;
  }
}

export async function spendCoins(
  userId: string,
  amount: number,
  reason: string,
  reference?: string
) {
  const [result] = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    if (!user || user.coins < amount) throw new Error("Koin tidak mencukupi");

    const coinTx = await tx.coinTransaction.create({
      data: { userId, amount: -amount, reason, reference },
    });
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: amount } },
    });
    return [coinTx];
  });

  return { transaction: result };
}

export async function getBalance(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  return user?.coins || 0;
}

export async function getTransactions(userId: string, limit = 20) {
  return db.coinTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getOrCreateDailyQuests(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const todaysQuests = pickDailyQuests(daySeed)

  await db.dailyQuest.createMany({
    data: todaysQuests.map((q) => ({
      userId,
      date: today,
      questType: q.type,
      target: q.target,
      rewardCoins: q.rewardCoins,
      progress: 0,
      completed: false,
    })),
    skipDuplicates: true,
  });

  return db.dailyQuest.findMany({ where: { userId, date: today } });
}

export async function trackQuestProgress(
  userId: string,
  questType: string,
  increment = 1
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const config = QUEST_POOL.find((q) => q.type === questType);
  if (!config) return null; // unknown quest type — nothing to track

  // Self-heal: create today's quest if it doesn't exist yet, so like/comment/
  // write always count even when the student hasn't opened the Misi Harian page.
  const quest = await db.dailyQuest.upsert({
    where: { userId_date_questType: { userId, date: today, questType } },
    update: {},
    create: {
      userId,
      date: today,
      questType,
      target: config.target,
      rewardCoins: config.rewardCoins,
      progress: 0,
      completed: false,
    },
  });

  if (quest.completed) return quest;

  const newProgress = Math.min(quest.progress + increment, quest.target);
  const justCompleted = newProgress >= quest.target;

  return db.dailyQuest.update({
    where: { id: quest.id },
    data: { progress: newProgress, completed: justCompleted },
  });
}

export async function claimQuestReward(userId: string, questId: string) {
  await db.$transaction(async (tx) => {
    const quest = await tx.dailyQuest.findUnique({ where: { id: questId } });
    if (!quest || !quest.completed || quest.userId !== userId) {
      throw new Error("Quest belum selesai atau tidak valid");
    }

    // A quest may only pay out once.
    //
    // This used to gate on quest.completed and then set completed: true — a
    // value that was already true — so nothing recorded that the reward had
    // been handed over and the same quest could be claimed indefinitely. On
    // 2026-07-21 that produced 69 claims against 6 quests in a single day, one
    // of them claimed 17 times: roughly 430 of the 460 quest coins issued that
    // day were duplicates, and the daily leaderboard was topped by whoever
    // clicked the most rather than whoever did the most.
    //
    // DailyQuest has no "claimed" column and adding one is a schema change, so
    // the payout ledger itself is the record: one CoinTransaction per questId.
    const already = await tx.coinTransaction.findFirst({
      where: { userId, reason: "QUEST_COMPLETE", reference: questId },
      select: { id: true },
    });
    if (already) {
      throw new Error("Hadiah misi ini sudah diambil");
    }

    await tx.coinTransaction.create({
      data: { userId, amount: quest.rewardCoins, reason: "QUEST_COMPLETE", reference: questId },
    });
    await tx.user.update({
      where: { id: userId },
      data: { coins: { increment: quest.rewardCoins } },
    });
  });
}

export async function trackDailyStreak(userId: string) {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { streak: true, lastActiveAt: true, coins: true },
    });
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last = user.lastActiveAt
      ? new Date(user.lastActiveAt.getFullYear(), user.lastActiveAt.getMonth(), user.lastActiveAt.getDate())
      : null;

    if (last && last.getTime() === today.getTime()) return;

    const isConsecutive = last
      ? (today.getTime() - last.getTime()) === 86400000
      : false;

    const newStreak = isConsecutive ? (user.streak || 0) + 1 : 1;

    await tx.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastActiveAt: now, coins: { increment: COIN_REWARDS.DAILY_LOGIN } },
    });

    await tx.coinTransaction.create({
      data: { userId, amount: COIN_REWARDS.DAILY_LOGIN, reason: "DAILY_LOGIN" },
    });
  });
}
