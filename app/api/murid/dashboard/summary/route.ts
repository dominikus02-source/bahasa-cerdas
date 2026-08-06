import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getLeaderboard } from "@/lib/gamification/leaderboard";

/**
 * GET /api/murid/dashboard/summary — ringkasan beranda murid:
 * tugas tertunda, pengumuman terbaru, materi terbaru, posisi leaderboard.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "MURID" && !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
      take: 50,
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return NextResponse.json({ success: true, tugas: [], pengumuman: [], materi: [], leaderboard: null });
    }

    const now = new Date();

    // ── Tugas: quiz assignment & penugasan yang belum diselesaikan murid ini ──
    const [quizAssignments, penugasans] = await Promise.all([
      db.quizAssignment.findMany({
        where: { groupId: { in: groupIds }, isPublished: true },
        include: { quiz: { select: { id: true, title: true, topik: true } } },
        orderBy: { assignedAt: "desc" },
        take: 50,
      }),
      db.penugasan.findMany({
        where: { groupId: { in: groupIds } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const quizIds = quizAssignments.map((a) => a.id);
    const penugasanIds = penugasans.map((p) => p.id);
    const [quizSubmissions, penugasanSubmissions] = await Promise.all([
      db.quizSubmission.findMany({
        where: { userId: user.id, assignmentId: { in: quizIds }, status: { in: ["SUBMITTED", "GRADED", "LATE"] } },
        select: { assignmentId: true },
      }),
      db.penugasanSubmission.findMany({
        where: { userId: user.id, penugasanId: { in: penugasanIds } },
        select: { penugasanId: true },
      }),
    ]);

    const doneQuiz = new Set(quizSubmissions.map((s) => s.assignmentId));
    const donePenugasan = new Set(penugasanSubmissions.map((s) => s.penugasanId));
    const tugas = [
      ...quizAssignments
        .filter((a) => !doneQuiz.has(a.id))
        .map((a) => ({ id: a.id, jenis: "KUIS" as const, judul: a.quiz.title, tenggat: a.dueDate, link: `/murid/tugasku/${a.id}/take` })),
      ...penugasans
        .filter((p) => !donePenugasan.has(p.id))
        .map((p) => ({ id: p.id, jenis: "MATERI" as const, judul: p.judul, tenggat: p.tenggat, link: `/arena/jalur-cerdas/${p.unitId}/belajar` })),
    ].sort((a, b) => (b.tenggat?.getTime() || 0) - (a.tenggat?.getTime() || 0));

    // ── Pengumuman terbaru ──
    const pengumuman = await db.pengumuman.findMany({
      where: { groupId: { in: groupIds } },
      include: { teacher: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // ── Materi terbaru yang dikirim guru ──
    const materi = await db.materiKirim.findMany({
      where: { groupId: { in: groupIds } },
      include: { materi: { select: { id: true, title: true, description: true } }, teacher: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // ── Leaderboard mingguan: posisi global + peringkat kelas pertama ──
    let leaderboard: { posisiGlobal: number; totalPemain: number; posisiKelas: number | null } | null = null;
    try {
      const [global, kelas] = await Promise.all([
        getLeaderboard({ scope: "GLOBAL", period: "WEEKLY", userId: user.id, limit: 100 }),
        getLeaderboard({ scope: "CLASS", period: "WEEKLY", userId: user.id, groupId: groupIds[0], limit: 100 }),
      ]);
      const myGlobal = global.findIndex((e) => e.userId === user.id);
      const myKelas = kelas.findIndex((e) => e.userId === user.id);
      leaderboard = {
        posisiGlobal: myGlobal >= 0 ? myGlobal + 1 : global.length + 1,
        totalPemain: global.length,
        posisiKelas: myKelas >= 0 ? myKelas + 1 : null,
      };
    } catch {}

    return NextResponse.json({
      success: true,
      tugas: tugas.slice(0, 5),
      totalTugas: tugas.length,
      pengumuman: pengumuman.map((p) => ({
        id: p.id, judul: p.judul, guru: p.teacher.fullName, createdAt: p.createdAt, link: "/murid/pengumuman",
      })),
      materi: materi.map((m) => ({
        id: m.materi.id, judul: m.materi.title, deskripsi: m.materi.description, guru: m.teacher.fullName,
        link: `/arena/materi/${m.materi.id}`,
      })),
      leaderboard,
    });
  } catch (error) {
    console.error("GET /api/murid/dashboard/summary error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
