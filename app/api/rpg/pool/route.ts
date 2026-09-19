/**
 * RPG question pool — canonical Soal source for Pendekar Suryakerta (P1.9C).
 *
 * Authenticated teachers/students only. Serves validated shared questions:
 * - MASTER_BANK excluded (existing gameplay quarantine, respected here).
 * - Each candidate passes the canonical isEligibleForGameplay gate.
 * - Deterministic order (id asc); the engine samples per-encounter seeds.
 * - Cap 30 rows per call; optional kelas/topik filters.
 *
 * INTERIM AUTHORITY NOTE: rows include correctAnswer because the RPG engine
 * evaluates locally today (single-player client runtime). The adapter still
 * strips answers for DISPLAY via toClientChallenge; server-side evaluation
 * arrives with multiplayer (same boundary as the rest of RPG state).
 *
 * P2.8.5: DB→GameQuestion mapping normalizes the canonical contract:
 * - MCQ correctAnswer is resolved from numeric index to option text.
 * - non-MCQ types set freeText=true per the canonical type contract.
 * This mirrors adaptSoalToChallenge() behavior for the eligibility gate.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { db } from "@/lib/db";
import { isEligibleForGameplay } from "@/lib/game-questions/quality";
import type { GameQuestion } from "@/lib/game-questions/types";
import { difficultyFor } from "@/src/game/rpg/learning/rpg-challenge";

/**
 * Resolve a Soal row to the canonical GameQuestion shape.
 *
 * MCQ: correctAnswer may be a numeric index ("0","1","2","3") stored in the
 * DB. The canonical contract requires TEKS (option text). This function
 * resolves the index against the options array.
 *
 * non-MCQ (BENAR_SALAH, ISIAN, ESSAY, ISIAN_SINGKAT): the canonical contract
 * requires freeText=true so the validator uses the free-text path instead of
 * the MCQ answer-in-options check.
 *
 * This mirrors adaptSoalToChallenge() in rpg-challenge.ts:137.
 */
function soalRowToGameQuestion(r: {
  id: string;
  kodeSoal?: string | null;
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  difficulty?: string | null;
  topik?: string | null;
}): GameQuestion {
  const options = [...(r.options ?? [])];
  let correctAnswer = (r.correctAnswer ?? "").trim();

  // P2.8.5 Phase 2: MCQ index→text resolution.
  // canonical normalizeBankQuestion() does: clean((q.opsi || [])[q.jawaban])
  // DB stores correctAnswer as string index "0","1","2","3".
  // Resolve numeric index against the options array.
  if (r.type === "PILIHAN_GANDA" && options.length > 0) {
    const idx = Number(correctAnswer);
    if (Number.isInteger(idx) && idx >= 0 && idx < options.length) {
      correctAnswer = options[idx].trim();
    }
  }

  // P2.8.5 Phase 3: freeText from question type.
  // Mirrors adaptSoalToChallenge(): soal.type !== "PILIHAN_GANDA"
  const freeText = r.type !== "PILIHAN_GANDA";

  return {
    id: r.kodeSoal || r.id,
    question: (r.text ?? "").trim(),
    options,
    correctAnswer,
    explanation: r.explanation ?? undefined,
    difficulty: difficultyFor(r.difficulty),
    topic: r.topik ?? undefined,
    source: "soal",
    ...(freeText ? { freeText: true as const } : {}),
  };
}

export async function GET(req: NextRequest) {
  try {
    // P2.8: pool carries answer-bearing rows → same premium play gate as
    // all gameplay APIs (fail closed for FREE plans).
    const access = await requireRpgPlayAccess();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);

    const count = Math.min(Math.max(Number(searchParams.get("count") ?? 20), 1), 30);
    const kelas = searchParams.get("kelas");
    const topik = searchParams.get("topik");

    const rows = await db.soal.findMany({
      where: {
        // MASTER_BANK_RETIRED: baris bank lama yang sudah di-retire — tanpa
        // guard ini, retire justru MEMBUKA mereka ke pool RPG (filter not).
        source: { notIn: ["MASTER_BANK", "MASTER_BANK_RETIRED"] },
        ...(kelas ? { kelas } : {}),
        ...(topik ? { topik } : {}),
      },
      orderBy: { id: "asc" },
      take: 200,
      select: {
        id: true, kodeSoal: true, text: true, type: true, options: true,
        correctAnswer: true, explanation: true, difficulty: true, kelas: true,
        topik: true, kompetensi: true, KD: true,
      },
    });

    // P2.8.5: Normalize each row for eligibility AND carry the normalized
    // correctAnswer + freeText into the response (the client evaluates locally).
    const normalized = rows.map((r) => ({ raw: r, q: soalRowToGameQuestion(r) }));
    const eligible = normalized.filter(({ q }) => isEligibleForGameplay(q));
    const picked = eligible.slice(0, count);

    return NextResponse.json({
      questions: picked.map(({ raw, q }) => ({
        id: raw.id,
        kodeSoal: raw.kodeSoal,
        text: raw.text,
        type: raw.type,
        options: raw.options,
        correctAnswer: q.correctAnswer,
        explanation: raw.explanation,
        difficulty: raw.difficulty,
        kelas: raw.kelas,
        topik: raw.topik,
        kompetensi: raw.kompetensi,
        KD: raw.KD,
      })),
      count: picked.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal memuat pool soal", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
