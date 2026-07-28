import { getUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { awardXp } from '@/lib/award-xp';
import { rateLimitRoute } from '@/lib/rate-limit';

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
    const baseXp = Math.floor(skor / 10)

    // Lewat pintu tunggal: batas per submit, kuota harian, boost, jejak ledger,
    // dan pembaruan xp/level/liga sekaligus.
    const hasil = await awardXp(user.id, 'GAME', baseXp, session.id)
    const earned = hasil.xpDiberikan
    const boosted = hasil.boosted

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

    // xp/level/liga sudah disimpan awardXp() dalam satu transaksi — tidak perlu
    // increment lalu baca-ulang lalu update lagi seperti sebelumnya.
    return NextResponse.json({
      result,
      xpEarned: earned,
      baseXp,
      boosted,
      kuotaHarianHabis: hasil.kuotaHabis,
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving game result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}