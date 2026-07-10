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

export const dynamic = "force-dynamic";

type LessonQuestion = {
  id?: string;
  tipe?: string;
  soal?: string;
  opsi?: string[];
  jawaban?: string | number;
  penjelasan?: string;
};

// Normalize a lesson question to a client-friendly MCQ with an answer index.
function normalize(q: LessonQuestion): { id: string; soal: string; opsi: string[]; jawaban: number; penjelasan: string } | null {
  if (!q?.soal || !Array.isArray(q.opsi) || q.opsi.length < 2) return null;
  if (q.tipe && q.tipe !== "pilihan_ganda" && q.tipe !== "benar_salah") return null;

  let idx: number;
  if (typeof q.jawaban === "number") {
    idx = q.jawaban;
  } else if (typeof q.jawaban === "string") {
    idx = q.opsi.findIndex((o) => o.trim().toLowerCase() === q.jawaban!.toString().trim().toLowerCase());
  } else {
    return null;
  }
  if (idx < 0 || idx >= q.opsi.length) return null;

  return {
    id: q.id || Math.random().toString(36).slice(2),
    soal: q.soal,
    opsi: q.opsi,
    jawaban: idx,
    penjelasan: q.penjelasan || "",
  };
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = Math.min(Math.max(Number(new URL(req.url).searchParams.get("count")) || 12, 5), 20);

  // Pull all active Jalur Cerdas lesson units and harvest their MCQ questions.
  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    select: { content: true },
  });

  const pool: ReturnType<typeof normalize>[] = [];
  for (const u of units) {
    if (!u.content) continue;
    try {
      const parsed = JSON.parse(u.content);
      if (Array.isArray(parsed?.questions)) {
        for (const q of parsed.questions) {
          const n = normalize(q);
          if (n) pool.push(n);
        }
      }
    } catch {
      /* skip malformed unit */
    }
  }

  const questions = shuffle(pool.filter(Boolean) as NonNullable<ReturnType<typeof normalize>>[]).slice(0, count);
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const total = Math.min(Math.max(Number(body.total) || 0, 0), 20);
  const correct = Math.min(Math.max(Number(body.correct) || 0, 0), total);

  // Server-capped reward — prevents inflated client claims / XP farming.
  const xpEarned = correct * 5; // max 100 XP per run

  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newXp = dbUser.xp + xpEarned;
  const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

  await db.user.update({
    where: { id: user.id },
    data: { xp: newXp, level: newLevel, lastActiveAt: new Date() },
  });

  return NextResponse.json({
    xpEarned,
    newXp,
    newLevel,
    leveledUp: newLevel > dbUser.level,
  });
}
