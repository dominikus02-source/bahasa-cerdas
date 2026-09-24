import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function GET() {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    // Get all Master Bank questions grouped by topik and kelas
    const soals = await db.soal.findMany({
      where: { source: "MASTER_BANK" },
      select: { topik: true, kelas: true, id: true, difficulty: true },
    });

    // Group by topik
    const themes: Record<string, { name: string; total: number; kelas: string[]; difficulties: Record<string, number> }> = {};
    for (const s of soals) {
      if (!s.topik) continue;
      if (!themes[s.topik]) {
        themes[s.topik] = { name: s.topik, total: 0, kelas: [], difficulties: {} };
      }
      themes[s.topik].total++;
      // "SEMUA" = sentinel bank reusable (migrasi Founder): soal tidak terkunci
      // ke grade — guru memilih kelas saat mengirim. Tampilkan apa adanya.
      if (!themes[s.topik].kelas.includes(s.kelas)) themes[s.topik].kelas.push(s.kelas);
      themes[s.topik].difficulties[s.difficulty] = (themes[s.topik].difficulties[s.difficulty] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      themes: Object.values(themes).sort((a, b) => b.total - a.total),
      total: soals.length,
    });
  } catch (error) {
    console.error("GET /api/guru/bank-soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
