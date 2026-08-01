import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";

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
    if (!dbUser || (dbUser.role?.toUpperCase() !== "GURU" && dbUser.role?.toUpperCase() !== "ADMIN" && !dbUser.isFounder)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

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
    const count = Math.min(Math.max(jumlah, 5), 30);
    const where: any = { source: "MASTER_BANK", topik: tema, kelas };
    if (difficulty) where.difficulty = DIFFICULTY_MAP[difficulty] || difficulty;

    const totalAvailable = await db.soal.count({ where });
    if (totalAvailable === 0) {
      return NextResponse.json({ error: `Tidak ada soal untuk tema "${tema}" kelas ${kelas}` }, { status: 404 });
    }

    let soals = await db.soal.findMany({
      where,
      take: count,
      orderBy: { usedCount: "asc" },
    });

    if (soals.length < count) {
      const fillSoals = await db.soal.findMany({
        where: { source: "MASTER_BANK", topik: tema, id: { notIn: soals.map(s => s.id) } },
        take: count - soals.length,
        orderBy: { usedCount: "asc" },
      });
      soals.push(...fillSoals);
    }

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
