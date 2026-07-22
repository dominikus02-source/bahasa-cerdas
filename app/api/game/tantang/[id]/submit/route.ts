/**
 * Submit jawaban tantangan — dinilai SERVER-SIDE terhadap kunci di GameQuestion
 * (klien tidak pernah memegang kunci sebelum selesai; anti-curang).
 *
 * Idempoten: kalau sesi sudah selesai, kembalikan hasil tersimpan (bukan error,
 * bukan replay) — pola yang sama dengan submit UKBI.
 *
 * XP dibatasi server: benar x 5, maks 50 per duel. Pemenang tidak dapat koin
 * (hindari farming antar teman); kompetisinya di papan skor & notifikasi.
 */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const room = await db.gameRoom.findFirst({
    where: { id, category: "TANTANGAN", sessions: { some: { userId: user.id } } },
    select: {
      id: true, status: true, hostId: true, questionCount: true,
      sessions: { select: { id: true, userId: true, playerName: true, score: true, correct: true, finishedAt: true } },
    },
  });
  if (!room) return NextResponse.json({ error: "Tantangan tidak ditemukan." }, { status: 404 });

  const mine = room.sessions.find((s) => s.userId === user.id)!;
  const other = room.sessions.find((s) => s.userId !== user.id);

  // Idempoten: sudah pernah submit -> kembalikan hasil tersimpan.
  if (mine.finishedAt) {
    return NextResponse.json({
      sudahSelesai: true,
      skor: mine.score,
      benar: mine.correct,
    });
  }

  const body = await req.json().catch(() => ({}));
  const answers: unknown[] = Array.isArray(body.answers) ? body.answers : [];
  const durationMs = Math.min(Math.max(Number(body.durationMs) || 0, 0), 30 * 60 * 1000);

  const questions = await db.gameQuestion.findMany({
    where: { gameRoomId: room.id },
    orderBy: { orderIndex: "asc" },
    select: { id: true, text: true, options: true, correctAnswer: true, explanation: true },
  });
  if (questions.length === 0) return NextResponse.json({ error: "Soal tidak ditemukan." }, { status: 500 });

  // Nilai server-side.
  let correct = 0;
  const review = questions.map((q, i) => {
    const myAnswer = typeof answers[i] === "number" ? (answers[i] as number) : null;
    const key = parseInt(q.correctAnswer);
    const isCorrect = myAnswer === key;
    if (isCorrect) correct++;
    return { text: q.text, options: q.options, correctAnswer: key, myAnswer, isCorrect, explanation: q.explanation };
  });
  const wrong = questions.length - correct;
  const score = correct * 10;
  const xpEarned = Math.min(correct * 5, 50);

  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const newXp = dbUser.xp + xpEarned;

  const theyFinished = Boolean(other?.finishedAt);
  const bothDone = theyFinished; // aku selesai sekarang

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.gameSession.update({
      where: { id: mine.id },
      data: { score, correct, wrong, finishedAt: new Date() },
    }),
    db.gameResult.create({
      data: {
        roomId: room.id,
        userId: user.id,
        sessionId: mine.id,
        finalScore: score,
        correct,
        wrong,
        maxStreak: 0,
        avgTime: questions.length ? durationMs / 1000 / questions.length : 0,
        xpEarned,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { xp: newXp, level: calcLevel(newXp), league: calcLeagueFromXP(newXp), lastActiveAt: new Date() },
    }),
    db.gameRoom.update({
      where: { id: room.id },
      data: bothDone ? { status: "FINISHED", endedAt: new Date() } : { status: "IN_PROGRESS", startedAt: new Date() },
    }),
  ];

  if (bothDone && other) {
    const myName = mine.playerName;
    const hasilku = score > other.score ? "MENANG" : score < other.score ? "KALAH" : "SERI";
    const bodyLawan =
      hasilku === "MENANG"
        ? `${myName} menang ${score}-${other.score} melawanmu. Balas tantangannya!`
        : hasilku === "KALAH"
          ? `Kamu menang ${other.score}-${score} melawan ${myName}. Keren!`
          : `Seri ${score}-${other.score} melawan ${myName}. Tanding ulang?`;
    ops.push(
      db.notifikasi.create({
        data: {
          userId: other.userId,
          title: "Hasil Tantangan",
          body: bodyLawan,
          type: "TANTANGAN",
          data: { link: "/arena/game/tantang" },
        },
      })
    );
  } else if (other) {
    // Aku selesai duluan — kabari lawan bahwa giliran dia.
    ops.push(
      db.notifikasi.create({
        data: {
          userId: other.userId,
          title: "Giliranmu Main!",
          body: `${mine.playerName} sudah menyelesaikan tantangannya. Sekarang giliranmu!`,
          type: "TANTANGAN",
          data: { link: "/arena/game/tantang" },
        },
      })
    );
  }

  await db.$transaction(ops);

  return NextResponse.json({
    skor: score,
    benar: correct,
    salah: wrong,
    xpEarned,
    review,
    lawan: other
      ? { nama: other.playerName, selesai: theyFinished, skor: theyFinished ? other.score : null }
      : null,
    selesai: bothDone,
    hasil: bothDone && other ? (score > other.score ? "MENANG" : score < other.score ? "KALAH" : "SERI") : null,
  });
}
