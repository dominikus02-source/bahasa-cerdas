import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/bank-soal — admin view of the CANONICAL active Founder bank.
 *
 * Source of truth = Soal rows with source "MASTER_BANK" (the Founder library,
 * kodeSoal BC-GB2-*, kelas "SEMUA"). This is the SAME query surface as the
 * Guru bank (/api/guru/bank-soal) so both views always describe one library.
 * Retired rows (MASTER_BANK_RETIRED) are surfaced only as an audit count —
 * never as active content.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role?.toUpperCase() !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tema = searchParams.get("tema");
    const kelas = searchParams.get("kelas");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = { source: "MASTER_BANK" };
    if (tema) where.topik = tema;
    if (kelas) where.kelas = kelas;
    if (search) {
      where.OR = [
        { text: { contains: search, mode: "insensitive" } },
        { judul: { contains: search, mode: "insensitive" } },
        { kodeSoal: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, soals, themeGroups, kelasGroups, retiredCount, founderCount, usageAgg] = await Promise.all([
      db.soal.count({ where }),
      db.soal.findMany({
        where,
        orderBy: { kodeSoal: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.soal.groupBy({ by: ["topik"], where: { source: "MASTER_BANK" }, _count: { _all: true }, orderBy: { topik: "asc" } }),
      db.soal.groupBy({ by: ["kelas"], where: { source: "MASTER_BANK" }, _count: { _all: true } }),
      db.soal.count({ where: { source: "MASTER_BANK_RETIRED" } }),
      db.soal.count({ where: { source: "MASTER_BANK", kodeSoal: { startsWith: "BC-GB2-" } } }),
      db.soal.aggregate({
        where: { source: "MASTER_BANK" },
        _sum: { usedCount: true, correctCount: true },
      }),
    ]);

    const soalWithUsage = soals.map((s) => {
      const totalPick = s.usedCount;
      const accuracy = totalPick > 0 ? Math.round((s.correctCount / totalPick) * 100) : null;
      return {
        id: s.id,
        kodeSoal: s.kodeSoal,
        judul: s.judul,
        text: s.text,
        type: s.type,
        difficulty: s.difficulty,
        topik: s.topik,
        kelas: s.kelas,
        semester: s.semester,
        levelBerpikir: s.levelBerpikir,
        usedCount: s.usedCount,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        accuracy,
      };
    });

    // Theme distribution from the DB (canonical), not from legacy data files.
    const themesMeta = themeGroups.map((t) => ({ id: t.topik ?? "Umum", count: t._count._all }));
    const globalAccuracy =
      usageAgg._sum.usedCount && usageAgg._sum.usedCount > 0
        ? Math.round(((usageAgg._sum.correctCount ?? 0) / usageAgg._sum.usedCount) * 100)
        : null;

    return NextResponse.json({
      soals: soalWithUsage,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      temas: themesMeta.map((t) => t.id),
      themesMeta,
      // Stats (DB-truth):
      activeTotal: total,
      founderCount,
      retiredCount,
      kelasValues: kelasGroups.map((k) => k.kelas ?? "Umum"),
      globalAccuracy,
      totalInDb: total,
    });
  } catch (error) {
    console.error("GET /api/admin/bank-soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
