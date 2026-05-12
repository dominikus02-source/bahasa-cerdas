import { getUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const results = await db.gameResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const totalGames = await db.gameResult.count({
      where: { userId: user.id },
    });

    const topScore = await db.gameResult.findFirst({
      where: { userId: user.id },
      orderBy: { finalScore: 'desc' },
    });

    return NextResponse.json({
      results,
      stats: {
        totalGames,
        topScore: topScore?.finalScore || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}