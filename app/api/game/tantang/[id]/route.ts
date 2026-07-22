/**
 * Detail satu tantangan.
 *
 * - Belum main  -> soal TANPA kunci jawaban (correctAnswer/explanation di-strip;
 *                  penilaian dilakukan server-side saat submit).
 * - Sudah main  -> hasil + review lengkap (kunci + penjelasan baru terlihat
 *                  SETELAH selesai; skor lawan hanya saat keduanya selesai).
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const room = await db.gameRoom.findFirst({
    where: { id, category: "TANTANGAN", sessions: { some: { userId: user.id } } },
    select: {
      id: true, status: true, createdAt: true, hostId: true, questionCount: true,
      sessions: { select: { userId: true, playerName: true, score: true, correct: true, wrong: true, finishedAt: true } },
    },
  });
  if (!room) return NextResponse.json({ error: "Tantangan tidak ditemukan." }, { status: 404 });

  const mine = room.sessions.find((s) => s.userId === user.id)!;
  const other = room.sessions.find((s) => s.userId !== user.id);
  const iFinished = Boolean(mine.finishedAt);
  const done = iFinished && Boolean(other?.finishedAt);

  const questions = await db.gameQuestion.findMany({
    where: { gameRoomId: room.id },
    orderBy: { orderIndex: "asc" },
    select: iFinished
      ? { id: true, text: true, options: true, orderIndex: true, correctAnswer: true, explanation: true }
      : { id: true, text: true, options: true, orderIndex: true },
  });

  return NextResponse.json({
    id: room.id,
    questionCount: room.questionCount,
    akuPenantang: room.hostId === user.id,
    aku: { selesai: iFinished, skor: iFinished ? mine.score : null, benar: iFinished ? mine.correct : null },
    lawan: {
      nama: other?.playerName || "Lawan",
      selesai: Boolean(other?.finishedAt),
      skor: done ? other!.score : null,
      benar: done ? other!.correct : null,
    },
    selesai: done,
    hasil: done ? (mine.score > other!.score ? "MENANG" : mine.score < other!.score ? "KALAH" : "SERI") : null,
    questions,
  });
  } catch (error) {
    console.error("tantang detail GET error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan di server. Coba lagi, ya." }, { status: 500 });
  }
}
