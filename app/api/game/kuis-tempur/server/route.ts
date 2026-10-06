import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ArenaResult = {
  playerId: string;
  playerName: string;
  avatarUrl?: string | null;
  characterId?: string | null;
  rank: number;
  score: number;
  kills: number;
  deaths: number;
  correct: number;
  wrong: number;
  maxStreak: number;
  xpEarned: number;
};

function verifyRequest(rawBody: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.KUIS_TEMPUR_SERVER_SECRET;
  if (!secret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 60_000) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyRequest(rawBody, req.headers.get("x-game-timestamp"), req.headers.get("x-game-signature"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body?.action === "questions") {
    const count = Math.max(1, Math.min(30, Number(body.count) || 20));
    const questions = await db.gameQuestion.findMany({
      where: { gameRoomId: null },
      take: count,
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        text: true,
        type: true,
        options: true,
        correctAnswer: true,
        difficulty: true,
      },
    });

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
      })),
    });
  }

  if (body?.action === "results") {
    const code = String(body.code || "").toUpperCase();
    const hostId = String(body.hostId || "");
    const roomName = String(body.roomName || "Kuis Tempur");
    const results = Array.isArray(body.results) ? (body.results as ArenaResult[]) : [];

    const validPersistenceCode = /^[A-HJ-NP-Z2-9]{6}(?:-[A-Z0-9]{6,10})?$/.test(code);
    if (!validPersistenceCode || !hostId || results.length < 1 || results.length > 10) {
      return NextResponse.json({ error: "Invalid match payload" }, { status: 400 });
    }

    const playerIds = results.map((r) => String(r.playerId || "")).filter(Boolean);
    if (playerIds.length !== results.length || !playerIds.includes(hostId)) {
      return NextResponse.json({ error: "Invalid players" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const room = await tx.gameRoom.upsert({
        where: { code },
        create: {
          code,
          name: roomName.slice(0, 120),
          gameType: "KUIS_BATTLE",
          hostId,
          status: "FINISHED",
          category: "KUIS_TEMPUR_ARENA",
          difficulty: "MEDIUM",
          questionCount: 20,
          timePerQuestion: 15,
          startedAt: new Date(Number(body.startedAt) || Date.now()),
          endedAt: new Date(Number(body.endedAt) || Date.now()),
        },
        update: {
          status: "FINISHED",
          endedAt: new Date(Number(body.endedAt) || Date.now()),
        },
      });

      for (const row of results) {
        const playerId = String(row.playerId);
        const session = await tx.gameSession.upsert({
          where: { roomId_userId: { roomId: room.id, userId: playerId } },
          create: {
            roomId: room.id,
            userId: playerId,
            playerName: String(row.playerName || "Pemain").slice(0, 100),
            avatarUrl: row.avatarUrl || undefined,
            score: Math.max(0, Number(row.score) || 0),
            correct: Math.max(0, Number(row.correct) || 0),
            wrong: Math.max(0, Number(row.wrong) || 0),
            streak: 0,
            maxStreak: Math.max(0, Number(row.maxStreak) || 0),
            answerTimes: [],
          },
          update: {
            score: Math.max(0, Number(row.score) || 0),
            correct: Math.max(0, Number(row.correct) || 0),
            wrong: Math.max(0, Number(row.wrong) || 0),
            maxStreak: Math.max(0, Number(row.maxStreak) || 0),
          },
        });

        const existingResult = await tx.gameResult.findUnique({
          where: { sessionId: session.id },
          select: { id: true },
        });

        const xpEarned = Math.max(0, Math.min(200, Number(row.xpEarned) || 0));
        if (existingResult) {
          await tx.gameResult.update({
            where: { sessionId: session.id },
            data: {
              finalScore: Math.max(0, Number(row.score) || 0),
              rank: Math.max(1, Number(row.rank) || 1),
              correct: Math.max(0, Number(row.correct) || 0),
              wrong: Math.max(0, Number(row.wrong) || 0),
              maxStreak: Math.max(0, Number(row.maxStreak) || 0),
              avgTime: 0,
              xpEarned,
            },
          });
        } else {
          await tx.gameResult.create({
            data: {
              roomId: room.id,
              userId: playerId,
              sessionId: session.id,
              finalScore: Math.max(0, Number(row.score) || 0),
              rank: Math.max(1, Number(row.rank) || 1),
              correct: Math.max(0, Number(row.correct) || 0),
              wrong: Math.max(0, Number(row.wrong) || 0),
              maxStreak: Math.max(0, Number(row.maxStreak) || 0),
              avgTime: 0,
              xpEarned,
            },
          });
          if (xpEarned > 0) {
            await tx.user.update({
              where: { id: playerId },
              data: { xp: { increment: xpEarned } },
            });
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
