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

  // Pull ALL active Jalur Cerdas lesson units (72) and harvest their MCQ
  // questions, keeping each unit's level so the run can ramp up in difficulty.
  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    select: { content: true, level: { select: { level: true } } },
  });

  type RampQuestion = GameQuestion & { lvl: number };
  const pool: RampQuestion[] = [];

  // 1) Curated, hand-verified bank (guaranteed quality) — mid difficulty.
  for (const b of QUESTION_BANK) {
    pool.push({ id: `bank_${pool.length}`, soal: b.soal, opsi: b.opsi, jawaban: b.jawaban, penjelasan: b.penjelasan, lvl: 6 });
  }

  // 2) Real lesson questions from Jalur Cerdas, tagged with their unit level.
  for (const u of units) {
    if (!u.content) continue;
    try {
      const parsed = JSON.parse(u.content);
      if (Array.isArray(parsed?.questions)) {
        for (const q of parsed.questions) {
          const n = normalize(q);
          if (n) pool.push({ ...n, lvl: u.level?.level ?? 6 });
        }
      }
    } catch {
      /* skip malformed unit */
    }
  }

  // Dedupe by question text + drop ambiguous/malformed items.
  const seen = new Set<string>();
  const clean = pool.filter((q) => {
    if (!isValid(q)) return false;
    const key = q.soal.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Stratified pick: sepertiga mudah (L1-4), sepertiga menengah (L5-8),
  // sepertiga sulit (L9-12) — lalu urutkan naik supaya lantai awal menara
  // mudah dan makin tinggi makin menantang. Subset tetap acak per pemain.
  const bands = [
    clean.filter((q) => q.lvl <= 4),
    clean.filter((q) => q.lvl > 4 && q.lvl <= 8),
    clean.filter((q) => q.lvl > 8),
  ];
  const per = Math.floor(count / 3);
  const targets = [per, per, count - 2 * per];
  const picked: RampQuestion[] = [];
  bands.forEach((band, i) => picked.push(...shuffle(band).slice(0, targets[i])));
  if (picked.length < count) {
    const have = new Set(picked.map((q) => q.soal));
    picked.push(...shuffle(clean).filter((q) => !have.has(q.soal)).slice(0, count - picked.length));
  }

  const questions = picked
    .sort((a, b) => a.lvl - b.lvl)
    .slice(0, count)
    .map(({ lvl: _lvl, ...q }) => q);
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
