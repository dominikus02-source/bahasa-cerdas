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
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";
import { harvestJalurQuestions, pickRampedQuestions } from "@/lib/game/harvest";
import { applyXpBoost } from "@/lib/xp-boost";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = Math.min(Math.max(Number(new URL(req.url).searchParams.get("count")) || 12, 5), 20);

  // Panen semua unit + bank kurasi (dedupe + quality gate), lalu stratified
  // pick dengan ramp kesulitan: lantai awal mudah, makin tinggi makin sulit.
  const clean = await harvestJalurQuestions();
  const questions = pickRampedQuestions(clean, count).map(({ lvl: _lvl, ...q }) => q);
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const total = Math.min(Math.max(Number(body.total) || 0, 0), 20);
  const correct = Math.min(Math.max(Number(body.correct) || 0, 0), total);

  // Server-capped reward — prevents inflated client claims / XP farming.
  const baseXp = correct * 5; // max 100 XP per run

  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // XP Boost toko koin dikalikan sebelum level & liga dihitung.
  const { xp: xpEarned, boosted } = await applyXpBoost(user.id, baseXp);
  const newXp = dbUser.xp + xpEarned;
  const newLevel = calcLevel(newXp);
  const newLeague = calcLeagueFromXP(newXp);

  await db.user.update({
    where: { id: user.id },
    data: { xp: newXp, level: newLevel, league: newLeague, lastActiveAt: new Date() },
  });

  return NextResponse.json({
    xpEarned,
    baseXp,
    boosted,
    newXp,
    newLevel,
    leveledUp: newLevel > dbUser.level,
  });
}
