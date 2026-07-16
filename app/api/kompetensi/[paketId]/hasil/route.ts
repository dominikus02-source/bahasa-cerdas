import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  try {
    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return err(ERR.UNAUTHORIZED.error, ERR.UNAUTHORIZED.code, ERR.UNAUTHORIZED.status);
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);
    }

    const latestResult = await db.progresKompetensi.findFirst({
      where: { userId: dbUser.id, paketId },
      orderBy: { attemptNumber: "desc" },
    });

    if (!latestResult) {
      return err("Hasil tidak ditemukan", "NOT_FOUND", 404);
    }

    const paket = await db.paketKompetensi.findUnique({
      where: { id: paketId },
      select: { title: true, type: true },
    });

    const certificate = await db.kompetensiCertificate.findFirst({
      where: { progresId: latestResult.id },
    });

    return ok({
      result: {
        id: latestResult.id,
        paketId: latestResult.paketId,
        paketTitle: paket?.title,
        paket: paket,
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
        certificate: certificate
          ? {
              id: certificate.id,
              certificateNo: certificate.certificateNo,
              pdfUrl: certificate.pdfUrl,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("GET /api/kompetensi/[paketId]/hasil error:", error);
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}
