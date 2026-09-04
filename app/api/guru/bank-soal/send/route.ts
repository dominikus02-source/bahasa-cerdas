import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";
import { awardGuruXp } from "@/lib/gamification/teacher-xp";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { isMasterBankDeliverable, toDeliverySoal } from "@/lib/question-bank/delivery-gate";

const DIFFICULTY_MAP: Record<string, string> = {
  MUDAH: "EASY",
  SEDANG: "MEDIUM",
  SULIT: "HARD",
};

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "bank-soal-send" });
    if (rl) return rl;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { tema, kelas, groupIds, jumlah = 10, difficulty, dueDate } = await req.json();

    if (!tema || !kelas || !groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ error: "Tema, kelas, dan groupIds wajib diisi" }, { status: 400 });
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: "Tanggal tenggat tidak valid" }, { status: 400 });
      }
      if (parsedDueDate.getTime() < Date.now()) {
        return NextResponse.json({ error: "Tanggal tenggat tidak boleh di masa lalu" }, { status: 400 });
      }
    }

    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, teacherId: dbUser.id },
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    // Pick random questions from Master Bank
    // P0.6 containment: MASTER_BANK dikarantina penuh untuk pengiriman ke
    // murid — hanya butir yang lolos REVIEW KONTEN MANUSIA pasca-audit
    // (allowlist DELIVERABLE_MASTER_KODE_SOALS, masih kosong) yang layak
    // kirim. Audit forensik (2026-09-04): 1.480/1.500 item master adalah
    // template sampah (RETIRE), 19 SALVAGE belum direview, 1 BROKEN.
    const count = Math.min(Math.max(jumlah, 5), 30);
    const where: any = { source: "MASTER_BANK", topik: tema, kelas };
    if (difficulty) where.difficulty = DIFFICULTY_MAP[difficulty] || difficulty;

    // Ambil seluruh kandidat tema/kelas, lalu saring ke himpunan yang layak
    // kirim. Tidak ada fallback diam-diam ke bank yang terkontaminasi.
    const candidates = await db.soal.findMany({ where });
    const deliverable = candidates.filter((s: any) => isMasterBankDeliverable(toDeliverySoal(s as any)));

    if (deliverable.length === 0) {
      return NextResponse.json({
        error: `Tema "${tema}" kelas ${kelas} belum memiliki soal yang lolos verifikasi kualitas. Gunakan AI Generate untuk membuat soal baru, atau coba tema lain.`,
        totalAvailable: 0,
      }, { status: 422 });
    }

    if (deliverable.length < count) {
      return NextResponse.json({
        error: `Hanya ${deliverable.length} soal yang lolos verifikasi kualitas untuk tema "${tema}" kelas ${kelas}. Kurangi jumlah soal (minimal 1) atau gunakan AI Generate.`,
        totalAvailable: deliverable.length,
      }, { status: 422 });
    }

    const soals = [...deliverable];
    const totalAvailable = soals.length;

    const shuffled = soals.sort(() => Math.random() - 0.5).slice(0, count);

    // Update usedCount
    await db.soal.updateMany({
      where: { id: { in: shuffled.map(s => s.id) } },
      data: { usedCount: { increment: 1 } },
    });

    // Create Quiz + QuizQuestions + Assignments in transaction
    const quiz = await db.quiz.create({
      data: {
        title: `Latihan: ${tema}`,
        description: `Latihan ${tema} kelas ${kelas} — ${shuffled.length} soal (dari Bank Soal)`,
        type: "LATIHAN",
        status: "PUBLISHED",
        kelas,
        subject: "Bahasa Indonesia",
        topik: tema,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswer: true,
        maxAttempts: 0,
        creatorId: dbUser.id,
        questions: {
          create: shuffled.map((s, idx) => ({
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
      groups.map(group =>
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
    const groupNames = groups.map(g => g.name).join(", ");
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
      quiz: { id: quiz.id, title: quiz.title, topik: quiz.topik, totalSoal: shuffled.length },
      assignments: assignments.length,
      groups: groupNames,
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/guru/bank-soal/send error:", error);
    return NextResponse.json({ error: "Gagal mengirim latihan" }, { status: 500 });
  }
}
