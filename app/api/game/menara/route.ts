/**
 * Menara Cerdas — solo game that pulls REAL questions from the Jalur Cerdas
 * lessons (LearningUnit.content), so students practice the same material they
 * learn. Client-graded arcade (answers sent to client), same pattern as
 * /api/katastra/questions.
 *
 * GET  -> { questions: [{ id, soal, opsi[], jawaban(index), penjelasan }] }
 * POST -> award capped XP + coins for a finished run: body { correct, total }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { harvestJalurQuestions, pickRampedQuestions } from "@/lib/game/harvest";
import { shuffleOptions } from "@/lib/game/shuffle-options";
import { awardXp } from "@/lib/award-xp";
import { calculateGameReward } from "@/lib/game/tts/economy";
import { rateLimitRoute } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = Math.min(Math.max(Number(new URL(req.url).searchParams.get("count")) || 12, 5), 20);

  // Panen semua unit + bank kurasi (dedupe + quality gate), lalu stratified
  // pick dengan ramp kesulitan: lantai awal mudah, makin tinggi makin sulit.
  const clean = await harvestJalurQuestions();
  const questions = pickRampedQuestions(clean, count).map(({ lvl: _lvl, opsi, jawaban, ...q }) => ({
    ...q,
    ...shuffleOptions(opsi, jawaban),
  }));
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Nilai per ronde sudah dijepit di bawah, tapi tanpa jeda sebuah skrip masih
  // bisa mengulang ronde ratusan kali per menit.
  const limited = await rateLimitRoute(req, {
    maxRequests: 20,
    windowSeconds: 60,
    identifier: "game-menara",
  });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const total = Math.min(Math.max(Number(body.total) || 0, 0), 20);
  const correct = Math.min(Math.max(Number(body.correct) || 0, 0), total);

  // Server-capped reward — prevents inflated client claims / XP farming.
  const accuracyPct = total > 0 ? (correct / total) * 100 : 0;
  const reward = calculateGameReward({
    baseXp: correct * 5,
    baseCoins: 5,
    accuracyPct,
    difficultyMultiplier: 1,
  });

  // Lewat pintu tunggal: batas per submit, kuota harian, boost, jejak ledger,
  // dan pembaruan xp/level/liga sekaligus.
  const reference = `menara-${crypto.randomUUID()}`;
  const hasil = await awardXp(user.id, "MENARA", reward.xp, reference);

  if (reward.coins > 0 && hasil.xpDiberikan > 0) {
    try {
      await db.$transaction([
        db.coinTransaction.create({
          data: { userId: user.id, amount: reward.coins, reason: "MAIN_GAME", reference: `game-${reference}` },
        }),
        db.user.update({ where: { id: user.id }, data: { coins: { increment: reward.coins } } }),
      ]);
    } catch (error) {
      console.error("Menara coin reward error:", error);
    }
  }
  const xpEarned = hasil.xpDiberikan;
  const boosted = hasil.boosted;
  const newXp = hasil.totalXp;
  const newLevel = hasil.levelBaru;

  return NextResponse.json({
    xpEarned,
    baseXp: reward.xp,
    boosted,
    newXp,
    newLevel,
    kuotaHarianHabis: hasil.kuotaHabis,
    coinsEarned: reward.coins,
    leveledUp: hasil.naikLevel,
  });
}
