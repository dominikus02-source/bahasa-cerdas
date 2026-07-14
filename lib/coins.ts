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

const QUEST_POOL = [
  { type: "MENULIS", target: 1, rewardCoins: 10 },
  { type: "MENGOMENTARI", target: 3, rewardCoins: 5 },
  { type: "MEMBERI_LIKE", target: 5, rewardCoins: 5 },
  { type: "MENJAWAB_KUIS", target: 5, rewardCoins: 8 },
  { type: "MAIN_GAME", target: 2, rewardCoins: 10 },
  { type: "STREAK_LOGIN", target: 1, rewardCoins: 5 },
  { type: "BACA_MATERI", target: 2, rewardCoins: 8 },
] as const;

function pickDailyQuests(seed: number) {
  const shuffled = [...QUEST_POOL].sort((a, b) => {
    const ha = (a.type.charCodeAt(0) + seed) % 7
    const hb = (b.type.charCodeAt(0) + seed + 3) % 7
    return ha - hb
  })
  return shuffled.slice(0, 3).map(q => ({
    type: q.type,
    target: q.target,
    rewardCoins: q.rewardCoins,
  }))
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

    await tx.coinTransaction.create({
      data: { userId, amount: quest.rewardCoins, reason: "QUEST_COMPLETE", reference: questId },
    });
    await tx.user.update({
      where: { id: userId },
      data: { coins: { increment: quest.rewardCoins } },
    });
    await tx.dailyQuest.update({
      where: { id: questId },
      data: { completed: true },
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
