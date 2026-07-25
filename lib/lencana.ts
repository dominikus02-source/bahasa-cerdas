import { db } from "@/lib/db";

export interface Lencana {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
  progress: number;
  target: number;
  rarityLabel: string;
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
    db.studentKarya.count({ where: { userId, updatedAt: { not: undefined } } }),
    db.$queryRaw<{ totalchars: bigint | null }[]>`
      SELECT SUM(LENGTH(content))::bigint as totalchars FROM "StudentKarya" WHERE "userId" = ${userId}
    `,
  ]);

  return {
    xp: user?.xp || 0,
    streak: user?.streak || 0,
    karyaCount,
    featuredCount,
    wordCount: Math.round(Number(wordRow[0]?.totalchars ?? 0) / 6),
    editedCount,
  };
}

const DEFS: { id: string; icon: string; name: string; check: (s: LencanaStats) => { progress: number; target: number } }[] = [
  { id: "penulis-perdana", icon: "✍️", name: "Penulis Perdana", check: (s) => ({ progress: s.karyaCount, target: 1 }) },
  { id: "rajin-menulis", icon: "📝", name: "Rajin Menulis", check: (s) => ({ progress: s.karyaCount, target: 10 }) },
  { id: "karya-50", icon: "📚", name: "Kolektor Kata", check: (s) => ({ progress: s.karyaCount, target: 50 }) },
  { id: "karya-100", icon: "🏛️", name: "Pustakawan Cilik", check: (s) => ({ progress: s.karyaCount, target: 100 }) },
  { id: "featured-1", icon: "⭐", name: "Layak Pilih", check: (s) => ({ progress: s.featuredCount, target: 1 }) },
  { id: "featured-10", icon: "🌟", name: "Suka Dipilih", check: (s) => ({ progress: s.featuredCount, target: 10 }) },
  { id: "pantun-pertama", icon: "🎭", name: "Penyair Cilik", check: (_s) => ({ progress: 0, target: 1 }) },
  { id: "kata-1000", icon: "📖", name: "Perangkai Kata", check: (s) => ({ progress: s.wordCount, target: 1000 }) },
  { id: "kata-10000", icon: "📕", name: "Pujangga Muda", check: (s) => ({ progress: s.wordCount, target: 10000 }) },
  { id: "kata-50000", icon: "📗", name: "Maestro Kata", check: (s) => ({ progress: s.wordCount, target: 50000 }) },
  { id: "streak-7", icon: "🔥", name: "Semangat 7 Hari", check: (s) => ({ progress: s.streak, target: 7 }) },
  { id: "streak-30", icon: "🔥", name: "Konsisten Sebulan", check: (s) => ({ progress: s.streak, target: 30 }) },
  { id: "xp-5000", icon: "⚡", name: "Pengumpul XP", check: (s) => ({ progress: s.xp, target: 5000 }) },
  { id: "xp-25000", icon: "💎", name: "Ksatria XP", check: (s) => ({ progress: s.xp, target: 25000 }) },
];

export async function computeLencana(userId: string): Promise<Lencana[]> {
  const stats = await getStats(userId);

  const totalUsers = await db.user.count({ where: { role: "MURID" } });

  return DEFS.map((def) => {
    const { progress, target } = def.check(stats);
    const unlocked = progress >= target;
    return {
      id: def.id,
      icon: def.icon,
      name: def.name,
      unlocked,
      progress: Math.min(progress, target),
      target,
      rarityLabel: "Lencana",
    };
  });
}
