import { db } from "./db";

const COIN_REWARDS = {
  MENULIS_KARYA: 10,
  MENDAPAT_LIKE: 2,
  MEMBERI_KOMENTAR: 1,
  DAILY_LOGIN: 5,
  QUEST_COMPLETE: 0,
  STREAK_7: 30,
  STREAK_30: 150,
  STREAK_100: 1000,
} as const;

const QUEST_TYPES = [
  { type: "MENULIS", target: 1, rewardCoins: 10 },
  { type: "MENGOMENTARI", target: 3, rewardCoins: 5 },
  { type: "MEMBERI_LIKE", target: 5, rewardCoins: 5 },
] as const;

export async function awardCoins(
  userId: string,
  reason: keyof typeof COIN_REWARDS,
  reference?: string
) {
  const amount = COIN_REWARDS[reason];
  if (!amount) return { coins: 0 };

  const [tx] = await Promise.all([
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

export async function spendCoins(
  userId: string,
  amount: number,
  reason: string,
  reference?: string
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  if (!user || user.coins < amount) {
    throw new Error("Koin tidak mencukupi");
  }

  const [tx] = await Promise.all([
    db.coinTransaction.create({
      data: { userId, amount: -amount, reason, reference },
    }),
    db.user.update({
      where: { id: userId },
      data: { coins: { decrement: amount } },
    }),
  ]);

  return { transaction: tx };
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

  const existing = await db.dailyQuest.findMany({
    where: { userId, date: today },
  });

  if (existing.length > 0) return existing;

  const quests = QUEST_TYPES.map(q => ({
    userId,
    date: today,
    questType: q.type,
    target: q.target,
    rewardCoins: q.rewardCoins,
    progress: 0,
    completed: false,
  }));

  await db.dailyQuest.createMany({ data: quests });
  return db.dailyQuest.findMany({ where: { userId, date: today } });
}

export async function trackQuestProgress(
  userId: string,
  questType: string,
  increment = 1
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const quest = await db.dailyQuest.findUnique({
    where: { userId_date_questType: { userId, date: today, questType } },
  });

  if (!quest || quest.completed) return null;

  const newProgress = Math.min(quest.progress + increment, quest.target);
  const justCompleted = newProgress >= quest.target && !quest.completed;

  const updated = await db.dailyQuest.update({
    where: { id: quest.id },
    data: {
      progress: newProgress,
      completed: justCompleted,
    },
  });

  return updated;
}

export async function claimQuestReward(userId: string, questId: string) {
  const quest = await db.dailyQuest.findUnique({ where: { id: questId } });
  if (!quest || !quest.completed || quest.userId !== userId) {
    throw new Error("Quest belum selesai atau tidak valid");
  }

  await awardCoins(userId, "QUEST_COMPLETE", questId);
  await db.dailyQuest.update({
    where: { id: questId },
    data: { completed: true },
  });
}

export async function trackDailyStreak(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastActiveAt: true },
  });
  if (!user) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = user.lastActiveAt
    ? new Date(user.lastActiveAt.getFullYear(), user.lastActiveAt.getMonth(), user.lastActiveAt.getDate())
    : null;

  if (last && last.getTime() === today.getTime()) {
    return;
  }

  const isConsecutive = last
    ? (today.getTime() - last.getTime()) === 86400000
    : false;

  const newStreak = isConsecutive ? (user.streak || 0) + 1 : 1;

  await db.user.update({
    where: { id: userId },
    data: {
      streak: newStreak,
      lastActiveAt: now,
      coins: { increment: COIN_REWARDS.DAILY_LOGIN },
    },
  });

  await db.coinTransaction.create({
    data: {
      userId,
      amount: COIN_REWARDS.DAILY_LOGIN,
      reason: "DAILY_LOGIN",
    },
  });

  if (newStreak === 7) {
    await awardCoins(userId, "STREAK_7");
  } else if (newStreak === 30) {
    await awardCoins(userId, "STREAK_30");
  } else if (newStreak === 100) {
    await awardCoins(userId, "STREAK_100");
  }
}
