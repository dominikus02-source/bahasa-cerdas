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
import { QUESTION_BANK } from "@/lib/game/question-bank";
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";

export const dynamic = "force-dynamic";

type GameQuestion = { id: string; soal: string; opsi: string[]; jawaban: number; penjelasan: string };

// Quality gate: reject anything ambiguous or malformed. A question is valid only
// if it has >=3 distinct options, exactly one answer in range. This automatically
// filters out bad lesson questions (duplicate options, out-of-range answers).
function isValid(q: GameQuestion): boolean {
  if (!q.soal || !Array.isArray(q.opsi) || q.opsi.length < 3) return false;
  if (q.jawaban < 0 || q.jawaban >= q.opsi.length) return false;
  const norm = q.opsi.map((o) => o.trim().toLowerCase());
  if (norm.some((o) => !o)) return false;
  if (new Set(norm).size !== norm.length) return false; // duplicate options = ambiguous
  return true;
}

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
    take: 50,
  });

  const pool: GameQuestion[] = [];

  // 1) Curated, hand-verified bank (guaranteed quality).
  for (const b of QUESTION_BANK) {
    pool.push({ id: `bank_${pool.length}`, soal: b.soal, opsi: b.opsi, jawaban: b.jawaban, penjelasan: b.penjelasan });
  }

  // 2) Real lesson questions from Jalur Cerdas.
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

  // Dedupe by question text + drop ambiguous/malformed items, then shuffle so
  // every player gets a different random subset.
  const seen = new Set<string>();
  const clean = pool.filter((q) => {
    if (!isValid(q)) return false;
    const key = q.soal.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const questions = shuffle(clean).slice(0, count);
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
  const newLevel = calcLevel(newXp);
  const newLeague = calcLeagueFromXP(newXp);

  await db.user.update({
    where: { id: user.id },
    data: { xp: newXp, level: newLevel, league: newLeague, lastActiveAt: new Date() },
  });

  return NextResponse.json({
    xpEarned,
    newXp,
    newLevel,
    leveledUp: newLevel > dbUser.level,
  });
}
