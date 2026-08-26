import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/teacher/commissions/earnings?month=YYYY-MM
 *
 * Tanpa `month`: deret penghasilan 6 bulan terakhir (WIB) untuk chart.
 * Dengan `month`: detail per murid bulan itu.
 *
 * Semua agregasi SERVER-SIDE (raw SQL group by bulan WIB) — tidak ada
 * kalkulasi 10% di klien, tidak ada N+1 per ledger row.
 */

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

interface MonthBucket {
  month: string;
  total: number;
  count: number;
}

interface StudentMonthRow {
  name: string;
  total: number;
  count: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = user.id;
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");

    if (monthParam) {
      // ── Detail satu bulan (YYYY-MM) ──
      if (!/^\d{4}-\d{2}$/.test(monthParam)) {
        return NextResponse.json({ error: "Format bulan: YYYY-MM" }, { status: 400 });
      }
      const start = new Date(`${monthParam}-01T00:00:00+07:00`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);

      const rows = await db.$queryRawUnsafe<StudentMonthRow[]>(
        `SELECT COALESCE(u."fullName", 'Murid') AS name,
                SUM(c."commissionAmount")::int AS total,
                COUNT(*)::int AS count
         FROM "TeacherCommission" c
         JOIN "User" u ON u.id = c."studentId"
         WHERE c."teacherId" = $1
           AND c."entryType" = 'COMMISSION'
           AND c."createdAt" >= $2 AND c."createdAt" < $3
         GROUP BY u."fullName"
         ORDER BY total DESC`,
        teacherId,
        start,
        end
      );

      const total = rows.reduce((acc, r) => acc + r.total, 0);
      return NextResponse.json({
        month: monthParam,
        total,
        studentCount: rows.length,
        students: rows.map((r) => ({ name: r.name, total: r.total, count: r.count })),
      });
    }

    // ── Series 6 bulan terakhir (zero-filled, WIB) ──
    const now = new Date();
    const since = new Date(now.getTime() - SIX_MONTHS_MS);

    const rows = await db.$queryRawUnsafe<MonthBucket[]>(
      `SELECT to_char(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
              SUM(c."commissionAmount")::int AS total,
              COUNT(*)::int AS count
       FROM "TeacherCommission" c
       WHERE c."teacherId" = $1
         AND c."entryType" = 'COMMISSION'
         AND c."createdAt" >= $2
       GROUP BY 1 ORDER BY 1`,
      teacherId,
      since
    );

    const byMonth = new Map(rows.map((r) => [r.month, r]));

    // Zero-fill 6 bulan WIB terakhir.
    const series: Array<{ month: string; total: number; count: number }> = [];
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const bucket = byMonth.get(key);
      series.push({ month: key, total: bucket?.total ?? 0, count: bucket?.count ?? 0 });
    }

    return NextResponse.json({ series });
  } catch (error) {
    console.error("GET /api/teacher/commissions/earnings error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat penghasilan" }, { status: 500 });
  }
}
