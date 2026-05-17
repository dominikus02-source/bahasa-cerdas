import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  try {
    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const latestResult = await db.progresKompetensi.findFirst({
      where: { userId: dbUser.id, paketId },
      orderBy: { attemptNumber: "desc" },
      include: {
        certificate: true,
        paket: { select: { title: true, type: true } },
      },
    });

    if (!latestResult) {
      return NextResponse.json({ result: null, error: "Belum ada hasil tes" });
    }

    return NextResponse.json({
      result: {
        id: latestResult.id,
        paketId: latestResult.paketId,
        paketTitle: latestResult.paket?.title,
        paket: latestResult.paket,
        attemptNumber: latestResult.attemptNumber,
        totalScore: latestResult.totalScore,
        rawScore: latestResult.rawScore,
        maxScore: latestResult.maxScore,
        percentage: latestResult.percentage,
        predikat: latestResult.predikat,
        status: latestResult.status,
        sectionScores: latestResult.sectionScores,
        startedAt: latestResult.startedAt?.toISOString(),
        finishedAt: latestResult.finishedAt?.toISOString(),
        timeSpent: latestResult.timeSpent,
        certificate: latestResult.certificate
          ? {
              id: latestResult.certificate.id,
              certificateNo: latestResult.certificate.certificateNo,
              pdfUrl: latestResult.certificate.pdfUrl,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("GET /api/kompetensi/[paketId]/hasil error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
