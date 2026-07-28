import { getUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { calcLevel, calcLeagueFromXP } from '@/lib/xp';
import { applyXpBoost } from '@/lib/xp-boost';
import { rateLimitRoute } from '@/lib/rate-limit';
import { batasiXpSubmit } from '@/lib/xp-guard';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limited = await rateLimitRoute(request, {
      maxRequests: 20,
      windowSeconds: 60,
      identifier: 'game-result',
    });
    if (limited) return limited;

    const { roomId, score, correct, wrong, maxStreak, avgTime } = await request.json();

    const session = await db.gameSession.findFirst({
      where: { roomId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Satu sesi hanya boleh menghasilkan satu GameResult. Tanpa ini, memanggil
    // ulang endpoint dengan roomId yang sama memberi XP berkali-kali dari satu
    // permainan.
    const sudahAda = await db.gameResult.findUnique({
      where: { sessionId: session.id },
      select: { id: true },
    });
    if (sudahAda) {
      return NextResponse.json({ error: 'Hasil permainan ini sudah tercatat' }, { status: 409 });
    }

    // XP dihitung server dari skor, lalu dipangkas ke batas per submit.
    // Sebelumnya `xpEarned || ...` memakai angka kiriman klien apa adanya —
    // lubang yang sama dengan /api/game/xp yang dipakai memanen XP autoclicker.
    const skor = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
    const baseXp = batasiXpSubmit('GAME', Math.floor(skor / 10))
    const { xp: earned, boosted } = await applyXpBoost(user.id, baseXp)

    const result = await db.gameResult.create({
      data: {
        roomId,
        userId: user.id,
        sessionId: session.id,
        finalScore: skor,
        correct,
        wrong,
        maxStreak,
        avgTime,
        xpEarned: earned,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { xp: { increment: earned } },
    });
    const updatedUser = await db.user.findUnique({ where: { id: user.id }, select: { xp: true } })
    const finalXp = updatedUser?.xp ?? (user.xp || 0) + earned
    await db.user.update({
      where: { id: user.id },
      data: {
        level: calcLevel(finalXp),
        league: calcLeagueFromXP(finalXp),
      },
    });

    return NextResponse.json({ result, xpEarned: earned, baseXp, boosted }, { status: 201 });
  } catch (error) {
    console.error('Error saving game result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}