import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser?.isFounder) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const tema = searchParams.get("tema");
    const kelas = searchParams.get("kelas");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: any = { source: "MASTER_BANK" };
    if (tema) where.topik = tema;
    if (kelas) where.kelas = kelas;
    if (search) {
      where.OR = [
        { text: { contains: search, mode: "insensitive" } },
        { judul: { contains: search, mode: "insensitive" } },
        { kodeSoal: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, soals, themes] = await Promise.all([
      db.soal.count({ where }),
      db.soal.findMany({
        where,
        orderBy: { kodeSoal: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.soal.findMany({
        where: { source: "MASTER_BANK" },
        select: { topik: true },
        distinct: ["topik"],
      }),
    ]);

    const soalWithUsage = soals.map(s => {
      const totalPick = s.usedCount;
      const accuracy = totalPick > 0
        ? Math.round((s.correctCount / totalPick) * 100)
        : null;

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

    // Read data files for theme info
    let themesMeta: { id: string; count: number }[] = [];
    try {
      const dataDir = path.resolve(process.cwd(), "data", "question-bank", "master");
      if (fs.existsSync(dataDir)) {
        themesMeta = fs.readdirSync(dataDir)
          .filter(f => f.endsWith(".json") && f !== "types.json" && f !== "index.json")
          .map(f => {
            const filePath = path.join(dataDir, f);
            const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            return { id: f.replace(".json", ""), count: Array.isArray(content) ? content.length : 0 };
          });
      }
    } catch {}

    const totalInDataFiles = themesMeta.reduce((s, t) => s + t.count, 0);
    const temaList = themes.filter(t => t.topik).map(t => t.topik!);

    return NextResponse.json({
      soals: soalWithUsage,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      temas: temaList,
      themesMeta,
      totalInDataFiles,
      totalInDb: total,
    });
  } catch (error) {
    console.error("GET /api/admin/bank-soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
