import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { xpNeededForNextLevel } from "@/lib/gamification/xp-engine";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { awardXp } from "@/lib/award-xp";
import { calculateGameReward } from "@/lib/game/tts/economy";

export async function POST(req: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Jeda antar-submit — satu ronde KataStra berdurasi puluhan detik.
    const limited = await rateLimitRoute(req, {
      maxRequests: 20,
      windowSeconds: 60,
      identifier: "katastra-submit",
    });
    if (limited) return limited;

    const { score, correct, wrong, maxStreak, gameSessionId } = await req.json();
    if (score == null) return NextResponse.json({ error: "Score required" }, { status: 400 });

    // `correct`, `wrong`, dan `maxStreak` semuanya berasal dari klien, jadi
    // rumus di bawah bisa menghasilkan angka apa pun kalau nilainya dikarang
    // (mis. correct: 100000 -> 1,5 juta XP). Dinormalkan dulu ke rentang yang
    // masuk akal untuk satu ronde, lalu hasil akhirnya dipangkas lagi ke
    // BATAS_XP_PER_SUBMIT.KATASTRA.
    const benar = Math.max(0, Math.min(Math.floor(Number(correct) || 0), 50));
    const salah = Math.max(0, Math.min(Math.floor(Number(wrong) || 0), 50));
    const streakMaks = Math.max(0, Math.min(Math.floor(Number(maxStreak) || 0), 50));
    const answered = benar + salah;
    if (answered > 50) {
      return NextResponse.json({ error: "Invalid round totals" }, { status: 400 });
    }

    const normalizedScore = Math.max(0, Math.min(Math.floor(Number(score) || 0), 10000));
    const baseXp = Math.max(0, benar * 15 + Math.min(streakMaks, 10) * 5 + (normalizedScore >= 100 ? 10 : 0));
    const accuracyPct = answered > 0 ? (benar / answered) * 100 : 0;
    const reward = calculateGameReward({
      baseXp,
      baseCoins: 5,
      accuracyPct,
      difficultyMultiplier: 1,
    });
    const rawXp = reward.xp;

    // Lewat pintu tunggal: batas per submit, kuota harian dari XpLedger, boost,
    // pencatatan jejak, dan pembaruan xp/level/liga sekaligus.
    // Reference UNIK per ronde — dulu reference = mode ("sd"/"smp"/...), jadi
    // XP KATASTRA hanya cair sekali per mode selamanya. UUID per submit menjaga
    // idempotensi retry tanpa menelan XP ronde-ronde berikutnya.
    const hasil = await awardXp(
      dbUser.id,
      "KATASTRA",
      rawXp,
      `katastra-${String(gameSessionId ?? "").trim() || crypto.randomUUID()}`
    );
    const totalXp = hasil.xpDiberikan;
    const boosted = hasil.boosted;

    if (reward.coins > 0 && totalXp > 0) {
      try {
        await db.$transaction([
          db.coinTransaction.create({
            data: { userId: dbUser.id, amount: reward.coins, reason: "MAIN_GAME", reference: `game-katastra-${crypto.randomUUID()}` },
          }),
          db.user.update({ where: { id: dbUser.id }, data: { coins: { increment: reward.coins } } }),
        ]);
      } catch (error) {
        console.error("KataStra coin reward error:", error);
      }
    }

    const now = new Date();
    const lastActive = dbUser.lastActiveAt;
    let newStreak = dbUser.streak;

    if (lastActive) {
      const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        // already played today, keep streak
      } else if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // xp/level/liga sudah disimpan awardXp(); di sini tinggal streak harian.
    const oldLevel = hasil.levelLama;
    const newXp = hasil.totalXp;
    const newLevel = hasil.levelBaru;
    const levelUp = hasil.naikLevel;
    const newRank = hasil.rank;

    await db.user.update({
      where: { id: dbUser.id },
      data: { streak: newStreak, lastActiveAt: now },
    });

    return NextResponse.json({
      xpEarned: totalXp,
      baseXp: rawXp,
      boosted,
      kuotaHarianHabis: hasil.kuotaHabis,
      totalXp: newXp,
      oldLevel,
      newLevel,
      levelUp,
      streak: newStreak,
      rank: newRank,
      xpForNextLevel: xpNeededForNextLevel(newLevel),
      currentXp: newXp,
    });
  } catch (error) {
    console.error("KataStra submit error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
