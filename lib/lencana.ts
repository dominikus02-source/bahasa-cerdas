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

// Ikon lencana pakai artwork asli di /public/badges (1.png..20.png), bukan
// emoji — emoji-as-icon dihindari di seluruh aplikasi ini (lihat komentar
// serupa di app/(dashboard)/profile/[id]/page.tsx). 20 definisi memakai
// ke-20 gambar tanpa duplikat, disusun makin "megah" (medali kecil → medali
// sunburst → piala) seiring target makin tinggi per kategori.
const DEFS: { id: string; icon: string; name: string; check: (s: LencanaStats) => { progress: number; target: number } }[] = [
  // Karya (jumlah tulisan)
  { id: "penulis-perdana", icon: "/badges/19.png", name: "Penulis Perdana", check: (s) => ({ progress: s.karyaCount, target: 1 }) },
  { id: "penulis-aktif", icon: "/badges/3.png", name: "Penulis Aktif", check: (s) => ({ progress: s.karyaCount, target: 5 }) },
  { id: "rajin-menulis", icon: "/badges/7.png", name: "Rajin Menulis", check: (s) => ({ progress: s.karyaCount, target: 10 }) },
  { id: "karya-50", icon: "/badges/4.png", name: "Kolektor Kata", check: (s) => ({ progress: s.karyaCount, target: 50 }) },
  { id: "karya-100", icon: "/badges/14.png", name: "Pustakawan Cilik", check: (s) => ({ progress: s.karyaCount, target: 100 }) },

  // Karya pilihan (ditandai guru / auto-terpopuler)
  { id: "featured-1", icon: "/badges/9.png", name: "Layak Pilih", check: (s) => ({ progress: s.featuredCount, target: 1 }) },
  { id: "featured-10", icon: "/badges/12.png", name: "Suka Dipilih", check: (s) => ({ progress: s.featuredCount, target: 10 }) },
  { id: "featured-50", icon: "/badges/2.png", name: "Bintang Sekolah", check: (s) => ({ progress: s.featuredCount, target: 50 }) },

  // Spesial
  { id: "pantun-pertama", icon: "/badges/17.png", name: "Penyair Cilik", check: (_s) => ({ progress: 0, target: 1 }) },

  // Jumlah kata ditulis
  { id: "kata-1000", icon: "/badges/13.png", name: "Perangkai Kata", check: (s) => ({ progress: s.wordCount, target: 1000 }) },
  { id: "kata-10000", icon: "/badges/11.png", name: "Pujangga Muda", check: (s) => ({ progress: s.wordCount, target: 10000 }) },
  { id: "kata-50000", icon: "/badges/18.png", name: "Maestro Kata", check: (s) => ({ progress: s.wordCount, target: 50000 }) },
  { id: "kata-100000", icon: "/badges/10.png", name: "Legenda Kata", check: (s) => ({ progress: s.wordCount, target: 100000 }) },

  // Streak harian
  { id: "streak-3", icon: "/badges/1.png", name: "Mulai Panas", check: (s) => ({ progress: s.streak, target: 3 }) },
  { id: "streak-7", icon: "/badges/15.png", name: "Semangat 7 Hari", check: (s) => ({ progress: s.streak, target: 7 }) },
  { id: "streak-30", icon: "/badges/8.png", name: "Konsisten Sebulan", check: (s) => ({ progress: s.streak, target: 30 }) },
  { id: "streak-100", icon: "/badges/6.png", name: "Legenda Konsisten", check: (s) => ({ progress: s.streak, target: 100 }) },

  // XP
  { id: "xp-5000", icon: "/badges/5.png", name: "Pengumpul XP", check: (s) => ({ progress: s.xp, target: 5000 }) },
  { id: "xp-25000", icon: "/badges/16.png", name: "Ksatria XP", check: (s) => ({ progress: s.xp, target: 25000 }) },
  { id: "xp-100000", icon: "/badges/20.png", name: "Grandmaster XP", check: (s) => ({ progress: s.xp, target: 100000 }) },
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
