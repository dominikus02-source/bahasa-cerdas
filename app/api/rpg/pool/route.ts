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
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { isEligibleForGameplay } from "@/lib/game-questions/quality";
import type { GameQuestion } from "@/lib/game-questions/types";
import { difficultyFor } from "@/src/game/rpg/learning/rpg-challenge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    let dbUser: { id: string } | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const found = await db.user.findUnique({ where: { supabaseId: user.id } });
        if (found) dbUser = found;
      }
    } catch {
      dbUser = null;
    }
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const full = await db.user.findUnique({ where: { id: dbUser.id } });
    if (!full || !isTeacherOrStudent(full as never)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const eligible = rows.filter((r) => {
      const q: GameQuestion = {
        id: r.kodeSoal || r.id,
        question: (r.text ?? "").trim(),
        options: [...(r.options ?? [])],
        correctAnswer: (r.correctAnswer ?? "").trim(),
        explanation: r.explanation ?? undefined,
        difficulty: difficultyFor(r.difficulty),
        topic: r.topik ?? undefined,
        source: "soal",
      };
      return isEligibleForGameplay(q);
    });
    const picked = eligible.slice(0, count);

    return NextResponse.json({
      questions: picked.map((r) => ({
        id: r.id,
        kodeSoal: r.kodeSoal,
        text: r.text,
        type: r.type,
        options: r.options,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
        difficulty: r.difficulty,
        kelas: r.kelas,
        topik: r.topik,
        kompetensi: r.kompetensi,
        KD: r.KD,
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
