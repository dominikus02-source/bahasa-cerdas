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

/** Tipe quest yang dikenal QUEST_POOL — dipakai untuk menjaga konsistensi picker. */
export type QuestType = (typeof QUEST_POOL)[number]["type"];

// One learning quest is guaranteed every day. The quests used to be whatever a
// hash happened to pick, and on 2026-07-22 all three were social — the daily
// missions were pushing students toward like-farming on the very day learning
// finally overtook it. Learning also pays better than any social quest, so the
// missions and the leaderboard point the same way.
const LEARNING_TYPES = ["BACA_MATERI", "MENJAWAB_KUIS"] as const;

/**
 * Preferensi personalisasi misi harian, dihitung dari aktivitas murid 7 hari
 * terakhir (lihat getRecentQuestActivity). Semua field opsional — kalau tidak
 * ada, picker kembali ke pemilihan berbasis seed seperti dulu.
 */
type QuestPrefs = {
  wantsWriting?: boolean;
  wantsQuiz?: boolean;
  wantsReading?: boolean;
};

function pickDailyQuests(seed: number, prefs?: QuestPrefs) {
  const learning = QUEST_POOL.filter(q => (LEARNING_TYPES as readonly string[]).includes(q.type));
  const social = QUEST_POOL.filter(q => !(LEARNING_TYPES as readonly string[]).includes(q.type));

  // Satu quest belajar dijamin setiap hari. Personalisasi belajar lebih penting
  // daripada sosial: murid yang belum membaca mendapat BACA_MATERI, yang belum
  // menjawab kuis mendapat MENJAWAB_KUIS, sisanya dikocok dengan seed.
  let learningPick = learning[seed % learning.length];
  if (prefs?.wantsReading) {
    learningPick = learning.find(q => q.type === "BACA_MATERI") ?? learningPick;
  } else if (prefs?.wantsQuiz) {
    learningPick = learning.find(q => q.type === "MENJAWAB_KUIS") ?? learningPick;
  }

  const toQuest = (q: (typeof QUEST_POOL)[number]) => ({ type: q.type, target: q.target, rewardCoins: q.rewardCoins });
  const picks = [toQuest(learningPick)];
  const pickedTypes = new Set<QuestType>([learningPick.type]);
  const remainingSocial = [...social];

  // Murid yang belum menulis karya minggu ini dipaksa dapat MENULIS sebagai
  // salah satu slot sosial — sisanya tetap diisi dari pool sosial dengan seed.
  if (prefs?.wantsWriting) {
    const writingIdx = remainingSocial.findIndex(q => q.type === "MENULIS");
    if (writingIdx !== -1) {
      picks.push(toQuest(remainingSocial[writingIdx]));
      pickedTypes.add(remainingSocial[writingIdx].type);
      remainingSocial.splice(writingIdx, 1);
    }
  }

  // Isi sisa slot sosial dengan seed, selalu menghindari duplikat tipe.
  let offset = 1;
  while (picks.length < 3) {
    const available = remainingSocial.filter(q => !pickedTypes.has(q.type));
    if (available.length === 0) break;
    const next = available[(seed + offset) % available.length];
    picks.push(toQuest(next));
    pickedTypes.add(next.type);
    offset += 1;
  }

  return picks;
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

/**
 * Aktivitas terakhir murid dari tabel PlayerActivity, dipakai untuk
 * mempersonalisasi misi harian.
 *
 * Mengembalikan kumpulan tipe aktivitas yang muncul dalam jendela `days`
 * hari terakhir, berapa hari lalu terakhir kali menulis karya (null kalau
 * tidak ada sama sekali dalam jendela), dan apakah sudah menulis karya
 * minggu ini. "Minggu ini" diukur sebagai jendela 7 hari, bukan awal pekan.
 */
export async function getRecentQuestActivity(
  userId: string,
  days = 7
): Promise<{ activityTypes: Set<string>; lastKaryaDaysAgo: number | null; wroteKaryaThisWeek: boolean }> {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db.playerActivity.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { type: true, createdAt: true },
  });

  const activityTypes = new Set<string>();
  let lastKaryaDaysAgo: number | null = null;
  let wroteKaryaThisWeek = false;

  for (const row of rows) {
    activityTypes.add(row.type);
    if (row.type === "KARYA") {
      wroteKaryaThisWeek = true;
      const daysAgo = Math.floor((Date.now() - row.createdAt.getTime()) / 86400000);
      if (lastKaryaDaysAgo === null || daysAgo < lastKaryaDaysAgo) {
        lastKaryaDaysAgo = daysAgo;
      }
    }
  }

  return { activityTypes, lastKaryaDaysAgo, wroteKaryaThisWeek };
}

