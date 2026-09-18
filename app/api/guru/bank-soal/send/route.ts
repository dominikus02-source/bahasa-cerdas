import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";
import { awardGuruXp } from "@/lib/gamification/teacher-xp";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { normalizeDifficulty, pickBankSoalSet } from "@/lib/question-bank/seeded-pick";
import { isMasterBankDeliverable, toDeliverySoal } from "@/lib/question-bank/delivery-gate";

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "bank-soal-send" });
    if (rl) return rl;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const body = await req.json();
    const tema = typeof body.tema === "string" ? body.tema : "";
    const groupIds = Array.isArray(body.groupIds) ? body.groupIds.filter((g: unknown): g is string => typeof g === "string") : [];
    const jumlah = Math.min(Math.max(Number(body.jumlah) || 10, 1), 30);
    const seed = typeof body.seed === "string" ? body.seed.trim().slice(0, 64) : "";
    const questionIds = Array.isArray(body.questionIds)
      ? body.questionIds.filter((q: unknown): q is string => typeof q === "string")
      : [];

    if (!tema || groupIds.length === 0) {
      return NextResponse.json({ error: "Tema dan minimal 1 kelas tujuan wajib diisi" }, { status: 400 });
    }

    let parsedDueDate: Date | null = null;
    if (body.dueDate) {
      parsedDueDate = new Date(body.dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: "Tanggal tenggat tidak valid" }, { status: 400 });
      }
      if (parsedDueDate.getTime() < Date.now()) {
        return NextResponse.json({ error: "Tanggal tenggat tidak boleh di masa lalu" }, { status: 400 });
      }
    }

    // Destination is teacher-owned only.
    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, teacherId: dbUser.id },
    });
    if (groups.length === 0) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }
    if (groups.length < groupIds.length) {
      return NextResponse.json({ error: "Beberapa kelas tidak ditemukan atau bukan milik Anda" }, { status: 403 });
    }

    // QUIZ.kelas is a single-string column; reuse existing semantics
    // (group grade) — it is never used to filter Bank Soal delivery.
    const uniqueGrades = [...new Set(groups.map((g) => g.grade || "SEMUA"))];
    const quizKelas = uniqueGrades.length === 1 ? uniqueGrades[0] : "SEMUA";

    const difficulty = normalizeDifficulty(body.difficulty);
    if (body.difficulty && !difficulty) {
      return NextResponse.json({ error: "Tingkat kesulitan tidak valid" }, { status: 400 });
    }

    // P0.6 containment: MASTER_BANK dikarantina penuh untuk pengiriman ke
    // murid — hanya butir yang lolos REVIEW KONTEN MANUSIA pasca-audit
    // (melewati isMasterBankDeliverable) yang layak kirim. Set dihitung dari
    // tema+difficulty+seed yang sama dengan /preview → preview == kiriman.
    const where: Record<string, unknown> = { source: "MASTER_BANK", topik: tema };
    if (difficulty) where.difficulty = difficulty;

    const candidates = await db.soal.findMany({ where });
    const deliverable = candidates.filter((s) => isMasterBankDeliverable(toDeliverySoal(s)));

    if (deliverable.length === 0) {
      return NextResponse.json({
        error: `Tema "${tema}" belum memiliki soal yang lolos verifikasi kualitas. Gunakan AI Generate untuk membuat soal baru, atau coba tema lain.`,
        totalAvailable: 0,
      }, { status: 422 });
    }
    if (deliverable.length < jumlah) {
      return NextResponse.json({
        error: `Hanya ${deliverable.length} soal yang lolos verifikasi kualitas untuk tema "${tema}". Kurangi jumlah soal atau gunakan AI Generate.`,
        totalAvailable: deliverable.length,
      }, { status: 422 });
    }

    let selectedIds: string[];
    if (questionIds.length > 0) {
      // Client-provided set: server re-derives the SAME set via
      // theme+difficulty+seed and verifies it matches (no trust in client IDs).
      const { selected } = pickBankSoalSet(candidates, { jumlah, difficulty, seed: seed || "__none__" });
      const derivedIds = new Set(selected.map((s) => s.id));
      const mismatch = questionIds.some((q: string) => !derivedIds.has(q));
      if (mismatch || questionIds.length !== selected.length) {
        return NextResponse.json({ error: "Set soal tidak cocok dengan konfigurasi. Muat ulang preview." }, { status: 409 });
      }
      selectedIds = questionIds;
    } else {
      // No explicit set provided (e.g. backward compatibility): derive from seed.
      const { selected } = pickBankSoalSet(candidates, { jumlah, difficulty, seed: seed || "__none__" });
      selectedIds = selected.map((s) => s.id);
      if (selectedIds.length < jumlah) {
        return NextResponse.json({ error: "Soal tidak cukup tersedia" }, { status: 422 });
      }
    }

    // Preserve the PREVIEWED order: questionIds arrive in preview order and
    // become QuizQuestion.orderIndex verbatim (DB row order is nondeterministic).
    const soalMap = new Map(deliverable.map((s) => [s.id, s]));
    const soals = selectedIds
      .map((id) => soalMap.get(id))
      .filter((s): s is (typeof deliverable)[number] => Boolean(s));
    if (soals.length !== selectedIds.length) {
      return NextResponse.json({ error: "Beberapa soal tidak lagi tersedia. Muat ulang preview." }, { status: 409 });
    }

    // Update usedCount
    await db.soal.updateMany({
      where: { id: { in: soals.map((s) => s.id) } },
      data: { usedCount: { increment: 1 } },
    });

    // Create Quiz + QuizQuestions + Assignments in transaction
    const quiz = await db.quiz.create({
      data: {
        title: `Latihan: ${tema}`,
        description: `Latihan ${tema} — ${soals.length} soal (dari Bank Soal)`,
        type: "LATIHAN",
        status: "PUBLISHED",
        kelas: quizKelas,
        subject: "Bahasa Indonesia",
        topik: tema,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswer: true,
        maxAttempts: 0,
        creatorId: dbUser.id,
        questions: {
          create: soals.map((s, idx) => ({
            sourceType: "SOAL",
            sourceId: s.id,
            orderIndex: idx,
            points: 1,
          })),
        },
      },
    });

    // Create assignments
    const assignments = await Promise.all(
      groups.map((group) =>
        db.quizAssignment.create({
          data: {
            quizId: quiz.id,
            groupId: group.id,
            dueDate: parsedDueDate,
            isPublished: true,
          },
        })
      )
    );

    // Notifikasi guru
    const groupNames = groups.map((g) => g.name).join(", ");
    try {
      await db.notifikasi.create({
        data: {
          userId: dbUser.id,
          title: "✅ Latihan Terkirim",
          body: `"${quiz.title}" berhasil dikirim ke ${groups.length} kelas (${groupNames})`,
          type: "LATIHAN_KIRIM",
          data: { quizId: quiz.id, link: "/guru/bank-soal" },
        },
      });
    } catch {}

    // Guru XP: mengirim latihan ke kelas (per quiz, idempotent per kiriman).
    try {
      await awardGuruXp({
        guruId: dbUser.id,
        sumber: "GURU_TUGAS",
        reference: `quiz-assign-${quiz.id}`,
        metadata: { quizId: quiz.id, groupIds: groups.map((g) => g.id) },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      quiz: { id: quiz.id, title: quiz.title, topik: quiz.topik, totalSoal: soals.length },
      assignments: assignments.length,
      groups: groupNames,
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/guru/bank-soal/send error:", error);
    return NextResponse.json({ error: "Gagal mengirim latihan" }, { status: 500 });
  }
}
