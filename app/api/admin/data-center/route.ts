import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

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
      latestBackupManifest,
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
      db.backupManifest.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          backupId: true,
          storagePath: true,
          localPath: true,
          environment: true,
          status: true,
          trigger: true,
          totalRows: true,
          totalTables: true,
          totalBytes: true,
          startedAt: true,
          completedAt: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
    ]);

    const now = new Date();
    const lastBackupAge = latestBackupManifest
      ? Math.floor((now.getTime() - new Date(latestBackupManifest.completedAt).getTime()) / (1000 * 60 * 60))
      : null;

    const backupManifest = latestBackupManifest
      ? {
          id: latestBackupManifest.id,
          backupId: latestBackupManifest.backupId,
          storagePath: latestBackupManifest.storagePath,
          status: latestBackupManifest.status,
          trigger: latestBackupManifest.trigger,
          totalRows: latestBackupManifest.totalRows,
          totalTables: latestBackupManifest.totalTables,
          totalBytes: latestBackupManifest.totalBytes,
          completedAt: latestBackupManifest.completedAt.toISOString(),
          startedAt: latestBackupManifest.startedAt.toISOString(),
          errorMessage: latestBackupManifest.errorMessage,
          hoursAgo: lastBackupAge,
        }
      : null;

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
      backupManifest,
    });
  } catch (e: any) {
    console.error("Data center error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
