import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/teacher/commissions/students
 * "Murid Premium Saya" — murid yang legitimate teratribusi ke guru ini
 * (P8A §7/§21). Privacy-safe: TIDAK mengekspos metode pembayaran, ID
 * transaksi, atau detail finansial murid. Angka kontribusi = agregat
 * komisi dari ledger (server-side) — tidak pernah dihitung klien.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = user.id;
    const now = new Date();

    const [attributions, commissions] = await Promise.all([
      db.teacherAttribution.findMany({
        where: { teacherId, status: "ACTIVE" },
        orderBy: { eligibleFrom: "desc" },
        select: {
          studentId: true,
          eligibleFrom: true,
          source: true,
          student: {
            select: {
              id: true,
              fullName: true,
              isPremium: true,
              premiumUntil: true,
            },
          },
        },
      }),
      // Agregasi komisi murid (entry positif saja) — basis "kontribusi".
      db.teacherCommission.findMany({
        where: { teacherId, entryType: "COMMISSION" },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          studentId: true,
          commissionAmount: true,
          createdAt: true,
        },
      }),
    ]);

    const byStudent = new Map<
      string,
      { total: number; count: number; latestAmount: number; latestAt: Date | null }
    >();
    for (const c of commissions) {
      const entry = byStudent.get(c.studentId) ?? { total: 0, count: 0, latestAmount: 0, latestAt: null };
      entry.total += c.commissionAmount;
      entry.count += 1;
      if (!entry.latestAt || c.createdAt > entry.latestAt) {
        entry.latestAt = c.createdAt;
        entry.latestAmount = c.commissionAmount;
      }
      byStudent.set(c.studentId, entry);
    }

    const students = attributions.map((a) => {
      const agg = byStudent.get(a.studentId);
      const premiumActive = !!a.student.isPremium && !!a.student.premiumUntil && a.student.premiumUntil > now;
      return {
        id: a.student.id,
        name: a.student.fullName,
        premiumActive,
        eligibleFrom: a.eligibleFrom,
        source: a.source,
        totalContribution: agg?.total ?? 0,
        contributionCount: agg?.count ?? 0,
        periodContribution: agg?.latestAmount ?? 0,
        lastContributionAt: agg?.latestAt ?? null,
      };
    });

    return NextResponse.json({ students, total: students.length });
  } catch (error) {
    console.error("GET /api/teacher/commissions/students error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar murid" }, { status: 500 });
  }
}
