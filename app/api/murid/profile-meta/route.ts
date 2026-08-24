import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getGelarFromLevel } from "@/lib/format";
import { listUserBadges } from "@/lib/gamification/badge-engine";
import { nicknameRateLimitDaysLeft } from "@/lib/nickname";

const KEBUN_DAYS = 91;

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kebunCutoff = new Date();
  kebunCutoff.setDate(kebunCutoff.getDate() - KEBUN_DAYS);

  const [memberRank, karyaCount, totalWordsRow, dailyRows, lencana] = await Promise.all([
    db.user.count({ where: { createdAt: { lte: user.createdAt } } }),
    db.studentKarya.count({ where: { userId: user.id } }),
    db.$queryRaw<{ totalchars: bigint | null }[]>`
      SELECT SUM(LENGTH(content))::bigint as totalchars FROM "StudentKarya" WHERE "userId" = ${user.id}
    `,
    db.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE("createdAt") as day, COUNT(*)::bigint as count
      FROM "StudentKarya"
      WHERE "userId" = ${user.id} AND "createdAt" >= ${kebunCutoff}
      GROUP BY DATE("createdAt")
    `,
    listUserBadges(user.id),
  ]);

  const wordCount = Math.round(Number(totalWordsRow[0]?.totalchars ?? 0) / 6);

  const countByDay = new Map<string, number>();
  for (const row of dailyRows) {
    countByDay.set(new Date(row.day).toISOString().slice(0, 10), Number(row.count));
  }

  const kebunKata: { date: string; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  const today = new Date();
  for (let i = KEBUN_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = countByDay.get(key) || 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    kebunKata.push({ date: key, level });
  }

  return NextResponse.json({
    memberNumber: String(memberRank).padStart(6, "0"),
    gelar: getGelarFromLevel(user.level || 1),
    stats: {
      karyaCount,
      totalLikes: user.totalLikes,
      totalViews: user.totalViews,
      wordCount,
      xp: user.xp || 0,
      coins: user.coins || 0,
    },
    kebunKata,
    // Satu sumber badge untuk /murid/profile DAN /arena/player. Sebelumnya
    // halaman ini memakai lib/lencana.ts (dihitung terpisah) sehingga murid
    // melihat dua koleksi berbeda di dua halaman.
    lencana: lencana.map((b) => ({
      id: b.code,
      icon: b.icon,
      name: b.name,
      unlocked: b.unlocked,
      progress: b.progress,
      target: (b.condition as { target?: number })?.target ?? 1,
      rarityLabel: b.rarity,
    })),
    nickname: {
      value: user.nickname,
      updatedAt: user.nicknameUpdatedAt,
      daysLeftForChange: nicknameRateLimitDaysLeft(user.nicknameUpdatedAt),
    },
  });
}
