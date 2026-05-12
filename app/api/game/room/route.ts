import { getUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code, name, gameType, category, difficulty, questionCount, timePerQuestion } = await request.json();

    const room = await db.gameRoom.create({
      data: {
        code,
        name,
        gameType: gameType as any,
        hostId: user.id,
        category,
        difficulty: difficulty as any,
        questionCount: questionCount || 10,
        timePerQuestion: timePerQuestion || 20,
        status: 'WAITING' as any,
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Error creating game room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}