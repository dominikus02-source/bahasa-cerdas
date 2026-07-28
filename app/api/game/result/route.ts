import { getUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { calcLevel, calcLeagueFromXP } from '@/lib/xp';
import { applyXpBoost } from '@/lib/xp-boost';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId, score, correct, wrong, maxStreak, avgTime, xpEarned } = await request.json();

    const session = await db.gameSession.findFirst({
      where: { roomId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // XP Boost toko koin dihitung sekali di depan, lalu dipakai baik untuk baris
    // GameResult maupun User.xp — kalau berbeda, riwayat game akan bertentangan
    // dengan XP yang benar-benar diterima murid.
    const baseXp = xpEarned || Math.floor(score / 10)
    const { xp: earned, boosted } = await applyXpBoost(user.id, baseXp)

    const result = await db.gameResult.create({
      data: {
        roomId,
        userId: user.id,
        sessionId: session.id,
        finalScore: score,
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