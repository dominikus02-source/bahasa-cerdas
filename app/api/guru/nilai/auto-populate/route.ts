import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

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
    const { groupId } = body;
    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { teacherId: true },
    });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const kategoris = await db.nilaiKategori.findMany({ where: { groupId } });
    const latihanKat = kategoris.find(k => k.nama.toLowerCase().includes("latihan"));
    const praktikKat = kategoris.find(k => k.nama.toLowerCase().includes("praktik"));
    const ulanganKat = kategoris.find(k =>
      k.nama.toLowerCase().includes("ulangan") || k.nama.toLowerCase().includes("kuis") || k.nama.toLowerCase().includes("harian")
    );

    const memberIds = (await db.groupMember.findMany({
      where: { groupId, role: "member" },
      select: { userId: true },
    })).map(m => m.userId);

    let created = 0;
    let updated = 0;

    // 1. Auto-populate from PenugasanSubmission (-> Latihan)
    if (latihanKat) {
      const submissions = await db.penugasanSubmission.findMany({
        where: {
          penugasan: { groupId },
          score: { not: null },
          status: "COMPLETED",
        },
        include: { penugasan: { select: { judul: true } } },
      });

      for (const sub of submissions) {
        const existing = await db.nilai.findFirst({
          where: { userId: sub.userId, kategoriId: latihanKat.id, sumberType: "PENUGASAN", sumberId: sub.id },
        });

        if (existing) {
          await db.nilai.update({ where: { id: existing.id }, data: { skor: sub.score!, keterangan: `Dari tugas: ${sub.penugasan.judul}` } });
          updated++;
        } else {
          await db.nilai.create({ data: { userId: sub.userId, groupId, kategoriId: latihanKat.id, skor: sub.score!, sumberType: "PENUGASAN", sumberId: sub.id, keterangan: `Dari tugas: ${sub.penugasan.judul}` } });
          created++;
        }
      }
    }

    // 2. Auto-populate from GroupQuizResult (-> Ulangan Harian)
    if (ulanganKat) {
      const quizResults = await db.groupQuizResult.findMany({
        where: { groupQuiz: { groupId }, score: { not: null }, status: "COMPLETED" },
        include: { groupQuiz: { select: { title: true } } },
      });

      for (const qr of quizResults) {
        const existing = await db.nilai.findFirst({
          where: { userId: qr.userId, kategoriId: ulanganKat.id, sumberType: "QUIZ", sumberId: qr.id },
        });

        if (existing) {
          await db.nilai.update({ where: { id: existing.id }, data: { skor: qr.score!, keterangan: `Dari kuis: ${qr.groupQuiz.title}` } });
          updated++;
        } else {
          await db.nilai.create({ data: { userId: qr.userId, groupId, kategoriId: ulanganKat.id, skor: qr.score!, sumberType: "QUIZ", sumberId: qr.id, keterangan: `Dari kuis: ${qr.groupQuiz.title}` } });
          created++;
        }
      }

      // QuizSubmission -> assignment.quiz
      const quizSubmissions = await db.quizSubmission.findMany({
        where: { assignment: { groupId }, score: { not: null }, status: "GRADED" },
        include: { assignment: { include: { quiz: { select: { title: true } } } } },
      });

      for (const qs of quizSubmissions) {
        const existing = await db.nilai.findFirst({
          where: { userId: qs.userId, kategoriId: ulanganKat.id, sumberType: "QUIZ", sumberId: qs.id },
        });

        if (existing) {
          await db.nilai.update({ where: { id: existing.id }, data: { skor: Math.round(qs.score!), keterangan: `Dari kuis: ${qs.assignment.quiz.title}` } });
          updated++;
        } else {
          await db.nilai.create({ data: { userId: qs.userId, groupId, kategoriId: ulanganKat.id, skor: Math.round(qs.score!), sumberType: "QUIZ", sumberId: qs.id, keterangan: `Dari kuis: ${qs.assignment.quiz.title}` } });
          created++;
        }
      }
    }

    // 3. Auto-populate from UserUnitProgress (-> Praktik) — just find progress for group members
    if (praktikKat && memberIds.length > 0) {
      const progress = await db.userUnitProgress.findMany({
        where: { userId: { in: memberIds }, score: { gt: 0 }, completed: true },
        include: { unit: { select: { title: true } } },
      });

      for (const prog of progress) {
        const existing = await db.nilai.findFirst({
          where: { userId: prog.userId, kategoriId: praktikKat.id, sumberType: "PENUGASAN", sumberId: prog.id },
        });

        if (existing) {
          await db.nilai.update({ where: { id: existing.id }, data: { skor: prog.score, keterangan: `Dari praktik: ${prog.unit.title}` } });
          updated++;
        } else {
          await db.nilai.create({ data: { userId: prog.userId, groupId, kategoriId: praktikKat.id, skor: prog.score, sumberType: "PENUGASAN", sumberId: prog.id, keterangan: `Dari praktik: ${prog.unit.title}` } });
          created++;
        }
      }
    }

    return NextResponse.json({ created, updated, total: created + updated });
  } catch (error) {
    console.error("POST /api/guru/nilai/auto-populate error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
