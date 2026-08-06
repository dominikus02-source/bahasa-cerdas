import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

// ════════════════════════════════════════════════════════════════════
// GET /api/guru/dashboard/social — Motivasi Guru (Aktivitas Hari Ini)
// Additive, read-only. Semua hitungan atas murid-murid di kelas guru ini.
// - karyaHariIni / muridAktifHariIni : murid yang berkarya hari ini
// - belumBerkarya                    : murid yang belum pernah berkarya
// - karyaLike100 / karyaTrending     : capaian yang dibanggakan
// - likeHariIni / komentarHariIni / tugasSelesaiHariIni
// ════════════════════════════════════════════════════════════════════

const WIB_MS = 7 * 60 * 60 * 1000;

function startOfTodayWIB(): Date {
  const d = new Date(Date.now() + WIB_MS);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - WIB_MS);
}

function weekStartWIB(): Date {
  const now = new Date(Date.now() + WIB_MS);
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - WIB_MS);
}

const isTeacher = (user: { role: string; isFounder?: boolean }) =>
  user.role === "GURU" || user.role === "ADMIN" || !!user.isFounder;

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = startOfTodayWIB();
    const week = weekStartWIB();

    const groups = await db.group.findMany({
      where: { teacherId: user.id },
      select: { id: true, members: { select: { userId: true }, where: { role: "member" } } },
    });
    const groupIds = groups.map((g) => g.id);
    const memberIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.userId)))];

    if (memberIds.length === 0) {
      return NextResponse.json({
        totalMurid: 0, karyaHariIni: 0, muridAktifHariIni: 0, belumBerkarya: 0,
        karyaLike100: 0, karyaTrending: 0, likeHariIni: 0, komentarHariIni: 0, tugasSelesaiHariIni: 0,
      });
    }

    const [karyaHariIni, muridAktifHariIni, pernahKarya, karyaLike100, karyaTrending, likeHariIni, komentarHariIni, tugasSelesai] = await Promise.all([
      db.studentKarya.count({ where: { userId: { in: memberIds }, createdAt: { gte: today } } }),
      db.studentKarya.groupBy({ by: ["userId"], where: { userId: { in: memberIds }, createdAt: { gte: today } } }),
      db.studentKarya.aggregate({ _count: { _all: true }, where: { userId: { in: memberIds } } }),
      db.studentKarya.count({ where: { userId: { in: memberIds }, likesCount: { gt: 100 } } }),
      db.studentKarya.count({ where: { userId: { in: memberIds }, createdAt: { gte: week }, likesCount: { gte: 25 } } }),
      db.studentKaryaLike.count({ where: { createdAt: { gte: today }, karya: { userId: { in: memberIds } } } }),
      db.studentKaryaComment.count({ where: { createdAt: { gte: today }, karya: { userId: { in: memberIds } } } }),
      db.penugasanSubmission.count({
        where: { completedAt: { gte: today }, penugasan: { groupId: { in: groupIds } } },
      }),
    ]);

    return NextResponse.json({
      totalMurid: memberIds.length,
      karyaHariIni,
      muridAktifHariIni: muridAktifHariIni.length,
      belumBerkarya: memberIds.length - (pernahKarya._count._all || 0),
      karyaLike100,
      karyaTrending,
      likeHariIni,
      komentarHariIni,
      tugasSelesaiHariIni: tugasSelesai,
    });
  } catch (error) {
    console.error("GET /api/guru/dashboard/social error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}