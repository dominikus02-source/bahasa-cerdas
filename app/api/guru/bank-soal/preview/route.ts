import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { normalizeDifficulty, seededShuffle } from "@/lib/question-bank/seeded-pick";
import { isMasterBankDeliverable, toDeliverySoal } from "@/lib/question-bank/delivery-gate";

// Preview soal bank SEBELUM dipilih kelas tujuan (read-only, tanpa efek
// samping). Guru-only: kunci jawaban + pembahasan ikut dikembalikan. Set soal
// ditentukan tema+difficulty+jumlah+seed — persis sama dengan yang dipakai
// /send, sehingga preview == kiriman (randomize sekali, saat preview).
export async function GET(req: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tema = searchParams.get("tema") || "";
    const difficultyRaw = searchParams.get("difficulty") || "";
    const jumlah = Math.min(Math.max(Number(searchParams.get("jumlah")) || 10, 1), 30);
    const seed = (searchParams.get("seed") || "").trim();

    if (!tema) {
      return NextResponse.json({ error: "Tema wajib diisi" }, { status: 400 });
    }
    if (seed.length > 64) {
      return NextResponse.json({ error: "Seed tidak valid" }, { status: 400 });
    }

    const difficulty = normalizeDifficulty(difficultyRaw);
    if (difficultyRaw && !difficulty) {
      return NextResponse.json({ error: "Tingkat kesulitan tidak valid" }, { status: 400 });
    }

    // Bank reusable (migrasi Founder): sentinel kelas "SEMUA".
    const where: Record<string, unknown> = { source: "MASTER_BANK", topik: tema };
    if (difficulty) where.difficulty = difficulty;

    const totalAvailable = await db.soal.count({ where });
    const candidates = await db.soal.findMany({ where });
    const deliverable = candidates.filter((s) => isMasterBankDeliverable(toDeliverySoal(s)));

    // Seed di-generate klien sekali per konfigurasi → preview & send menghitung
    // set yang sama dari kandidat yang sama (tanpa randomize kedua).
    const ordered = seed ? seededShuffle(deliverable, seed) : deliverable;
    const selected = ordered.slice(0, jumlah);

    return NextResponse.json({
      success: true,
      tema,
      totalAvailable,
      deliverableTotal: deliverable.length,
      questionIds: selected.map((s) => s.id),
      seed,
      soal: selected.map((s, i) => ({
        id: s.id,
        nomor: i + 1,
        text: s.text,
        options: (s as unknown as { options?: unknown }).options || [],
        correctAnswer: (s as unknown as { correctAnswer?: unknown }).correctAnswer ?? null,
        explanation: (s as unknown as { explanation?: unknown }).explanation || null,
        difficulty: s.difficulty || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/guru/bank-soal/preview error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
