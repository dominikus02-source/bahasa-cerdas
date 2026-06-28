import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import * as fs from "fs";
import * as path from "path";

async function getLatestBackup(): Promise<{
  found: boolean;
  exportedAt?: string;
  environment?: string;
  tables?: number;
  totalRows?: number;
  path?: string;
  note?: string;
}> {
  const roots = [
    path.join(process.cwd(), "backups", "current"),
    path.join(process.cwd(), "backups", "daily"),
  ];

  for (const root of roots) {
    try {
      if (!fs.existsSync(root)) continue;
      const dirs = fs
        .readdirSync(root)
        .filter((d) => fs.statSync(path.join(root, d)).isDirectory())
        .sort()
        .reverse();
      if (dirs.length === 0) continue;
      const latestDir = path.join(root, dirs[0]);
      const manifestPath = path.join(latestDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;
      const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const totalRows = (raw.tables || []).reduce((s: number, t: any) => s + (t.rowCount || 0), 0);
      return {
        found: true,
        exportedAt: raw.exportedAt,
        environment: raw.environment,
        tables: (raw.tables || []).length,
        totalRows,
        path: dirs[0],
      };
    } catch {
      continue;
    }
  }

  const isVercel = !!process.env.VERCEL;
  return {
    found: false,
    note: isVercel
      ? "Local backup manifests are not available in Vercel runtime. Use Supabase Storage backup integration for production backups."
      : "No backup manifests found in backups/current/ or backups/daily/.",
  };
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || (!user.isFounder && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      userCount,
      profileCount,
      artikelCount,
      videoCount,
      karyaCount,
      uksiQuestionCount,
      tkaQuestionCount,
      paketKompetensiCount,
      learningLevelCount,
      learningUnitCount,
      testSessionCount,
      testAnswerCount,
      aiUsageCount,
      aiSavedResultCount,
      transaksiCount,
    ] = await Promise.all([
      db.user.count(),
      db.profile.count(),
      db.artikel.count(),
      db.video.count(),
      db.karya.count(),
      db.uKBIQuestion.count(),
      db.tKAQuestion.count(),
      db.paketKompetensi.count(),
      db.learningLevel.count(),
      db.learningUnit.count(),
      db.testSession.count(),
      db.testAnswer.count(),
      db.aIUsage.count(),
      db.aiSavedResult.count(),
      db.transaksi.count(),
    ]);

    const backup = await getLatestBackup();

    return NextResponse.json({
      counts: {
        User: userCount,
        Profile: profileCount,
        Artikel: artikelCount,
        Video: videoCount,
        Karya: karyaCount,
        UKBIQuestion: uksiQuestionCount,
        TKAQuestion: tkaQuestionCount,
        PaketKompetensi: paketKompetensiCount,
        LearningLevel: learningLevelCount,
        LearningUnit: learningUnitCount,
        TestSession: testSessionCount,
        TestAnswer: testAnswerCount,
        AIUsage: aiUsageCount,
        AiSavedResult: aiSavedResultCount,
        Transaksi: transaksiCount,
      },
      backup,
    });
  } catch (e: any) {
    console.error("Data center error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
