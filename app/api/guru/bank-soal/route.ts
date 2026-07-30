import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role?.toUpperCase() !== "GURU" && dbUser.role?.toUpperCase() !== "ADMIN" && !dbUser.isFounder)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    // Debug: count all soals
    const totalAllSoals = await db.soal.count();
    const totalMasterBank = await db.soal.count({ where: { source: "MASTER_BANK" } });
    const sampleSoal = await db.soal.findFirst({ where: { source: "MASTER_BANK" }, select: { id: true, kodeSoal: true, topik: true, source: true } });

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
      if (!themes[s.topik].kelas.includes(s.kelas)) themes[s.topik].kelas.push(s.kelas);
      themes[s.topik].difficulties[s.difficulty] = (themes[s.topik].difficulties[s.difficulty] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      themes: Object.values(themes).sort((a, b) => b.total - a.total),
      total: soals.length,
      debug: { totalAllSoals, totalMasterBank, sampleSoal },
    });
  } catch (error) {
    console.error("GET /api/guru/bank-soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
