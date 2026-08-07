import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent, getTeacherStudentIds } from "@/lib/teacher/students";

// Offset WIB (UTC+7) — minggu dimulai Senin 00:00 WIB.
const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Label minggu: "3 Agu", "27 Jul", dst. */
function weekLabel(from: Date, to: Date): string {
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const d = new Date((from.getTime() + to.getTime()) / 2 + WIB_MS);
  return `${d.getUTCDate()} ${bulan[d.getUTCMonth()]}`;
}

/** Awal minggu (Senin 00:00 WIB) yang memuat sebuah tanggal. */
function mondayWIB(d: Date): Date {
  const wib = d.getTime() + WIB_MS;
  const day = (new Date(wib).getUTCDay() + 6) % 7; // 0 = Senin
  const mondayWibMs = wib - day * DAY_MS;
  const start = new Date(mondayWibMs);
  start.setUTCHours(0, 0, 0, 0);
  return new Date(start.getTime() - WIB_MS);
}

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const weeks = Math.min(12, Math.max(4, Number(searchParams.get("weeks") || 8)));

    const muridIds = await getTeacherStudentIds(user.id);
    if (muridIds.length === 0) {
      return NextResponse.json({ success: true, weeks: [], muridIds: [] });
    }

    // Rentang minggu (WIB) — dari N minggu lalu sampai akhir minggu berjalan.
    const now = new Date();
    const thisMonday = mondayWIB(now);
    const ranges: { from: Date; to: Date }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const from = new Date(thisMonday.getTime() - i * 7 * DAY_MS);
      ranges.push({ from, to: new Date(from.getTime() + 7 * DAY_MS) });
    }

    // Hitung per minggu: karya baru, like baru, komentar baru, murid yang berkarya.
    const rows = await Promise.all(
      ranges.map(async ({ from, to }) => {
        const [karya, likes, komentar, muridBerkarya] = await Promise.all([
          db.studentKarya.count({ where: { userId: { in: muridIds }, createdAt: { gte: from, lt: to } } }),
          db.studentKaryaLike.count({ where: { createdAt: { gte: from, lt: to }, karya: { userId: { in: muridIds } } } }),
          db.studentKaryaComment.count({ where: { createdAt: { gte: from, lt: to }, karya: { userId: { in: muridIds } } } }),
          db.studentKarya.groupBy({
            by: ["userId"],
            where: { userId: { in: muridIds }, createdAt: { gte: from, lt: to } },
            _count: true,
          }),
        ]);
        return {
          minggu: weekLabel(from, to),
          karya,
          like: likes,
          komentar,
          muridBerkarya: muridBerkarya.length,
        };
      })
    );

    const totals = rows.reduce(
      (acc, r) => ({ karya: acc.karya + r.karya, like: acc.like + r.like, komentar: acc.komentar + r.komentar }),
      { karya: 0, like: 0, komentar: 0 }
    );

    return NextResponse.json({ success: true, weeks: rows, totals, totalMurid: muridIds.length });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
