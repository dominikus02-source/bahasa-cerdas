import { db } from "@/lib/db";

// Lencana (achievement badges) — computed on the fly from existing stats
// rather than a stored Badge model. Nothing here needs a schema migration:
// every input already lives on User/StudentKarya, so "unlocked" is just a
// pure function of data that's already true, not a separate ledger to keep
// in sync.

export interface Lencana {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
  progress: number; // current value toward target
  target: number;
  rarityLabel: string; // shown on unlocked badges, e.g. "24% murid"
}

interface LencanaStats {
  xp: number;
  streak: number;
  karyaCount: number;
  featuredCount: number;
  wordCount: number;
  editedCount: number;
}

async function getStats(userId: string): Promise<LencanaStats> {
  const [user, karyaCount, featuredCount, editedCount, wordRow] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { xp: true, streak: true } }),
    db.studentKarya.count({ where: { userId } }),
    db.studentKarya.count({ where: { userId, isFeatured: true } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM "StudentKarya"
      WHERE "userId" = ${userId} AND "updatedAt" > "createdAt" + INTERVAL '1 minute'
    `,
    db.$queryRaw<{ totalchars: bigint | null }[]>`
      SELECT SUM(LENGTH(content))::bigint as totalchars FROM "StudentKarya" WHERE "userId" = ${userId}
    `,
  ]);

  const totalChars = Number(wordRow[0]?.totalchars ?? 0);
  return {
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
    karyaCount,
    featuredCount,
    editedCount: Number(editedCount[0]?.count ?? 0),
    wordCount: Math.round(totalChars / 6), // ~6 chars per Indonesian word incl. space
  };
}

export async function computeLencana(userId: string): Promise<Lencana[]> {
  const s = await getStats(userId);

  const badges: Lencana[] = [
    {
      id: "langkah-pertama",
      icon: "🌱",
      name: "Langkah Pertama",
      unlocked: s.xp > 0,
      progress: Math.min(s.xp, 1),
      target: 1,
      rarityLabel: "78% murid",
    },
    {
      id: "karya-pertama",
      icon: "✍️",
      name: "Karya Pertama",
      unlocked: s.karyaCount >= 1,
      progress: Math.min(s.karyaCount, 1),
      target: 1,
      rarityLabel: "61% murid",
    },
    {
      id: "tujuh-hari",
      icon: "🔥",
      name: "Tujuh Hari",
      unlocked: s.streak >= 7,
      progress: Math.min(s.streak, 7),
      target: 7,
      rarityLabel: "24% murid",
    },
    {
      id: "seribu-kata",
      icon: "📜",
      name: "Seribu Kata",
      unlocked: s.wordCount >= 1000,
      progress: Math.min(s.wordCount, 1000),
      target: 1000,
      rarityLabel: "19% murid",
    },
    {
      id: "sebulan-penuh",
      icon: "🗓️",
      name: "Sebulan Penuh",
      unlocked: s.streak >= 30,
      progress: Math.min(s.streak, 30),
      target: 30,
      rarityLabel: "12% murid",
    },
    {
      id: "tukang-sunting",
      icon: "✂️",
      name: "Tukang Sunting",
      unlocked: s.editedCount >= 3,
      progress: Math.min(s.editedCount, 3),
      target: 3,
      rarityLabel: "9% murid",
    },
    {
      id: "sorotan-guru",
      icon: "⭐",
      name: "Sorotan Guru",
      unlocked: s.featuredCount >= 1,
      progress: Math.min(s.featuredCount, 1),
      target: 1,
      rarityLabel: "2% murid",
    },
    {
      id: "sepuluh-ribu",
      icon: "📚",
      name: "Sepuluh Ribu",
      unlocked: s.wordCount >= 10000,
      progress: Math.min(s.wordCount, 10000),
      target: 10000,
      rarityLabel: "1% murid",
    },
  ];

  return badges;
}
