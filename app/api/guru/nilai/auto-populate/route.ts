import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { upsertNilaiOtomatis } from "@/lib/penilaian/upsert-nilai";
import type { SumberType } from "@/lib/penilaian/upsert-nilai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const body = await req.json();
    const { groupId, sourceTypes, dateFrom, dateTo, overwriteAuto = true, dryRun = false } = body;

    if (!groupId) {
      return NextResponse.json({ error: "groupId wajib diisi" }, { status: 400 });
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { teacherId: true },
    });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke kelas ini" }, { status: 403 });
    }

    // Allowed source types
    const allowedSources: SumberType[] = sourceTypes?.length > 0
      ? sourceTypes
      : ["PENUGASAN", "QUIZ", "GAME", "JALUR_CERDAS", "UKBI_TKA"];

    const memberIds = (await db.groupMember.findMany({
      where: { groupId, role: "member" },
      select: { userId: true },
    })).map(m => m.userId);

    const dateFilter = dateFrom || dateTo
      ? {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
        }
      : undefined;

    const results: Record<string, { created: number; updated: number; skipped: number; protected: number; details: any[] }> = {};

    // ── 1. PENUGASAN ──
    if (allowedSources.includes("PENUGASAN")) {
      results.PENUGASAN = { created: 0, updated: 0, skipped: 0, protected: 0, details: [] };
      const submissions = await db.penugasanSubmission.findMany({
        where: {
          penugasan: { groupId },
          score: { not: null },
          status: "COMPLETED",
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
        include: { penugasan: { select: { judul: true } } },
      });

      for (const sub of submissions) {
        const r = await upsertNilaiOtomatis({
          userId: sub.userId,
          groupId,
          kategoriNama: "Tugas Harian",
          skor: sub.score!,
          sumberType: "PENUGASAN",
          sumberId: sub.id,
          keterangan: `Dari tugas: ${sub.penugasan.judul}`,
          allowUpdateAuto: overwriteAuto,
        });
        if (r.status === "created") results.PENUGASAN.created++;
        else if (r.status === "updated") results.PENUGASAN.updated++;
        else if (r.status === "skipped_manual_protected") results.PENUGASAN.protected++;
        else results.PENUGASAN.skipped++;
        if (!dryRun) results.PENUGASAN.details.push({ userId: sub.userId, status: r.status });
      }
    }

    // ── 2. QUIZ ──
    if (allowedSources.includes("QUIZ")) {
      results.QUIZ = { created: 0, updated: 0, skipped: 0, protected: 0, details: [] };

      // From QuizAssignment + QuizSubmission
      const quizSubmissions = await db.quizSubmission.findMany({
        where: {
          assignment: { groupId },
          score: { not: null },
          status: { in: ["GRADED", "SUBMITTED"] },
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
        include: { assignment: { include: { quiz: { select: { title: true } } } } },
      });

      for (const qs of quizSubmissions) {
        const r = await upsertNilaiOtomatis({
          userId: qs.userId,
          groupId,
          kategoriNama: "Kuis",
          skor: Math.round(qs.score!),
          sumberType: "QUIZ",
          sumberId: qs.id,
          keterangan: `Dari kuis: ${qs.assignment.quiz.title}`,
          allowUpdateAuto: overwriteAuto,
        });
        if (r.status === "created") results.QUIZ.created++;
        else if (r.status === "updated") results.QUIZ.updated++;
        else if (r.status === "skipped_manual_protected") results.QUIZ.protected++;
        else results.QUIZ.skipped++;
        if (!dryRun) results.QUIZ.details.push({ userId: qs.userId, status: r.status });
      }

      // From GroupQuizResult (legacy)
      const quizResults = await db.groupQuizResult.findMany({
        where: { groupQuiz: { groupId }, score: { not: null }, status: "COMPLETED" },
        include: { groupQuiz: { select: { title: true } } },
      });

      for (const qr of quizResults) {
        const r = await upsertNilaiOtomatis({
          userId: qr.userId,
          groupId,
          kategoriNama: "Kuis",
          skor: Math.round(qr.score!),
          sumberType: "QUIZ",
          sumberId: qr.id,
          keterangan: `Dari kuis: ${qr.groupQuiz.title}`,
          allowUpdateAuto: overwriteAuto,
        });
        if (r.status === "created") results.QUIZ.created++;
        else if (r.status === "updated") results.QUIZ.updated++;
        else if (r.status === "skipped_manual_protected") results.QUIZ.protected++;
        else results.QUIZ.skipped++;
        if (!dryRun) results.QUIZ.details.push({ userId: qr.userId, status: r.status });
      }
    }

    // ── 3. GAME ──
    if (allowedSources.includes("GAME")) {
      results.GAME = { created: 0, updated: 0, skipped: 0, protected: 0, details: [] };

      const gameRooms = await db.gameRoom.findMany({
        where: { groupId, includeInPenilaian: true },
        select: { id: true, name: true },
      });
      const roomIds = gameRooms.map(r => r.id);
      const roomMap = new Map(gameRooms.map(r => [r.id, r.name]));

      if (roomIds.length > 0) {
        const gameResults = await db.gameResult.findMany({
          where: {
            roomId: { in: roomIds },
            userId: { in: memberIds },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          include: { room: { select: { name: true } } },
        });

        for (const gr of gameResults) {
          const skor = Math.round((gr.finalScore / (gr.correct + gr.wrong || 1)) * 100);
          const r = await upsertNilaiOtomatis({
            userId: gr.userId,
            groupId,
            kategoriNama: "Game Edukasi",
            skor: Math.min(100, skor),
            sumberType: "GAME",
            sumberId: gr.id,
            keterangan: `Dari game: ${gr.room.name}`,
            allowUpdateAuto: overwriteAuto,
          });
          if (r.status === "created") results.GAME.created++;
          else if (r.status === "updated") results.GAME.updated++;
          else if (r.status === "skipped_manual_protected") results.GAME.protected++;
          else results.GAME.skipped++;
          if (!dryRun) results.GAME.details.push({ userId: gr.userId, status: r.status });
        }
      }
    }

    // ── 4. JALUR_CERDAS ──
    if (allowedSources.includes("JALUR_CERDAS")) {
      results.JALUR_CERDAS = { created: 0, updated: 0, skipped: 0, protected: 0, details: [] };

      // Only auto-populate from PenugasanSubmission that reference learning units
      const penugasans = await db.penugasan.findMany({
        where: { groupId },
        select: { id: true, judul: true },
      });
      const penugasanIds = penugasans.map(p => p.id);
      const penugasanJudul = new Map(penugasans.map(p => [p.id, p.judul]));

      if (penugasanIds.length > 0) {
        const submissions = await db.penugasanSubmission.findMany({
          where: {
            penugasanId: { in: penugasanIds },
            userId: { in: memberIds },
            score: { not: null },
            status: "COMPLETED",
          },
        });

        for (const sub of submissions) {
          const r = await upsertNilaiOtomatis({
            userId: sub.userId,
            groupId,
            kategoriNama: "Latihan Jalur Cerdas",
            skor: sub.score!,
            sumberType: "JALUR_CERDAS",
            sumberId: sub.id,
            keterangan: `Dari Jalur Cerdas: ${penugasanJudul.get(sub.penugasanId) || "Unit"}`,
            allowUpdateAuto: overwriteAuto,
          });
          if (r.status === "created") results.JALUR_CERDAS.created++;
          else if (r.status === "updated") results.JALUR_CERDAS.updated++;
          else if (r.status === "skipped_manual_protected") results.JALUR_CERDAS.protected++;
          else results.JALUR_CERDAS.skipped++;
          if (!dryRun) results.JALUR_CERDAS.details.push({ userId: sub.userId, status: r.status });
        }
      }
    }

    // ── 5. UKBI_TKA ──
    if (allowedSources.includes("UKBI_TKA")) {
      results.UKBI_TKA = { created: 0, updated: 0, skipped: 0, protected: 0, details: [] };

      // Only import if teacher explicitly selects — here we use PaketKompetensi
      // that might be linked to groups. For now, find completed ProgresKompetensi
      // of group members (only if they have associated paket).
      const progres = await db.progresKompetensi.findMany({
        where: {
          userId: { in: memberIds },
          status: "COMPLETED",
          ...(dateFilter ? { finishedAt: dateFilter } : {}),
        },
        include: {
          paket: { select: { title: true, type: true } },
        },
      });

      for (const p of progres) {
        const totalScore = p.totalScore || 0;
        const maxScore = p.maxScore || 100;
        const skor = p.percentage !== null && p.percentage !== undefined
          ? Math.round(p.percentage)
          : totalScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 50;
        const r = await upsertNilaiOtomatis({
          userId: p.userId,
          groupId,
          kategoriNama: "Simulasi UKBI/TKA",
          skor: Math.min(100, Math.max(0, skor)),
          sumberType: "UKBI_TKA",
          sumberId: p.id,
          keterangan: `Dari simulasi: ${p.paket.title} (${p.paket.type})`,
          allowUpdateAuto: overwriteAuto,
        });
        if (r.status === "created") results.UKBI_TKA.created++;
        else if (r.status === "updated") results.UKBI_TKA.updated++;
        else if (r.status === "skipped_manual_protected") results.UKBI_TKA.protected++;
        else results.UKBI_TKA.skipped++;
        if (!dryRun) results.UKBI_TKA.details.push({ userId: p.userId, status: r.status });
      }
    }

    const totals = { created: 0, updated: 0, skipped: 0, protected: 0 };
    for (const key of Object.keys(results)) {
      totals.created += results[key].created;
      totals.updated += results[key].updated;
      totals.skipped += results[key].skipped;
      totals.protected += results[key].protected;
    }

    return NextResponse.json({
      success: true,
      totals,
      perSource: Object.fromEntries(
        Object.entries(results).map(([key, val]) => [key, {
          created: val.created,
          updated: val.updated,
          skipped: val.skipped,
          protected: val.protected,
        }])
      ),
      dryRun,
      message: dryRun
        ? `Dry-run: ${totals.created} baru, ${totals.updated} diperbarui, ${totals.protected} manual dilindungi, ${totals.skipped} dilewati`
        : `${totals.created} nilai baru, ${totals.updated} diperbarui, ${totals.protected} manual dilindungi`,
    });
  } catch (error) {
    console.error("POST /api/guru/nilai/auto-populate error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat mengambil nilai otomatis" }, { status: 500 });
  }
}