export async function getOrCreateDailyQuests(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()

  // Misi harian dipersonalisasi dari aktivitas 7 hari terakhir: murid yang
  // belum membaca materi / jalur cerdas dapat quest membaca, yang belum
  // menjawab kuis dapat quest kuis, dan yang belum menulis karya minggu ini
  // tetap didorong menulis lewat slot sosial. Prioritas: dorongan membaca
  // menang lebih dulu, dorongan menulis hanya memengaruhi slot sosial.
  const recent = await getRecentQuestActivity(userId);
  const prefs = {
    wantsReading: !recent.activityTypes.has("BACA_MATERI") && !recent.activityTypes.has("JALUR_CERDAS"),
    wantsQuiz: !recent.activityTypes.has("QUIZ") && !recent.activityTypes.has("MENJAWAB_KUIS"),
    wantsWriting: !recent.wroteKaryaThisWeek && !recent.activityTypes.has("KARYA"),
  };

  const todaysQuests = pickDailyQuests(daySeed, prefs)

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

/**
 * Misi mana saja yang hadiahnya sudah benar-benar cair.
 *
 * DailyQuest.completed hanya menyatakan targetnya tercapai, bukan hadiahnya
 * sudah diambil — jadi halaman misi tidak punya cara tahu mana yang sudah
 * diklaim, dan tombol "Klaim" muncul lagi setiap halaman dimuat ulang.
 * Ledger CoinTransaction adalah satu-satunya catatan pembayaran (lihat
 * claimQuestReward), jadi dari situ pula status klaimnya dibaca.
 */
export async function getClaimedQuestIds(userId: string, questIds: string[]): Promise<Set<string>> {
  if (questIds.length === 0) return new Set();
  const rows = await db.coinTransaction.findMany({
    where: { userId, reason: "QUEST_COMPLETE", reference: { in: questIds } },
    select: { reference: true },
  });
  return new Set(rows.map((r) => r.reference).filter((r): r is string => !!r));
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

    // Streak Freeze — dijual di toko koin seharga 50 koin sejak lama, tapi
    // sampai sekarang tidak ada satu pun kode yang memakainya: streak murid
    // tetap putus walau sudah beli. Di sinilah item itu akhirnya dipakai.
    // Satu freeze menutup satu hari bolong; kalau bolongnya lebih banyak
    // daripada freeze yang dimiliki, streak tetap direset.
    let streakFrozen = false;
    if (last && !isConsecutive) {
      const daysMissed = Math.round((today.getTime() - last.getTime()) / 86400000) - 1;

      if (daysMissed > 0) {
        const freeze = await tx.userItem.findFirst({
          where: { userId, item: { type: "STREAK_FREEZE" }, quantity: { gt: 0 } },
          select: { id: true, quantity: true },
        });

        if (freeze && freeze.quantity >= daysMissed) {
          const sisa = freeze.quantity - daysMissed;
          if (sisa > 0) {
            await tx.userItem.update({ where: { id: freeze.id }, data: { quantity: sisa } });
          } else {
            await tx.userItem.delete({ where: { id: freeze.id } });
          }
          streakFrozen = true;
        }
      }
    }

    const newStreak = isConsecutive || streakFrozen ? (user.streak || 0) + 1 : 1;

    await tx.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastActiveAt: now, coins: { increment: COIN_REWARDS.DAILY_LOGIN } },
    });

    await tx.coinTransaction.create({
      data: { userId, amount: COIN_REWARDS.DAILY_LOGIN, reason: "DAILY_LOGIN" },
    });
  });
}
