import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/teacher/commissions/distribution
 * Metrik distribusi per kelas (P8B §11/§12). Angka finansial dari ledger
 * P7C (server-side), angka partisipasi dari enrollment kelas — TIDAK ada
 * angka baru yang dikarang.
 *
 * Primary metric: murid berhasil terhubung (memberCount).
 * Secondary: murid Premium. Ditambah penghasilan tercatat (faktual).
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = user.id;
    const now = new Date();

    const groups = await db.group.findMany({
      where: { teacherId, isActive: true },
      take: 50,
      select: {
        id: true,
        name: true,
        grade: true,
        accessCode: true,
        _count: { select: { members: true } },
        members: {
          select: {
            userId: true,
            user: {
              select: {
                isPremium: true,
                premiumUntil: true,
                lastActiveAt: true,
              },
            },
          },
        },
      },
    });

    const studentIds = new Set(groups.flatMap((g) => g.members.map((m) => m.userId)));

    // Penghasilan tercatat per murid (entry positif) — satu query, bukan N+1.
    const commissions = studentIds.size > 0
      ? await db.teacherCommission.findMany({
          where: { teacherId, entryType: "COMMISSION", studentId: { in: [...studentIds] } },
          select: { studentId: true, commissionAmount: true },
          take: 1000,
        })
      : [];

    const earningsByStudent = new Map<string, number>();
    for (const c of commissions) {
      earningsByStudent.set(c.studentId, (earningsByStudent.get(c.studentId) ?? 0) + c.commissionAmount);
    }

    const distribution = groups.map((g) => {
      const memberIds = g.members.map((m) => m.userId);
      const premiumStudents = g.members.filter(
        (m) => m.user.isPremium && m.user.premiumUntil && m.user.premiumUntil > now
      ).length;
      const activeStudents = g.members.filter(
        (m) => m.user.lastActiveAt && m.user.lastActiveAt.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000
      ).length;
      const earningsRecorded = memberIds.reduce(
        (acc, id) => acc + (earningsByStudent.get(id) ?? 0),
        0
      );

      return {
        id: g.id,
        name: g.name,
        grade: g.grade,
        accessCode: g.accessCode,
        memberCount: g._count.members,
        activeStudents,
        premiumStudents,
        earningsRecorded,
      };
    });

    const totals = distribution.reduce(
      (acc, d) => ({
        memberCount: acc.memberCount + d.memberCount,
        activeStudents: acc.activeStudents + d.activeStudents,
        premiumStudents: acc.premiumStudents + d.premiumStudents,
        earningsRecorded: acc.earningsRecorded + d.earningsRecorded,
      }),
      { memberCount: 0, activeStudents: 0, premiumStudents: 0, earningsRecorded: 0 }
    );

    return NextResponse.json({ classes: distribution, totals });
  } catch (error) {
    console.error("GET /api/teacher/commissions/distribution error:", error);
    return NextResponse.json({ error: "Gagal memuat metrik distribusi" }, { status: 500 });
  }
}
