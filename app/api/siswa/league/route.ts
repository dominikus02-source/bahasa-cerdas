import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import { levelFromXp, cumulativeXpForLevel } from "@/lib/gamification/levels";
import { rankFromLevel, minLevelForRank, nextRankOf, RANK_META } from "@/lib/gamification/ranks";
import { getDisplayName } from "@/lib/nickname";

/**
 * Papan peringkat sesama rank.
 *
 * Dulu rute ini memakai liga 4 tingkat sendiri (ambang 1.000/3.000/8.000 XP)
 * yang bertabrakan dengan 9 rank resmi — murid bisa "Emas" di sini tapi
 * "Silver" di dasbor Pemain. Sekarang pengelompokannya memakai rank resmi:
 * batas XP-nya diturunkan dari batas level tiap rank, jadi tidak ada ambang
 * kedua yang perlu dijaga selaras.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // v2: bentuk respons berubah (tier → rank resmi). Tanpa versi, entri lama
    // di Redis masih menyajikan label liga usang sampai TTL habis.
    const data = await cache.getOrSet(
      `league:peers:v2:${user.id}`,
      async () => {
        const myXp = user.xp || 0;
        const myLevel = levelFromXp(myXp);
        const rank = rankFromLevel(myLevel);
        const meta = RANK_META[rank];
        const next = nextRankOf(rank);

        // Rentang XP rank ini, diturunkan dari batas levelnya.
        const minXp = cumulativeXpForLevel(minLevelForRank(rank));
        const maxXp = next ? cumulativeXpForLevel(minLevelForRank(next)) : null;

        const peersRaw = await db.user.findMany({
          where: { xp: maxXp === null ? { gte: minXp } : { gte: minXp, lt: maxXp } },
          select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true },
          orderBy: { xp: "desc" },
          take: 30,
        });

        const peers = peersRaw.map((p) => ({
          ...p,
          // Level ikut dihitung dari XP: baris User.level lama masih menyimpan
          // hasil rumus usang sampai backfill dijalankan.
          level: levelFromXp(p.xp || 0),
          displayName: getDisplayName(p, "peer"),
        }));

        const myRank = peers.findIndex((p) => p.id === user.id) + 1;

        return {
          peers,
          myRank,
          myXP: myXp,
          myLevel,
          rank,
          rankLabel: meta?.label ?? rank,
          rankTitle: meta?.title ?? "",
          rankColor: meta?.color ?? "#64748b",
          nextRank: next
            ? {
                rank: next,
                label: RANK_META[next]?.label ?? next,
                title: RANK_META[next]?.title ?? "",
                minXP: cumulativeXpForLevel(minLevelForRank(next)),
              }
            : null,
        };
      },
      120
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching league:", error);
    return NextResponse.json({ error: "Gagal memuat papan peringkat" }, { status: 500 });
  }
}
